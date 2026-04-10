import json
import os
import base64
import uuid
import urllib.request
import urllib.parse
import boto3


def handler(event: dict, context) -> dict:
    """Загрузка файла прошивки в S3 и отправка уведомления в Telegram."""

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    body = json.loads(event.get('body', '{}'))
    name = body.get('name', '').strip()
    phone = body.get('phone', '').strip()
    car = body.get('car', '').strip()
    comment = body.get('comment', '').strip()
    file_data = body.get('file', '')
    file_name = body.get('fileName', 'firmware.bin')

    if not name or not file_data:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Имя и файл обязательны'}, ensure_ascii=False)
        }

    file_bytes = base64.b64decode(file_data)
    ext = file_name.rsplit('.', 1)[-1] if '.' in file_name else 'bin'
    key = f"firmware/{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType='application/octet-stream')
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    text = (
        f"📂 *Загрузка прошивки для редактирования*\n\n"
        f"👤 *Имя:* {name}\n"
        f"📱 *Телефон:* {phone or '—'}\n"
        f"🚗 *Авто:* {car or '—'}\n"
        f"💬 *Комментарий:* {comment or '—'}\n\n"
        f"📎 *Файл:* [{file_name}]({cdn_url})"
    )

    bot_token = os.environ['TELEGRAM_BOT_TOKEN']
    chat_id = os.environ['TELEGRAM_CHAT_ID']

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    data = urllib.parse.urlencode({
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown'
    }).encode('utf-8')

    req = urllib.request.Request(url, data=data, method='POST')
    with urllib.request.urlopen(req) as resp:
        resp.read()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'ok': True, 'url': cdn_url})
    }
