import json
import os
import hashlib
import secrets
import hmac
import time
import uuid
import base64
import urllib.request
import psycopg2
import boto3

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p94698650_quantum_initiatives_')
YOOKASSA_URL = 'https://api.yookassa.ru/v3/payments'


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_token() -> str:
    return secrets.token_hex(32)


def get_user_by_token(token: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"SELECT id, name, email, phone FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    row = cur.fetchone()
    conn.close()
    return row


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        'Access-Control-Max-Age': '86400',
    }


def yk_request(method: str, path: str, data: dict = None, idempotence_key: str = None):
    shop_id = os.environ.get('YOOKASSA_SHOP_ID', '')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY', '')
    credentials = base64.b64encode(f"{shop_id}:{secret_key}".encode()).decode()
    url = YOOKASSA_URL if not path else f"{YOOKASSA_URL}/{path}"
    req_headers = {'Authorization': f'Basic {credentials}', 'Content-Type': 'application/json'}
    if idempotence_key:
        req_headers['Idempotence-Key'] = idempotence_key
    req_data = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def ok(data: dict) -> dict:
    h = cors_headers()
    h['Content-Type'] = 'application/json'
    return {'statusCode': 200, 'headers': h, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(status: int, msg: str) -> dict:
    h = cors_headers()
    h['Content-Type'] = 'application/json'
    return {'statusCode': status, 'headers': h, 'body': json.dumps({'error': msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Личный кабинет клиентов ECUPro: авторизация, заказы, файлы прошивок, оплата"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    action = body.get('action', '')
    token = (event.get('headers') or {}).get('X-Auth-Token', '')
    user = get_user_by_token(token) if token else None

    if action == 'register':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        name = body.get('name', '').strip()
        phone = body.get('phone', '').strip()
        if not email or not password:
            return err(400, 'Email и пароль обязательны')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return err(409, 'Email уже зарегистрирован')
        tok = make_token()
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (email, password_hash, name, phone, session_token) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (email, hash_password(password), name, phone, tok)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({'token': tok, 'user_id': user_id, 'name': name, 'email': email})

    if action == 'login':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, phone, password_hash FROM {SCHEMA}.users WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row or row[3] != hash_password(password):
            conn.close()
            return err(401, 'Неверный email или пароль')
        tok = make_token()
        cur.execute(f"UPDATE {SCHEMA}.users SET session_token = %s WHERE id = %s", (tok, row[0]))
        conn.commit()
        conn.close()
        return ok({'token': tok, 'user_id': row[0], 'name': row[1], 'email': email})

    if action == 'telegram_login':
        tg_id = body.get('id')
        tg_name = (body.get('first_name', '') + ' ' + body.get('last_name', '')).strip()
        tg_username = body.get('username', '')
        tg_hash = body.get('hash', '')
        tg_data = {k: v for k, v in body.items() if k not in ('hash', 'action')}
        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        data_check_string = '\n'.join(f'{k}={v}' for k, v in sorted(tg_data.items()))
        computed = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if computed != tg_hash:
            return err(401, 'Неверная подпись Telegram')
        auth_date = int(tg_data.get('auth_date', 0))
        if time.time() - auth_date > 86400:
            return err(401, 'Данные устарели')
        name = tg_name or tg_username
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE telegram_id = %s", (tg_id,))
        row = cur.fetchone()
        tok = make_token()
        if row:
            cur.execute(f"UPDATE {SCHEMA}.users SET session_token = %s, name = %s WHERE id = %s", (tok, name, row[0]))
            user_id = row[0]
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (telegram_id, name, session_token) VALUES (%s, %s, %s) RETURNING id",
                (tg_id, name, tok)
            )
            user_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return ok({'token': tok, 'user_id': user_id, 'name': name})

    if action == 'me':
        if not user:
            return err(401, 'Не авторизован')
        return ok({'user_id': user[0], 'name': user[1], 'email': user[2], 'phone': user[3]})

    if action == 'get_orders':
        if not user:
            return err(401, 'Не авторизован')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, title, amount, status, payment_status, created_at FROM {SCHEMA}.orders WHERE user_id = %s ORDER BY created_at DESC",
            (user[0],)
        )
        rows = cur.fetchall()
        conn.close()
        orders = [{'id': r[0], 'title': r[1], 'amount': float(r[2]), 'status': r[3], 'payment_status': r[4], 'created_at': str(r[5])} for r in rows]
        return ok({'orders': orders})

    if action == 'create_payment':
        if not user:
            return err(401, 'Не авторизован')
        amount = float(body.get('amount', 0))
        title = body.get('title', 'Услуга прошивки ЭБУ')
        return_url = body.get('return_url', 'https://ecuproo.ru/cabinet')
        if amount <= 0:
            return err(400, 'Сумма должна быть больше 0')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.orders (user_id, title, amount, status) VALUES (%s, %s, %s, 'pending') RETURNING id",
            (user[0], title, amount)
        )
        order_id = cur.fetchone()[0]
        conn.commit()
        idem_key = str(uuid.uuid4())
        yk_resp = yk_request('POST', '', {
            'amount': {'value': f'{amount:.2f}', 'currency': 'RUB'},
            'confirmation': {'type': 'redirect', 'return_url': return_url},
            'capture': True,
            'description': f'{title} (заказ #{order_id})',
            'metadata': {'order_id': str(order_id), 'user_id': str(user[0])}
        }, idem_key)
        payment_id = yk_resp.get('id')
        confirm_url = yk_resp.get('confirmation', {}).get('confirmation_url', '')
        cur.execute(f"UPDATE {SCHEMA}.orders SET payment_id = %s WHERE id = %s", (payment_id, order_id))
        conn.commit()
        conn.close()
        return ok({'order_id': order_id, 'payment_id': payment_id, 'confirmation_url': confirm_url})

    if action == 'payment_webhook':
        payment_obj = body.get('object', {})
        payment_id = payment_obj.get('id')
        metadata = payment_obj.get('metadata', {})
        order_id = metadata.get('order_id')
        payment_status = payment_obj.get('status', '')
        if order_id and payment_id:
            conn = get_db()
            cur = conn.cursor()
            db_status = 'paid' if payment_status == 'succeeded' else payment_status
            cur.execute(
                f"UPDATE {SCHEMA}.orders SET payment_status = %s, status = %s WHERE id = %s AND payment_id = %s",
                (payment_status, db_status, order_id, payment_id)
            )
            conn.commit()

            if payment_status == 'succeeded':
                cur.execute(
                    f"SELECT o.title, o.amount, u.name, u.email, u.phone FROM {SCHEMA}.orders o JOIN {SCHEMA}.users u ON u.id = o.user_id WHERE o.id = %s",
                    (order_id,)
                )
                row = cur.fetchone()
                conn.close()
                if row:
                    try:
                        import urllib.parse
                        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
                        chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
                        text = (
                            f"💰 *Оплата получена!*\n\n"
                            f"👤 *Клиент:* {row[2]}\n"
                            f"📧 *Email:* {row[3] or '—'}\n"
                            f"📱 *Телефон:* {row[4] or '—'}\n"
                            f"📋 *Услуга:* {row[0]}\n"
                            f"💵 *Сумма:* {row[1]} ₽\n"
                            f"🆔 *Заказ:* #{order_id}"
                        )
                        data = urllib.parse.urlencode({
                            'chat_id': chat_id,
                            'text': text,
                            'parse_mode': 'Markdown'
                        }).encode('utf-8')
                        req = urllib.request.Request(
                            f"https://api.telegram.org/bot{bot_token}/sendMessage",
                            data=data, method='POST'
                        )
                        with urllib.request.urlopen(req) as r:
                            r.read()
                    except Exception:
                        pass
            else:
                conn.close()

        return ok({'ok': True})

    if action == 'upload_firmware':
        if not user:
            return err(401, 'Не авторизован')
        file_data = body.get('file_data', '')
        file_name = body.get('file_name', 'firmware.bin')
        order_id = body.get('order_id')
        car_info = body.get('car_info', '').strip()
        comment = body.get('comment', '').strip()
        if not file_data:
            return err(400, 'Файл не передан')
        file_bytes = base64.b64decode(file_data)
        s3_key = f"firmware/client/{user[0]}/{order_id or 'no_order'}/{uuid.uuid4().hex}_{file_name}"
        s3 = get_s3()
        s3.put_object(Bucket='files', Key=s3_key, Body=file_bytes, ContentType='application/octet-stream')
        file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{s3_key}"
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.firmware_files (order_id, user_id, file_type, file_name, file_url, s3_key, file_size, car_info, comment) VALUES (%s, %s, 'client_upload', %s, %s, %s, %s, %s, %s) RETURNING id",
            (order_id, user[0], file_name, file_url, s3_key, len(file_bytes), car_info or None, comment or None)
        )
        file_id = cur.fetchone()[0]
        conn.commit()
        conn.close()

        try:
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
            chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
            size_kb = round(len(file_bytes) / 1024, 1)
            text = (
                f"📂 *Новый файл прошивки от клиента*\n\n"
                f"👤 *Клиент:* {user[1]}\n"
                f"📧 *Email:* {user[2] or '—'}\n"
                f"📱 *Телефон:* {user[3] or '—'}\n"
                f"🚗 *Авто:* {car_info or '—'}\n"
                f"💬 *Комментарий:* {comment or '—'}\n"
                f"📎 *Файл:* [{file_name}]({file_url})\n"
                f"💾 *Размер:* {size_kb} КБ\n"
                f"🆔 *ID клиента:* {user[0]}"
            )
            import urllib.parse
            data = urllib.parse.urlencode({
                'chat_id': chat_id,
                'text': text,
                'parse_mode': 'Markdown'
            }).encode('utf-8')
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                data=data, method='POST'
            )
            with urllib.request.urlopen(req) as r:
                r.read()
        except Exception:
            pass

        return ok({'file_id': file_id, 'file_url': file_url, 'file_name': file_name})

    if action == 'get_firmware':
        if not user:
            return err(401, 'Не авторизован')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, file_name, file_url, file_type, file_size, uploaded_at, order_id, car_info, comment FROM {SCHEMA}.firmware_files WHERE user_id = %s ORDER BY uploaded_at DESC",
            (user[0],)
        )
        rows = cur.fetchall()
        conn.close()
        files = [{'id': r[0], 'file_name': r[1], 'file_url': r[2], 'file_type': r[3], 'file_size': r[4], 'uploaded_at': str(r[5]), 'order_id': r[6], 'car_info': r[7], 'comment': r[8]} for r in rows]
        return ok({'files': files})

    if action == 'admin_upload_firmware':
        admin_key = body.get('admin_key', '')
        if admin_key != os.environ.get('ADMIN_SECRET_KEY', ''):
            return err(403, 'Доступ запрещён')
        file_data = body.get('file_data', '')
        file_name = body.get('file_name', 'firmware_ready.bin')
        target_user_id = body.get('user_id')
        order_id = body.get('order_id')
        if not file_data or not target_user_id:
            return err(400, 'file_data и user_id обязательны')
        file_bytes = base64.b64decode(file_data)
        s3_key = f"firmware/admin/{target_user_id}/{order_id or 'no_order'}/{uuid.uuid4().hex}_{file_name}"
        s3 = get_s3()
        s3.put_object(Bucket='files', Key=s3_key, Body=file_bytes, ContentType='application/octet-stream')
        file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{s3_key}"
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.firmware_files (order_id, user_id, file_type, file_name, file_url, s3_key, file_size) VALUES (%s, %s, 'admin_upload', %s, %s, %s, %s) RETURNING id",
            (order_id, target_user_id, file_name, file_url, s3_key, len(file_bytes))
        )
        file_id = cur.fetchone()[0]
        if order_id:
            cur.execute(f"UPDATE {SCHEMA}.orders SET status = 'completed' WHERE id = %s", (order_id,))
        conn.commit()

        # Уведомить клиента в Telegram что прошивка готова
        try:
            cur.execute(f"SELECT telegram_id FROM {SCHEMA}.users WHERE id = %s", (target_user_id,))
            tg_row = cur.fetchone()
            if tg_row and tg_row[0]:
                import urllib.parse
                bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
                text = (
                    f"✅ *Ваша прошивка готова!*\n\n"
                    f"📎 Файл: [{file_name}]({file_url})\n\n"
                    f"Войдите в личный кабинет чтобы скачать: https://ecuproo.ru/cabinet"
                )
                data = urllib.parse.urlencode({
                    'chat_id': tg_row[0],
                    'text': text,
                    'parse_mode': 'Markdown'
                }).encode('utf-8')
                req = urllib.request.Request(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    data=data, method='POST'
                )
                with urllib.request.urlopen(req) as r:
                    r.read()
        except Exception:
            pass

        conn.close()
        return ok({'file_id': file_id, 'file_url': file_url})

    # ── ADMIN ─────────────────────────────────────────────

    def check_admin(b: dict) -> bool:
        return b.get('admin_key', '') == os.environ.get('ADMIN_SECRET_KEY', '')

    if action == 'admin_get_users':
        if not check_admin(body):
            return err(403, 'Доступ запрещён')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"SELECT u.id, u.name, u.email, u.phone, u.telegram_id, u.created_at, "
            f"COUNT(o.id) AS orders_count "
            f"FROM {SCHEMA}.users u "
            f"LEFT JOIN {SCHEMA}.orders o ON o.user_id = u.id "
            f"GROUP BY u.id ORDER BY u.created_at DESC"
        )
        rows = cur.fetchall()
        conn.close()
        users = [{'id': r[0], 'name': r[1], 'email': r[2], 'phone': r[3],
                  'telegram_id': r[4], 'created_at': str(r[5]), 'orders_count': r[6]} for r in rows]
        return ok({'users': users})

    if action == 'admin_get_orders':
        if not check_admin(body):
            return err(403, 'Доступ запрещён')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"SELECT o.id, o.title, o.amount, o.status, o.payment_status, o.created_at, "
            f"u.id, u.name, u.email, u.phone "
            f"FROM {SCHEMA}.orders o JOIN {SCHEMA}.users u ON u.id = o.user_id "
            f"ORDER BY o.created_at DESC LIMIT 100"
        )
        rows = cur.fetchall()
        conn.close()
        orders = [{'id': r[0], 'title': r[1], 'amount': float(r[2]), 'status': r[3],
                   'payment_status': r[4], 'created_at': str(r[5]),
                   'user': {'id': r[6], 'name': r[7], 'email': r[8], 'phone': r[9]}} for r in rows]
        return ok({'orders': orders})

    if action == 'admin_create_order':
        if not check_admin(body):
            return err(403, 'Доступ запрещён')
        target_user_id = body.get('user_id')
        amount = float(body.get('amount', 0))
        title = body.get('title', 'Услуга прошивки ЭБУ')
        if not target_user_id or amount <= 0:
            return err(400, 'user_id и amount обязательны')
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.orders (user_id, title, amount, status) VALUES (%s, %s, %s, 'pending') RETURNING id",
            (target_user_id, title, amount)
        )
        order_id = cur.fetchone()[0]
        conn.commit()

        # Уведомить клиента в Telegram — пусть идёт в кабинет и оплачивает сам
        try:
            import urllib.parse
            cur.execute(f"SELECT telegram_id, name FROM {SCHEMA}.users WHERE id = %s", (target_user_id,))
            u_row = cur.fetchone()
            if u_row and u_row[0]:
                bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
                text = (
                    f"💳 *Для вас выставлен счёт*\n\n"
                    f"📋 *Услуга:* {title}\n"
                    f"💵 *Сумма:* {amount:.0f} ₽\n\n"
                    f"Войдите в личный кабинет чтобы оплатить:\nhttps://ecuproo.ru/cabinet"
                )
                data = urllib.parse.urlencode({
                    'chat_id': u_row[0],
                    'text': text,
                    'parse_mode': 'Markdown'
                }).encode('utf-8')
                req = urllib.request.Request(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    data=data, method='POST'
                )
                with urllib.request.urlopen(req) as r:
                    r.read()
        except Exception:
            pass

        conn.close()
        return ok({'order_id': order_id})

    if action == 'admin_get_firmware':
        if not check_admin(body):
            return err(403, 'Доступ запрещён')
        target_user_id = body.get('user_id')
        conn = get_db()
        cur = conn.cursor()
        if target_user_id:
            cur.execute(
                f"SELECT id, file_name, file_url, file_type, file_size, uploaded_at, order_id, user_id, car_info, comment FROM {SCHEMA}.firmware_files WHERE user_id = %s ORDER BY uploaded_at DESC",
                (target_user_id,)
            )
        else:
            cur.execute(
                f"SELECT id, file_name, file_url, file_type, file_size, uploaded_at, order_id, user_id, car_info, comment FROM {SCHEMA}.firmware_files ORDER BY uploaded_at DESC LIMIT 100"
            )
        rows = cur.fetchall()
        conn.close()
        files = [{'id': r[0], 'file_name': r[1], 'file_url': r[2], 'file_type': r[3],
                  'file_size': r[4], 'uploaded_at': str(r[5]), 'order_id': r[6], 'user_id': r[7], 'car_info': r[8], 'comment': r[9]} for r in rows]
        return ok({'files': files})

    return err(400, f'Неизвестное действие: {action}')