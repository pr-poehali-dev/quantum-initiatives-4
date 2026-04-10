import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { adminApi, type AdminOrder, type AdminFile } from '@/lib/admin-api';
import Icon from '@/components/ui/icon';

export function formatDate(str: string) {
  return new Date(str).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function AdminOrderCard({ order, files, adminFiles, onDelete, onUploaded }: {
  order: AdminOrder;
  files: AdminFile[];
  adminFiles: AdminFile[];
  onDelete: () => void;
  onUploaded: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState(order.title || 'Услуга прошивки ЭБУ');
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const isPaid = order.payment_status === 'succeeded';
  const isNew = order.status === 'new';
  const isCompleted = order.status === 'completed';

  async function handleSendInvoice() {
    const amount = parseFloat(invoiceAmount);
    if (!amount || amount <= 0) return;
    setSendingInvoice(true);
    try {
      await adminApi.setAmount(order.id, amount, invoiceTitle);
      toast({ title: 'Счёт выставлен', description: 'Клиент получил уведомление в Telegram' });
      setShowInvoice(false);
      onUploaded();
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка', variant: 'destructive' });
    } finally {
      setSendingInvoice(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve((ev.target?.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
      });
      await adminApi.uploadFirmware(order.user.id, base64, file.name, order.id);
      toast({ title: 'Прошивка отправлена клиенту', description: 'Клиент получил уведомление в Telegram' });
      onUploaded();
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <Card className={`border-2 ${isCompleted ? 'border-gray-400/50' : isPaid ? 'border-green-500/50' : isNew ? 'border-blue-500/50' : 'border-border'} bg-card`}>
      <CardContent className="pt-4 pb-4 space-y-3">

        {/* Шапка */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground">#{order.id}</span>
            <span className="text-sm text-foreground">{order.title}</span>
            {isCompleted
              ? <Badge className="bg-gray-500 text-white text-xs">✅ Выполнен</Badge>
              : isPaid
                ? <Badge className="bg-green-500 text-white text-xs">✅ Оплачено</Badge>
                : isNew
                  ? <Badge className="bg-blue-500 text-white text-xs">🆕 Новый заказ</Badge>
                  : <Badge variant="secondary" className="text-xs">⏳ Ожидает оплаты</Badge>
            }
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {order.amount > 0 && <span className="font-bold text-foreground">{order.amount.toLocaleString('ru-RU')} ₽</span>}
            <Button size="sm" variant="ghost"
              className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
              onClick={onDelete}>
              <Icon name="Trash2" size={14} />
            </Button>
          </div>
        </div>

        {/* Клиент */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
          <Icon name="User" size={14} className="text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground">{order.user.name}</span>
          {order.user.phone && <span className="text-xs text-muted-foreground">· {order.user.phone}</span>}
          {order.user.email && <span className="text-xs text-muted-foreground">· {order.user.email}</span>}
          <span className="text-xs text-muted-foreground ml-auto">{formatDate(order.created_at)}</span>
        </div>

        {/* Авто и комментарий из заказа (если нет файлов) */}
        {files.length === 0 && (order.car_info || order.comment) && (
          <div className="px-3 py-2 rounded-lg bg-muted/20 space-y-1">
            {order.car_info && <p className="text-xs text-foreground">🚗 {order.car_info}</p>}
            {order.comment && <p className="text-xs text-muted-foreground">💬 {order.comment}</p>}
          </div>
        )}

        {/* Файлы от клиента */}
        {files.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Файлы от клиента ({files.length})
            </p>
            {[...files].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).map((f, idx) => (
              <div key={f.id} className={`flex items-start gap-2 p-3 rounded-lg border bg-background ${idx === 0 ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border opacity-70'}`}>
                <Icon name="FileCode2" size={16} className={`flex-shrink-0 mt-0.5 ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                    <span className="text-xs text-muted-foreground">{formatSize(f.file_size)}</span>
                    {idx === 0 && <Badge className="text-xs h-4 px-1.5 bg-primary/20 text-primary border-0">последний</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    🕐 {formatDate(f.uploaded_at)}
                  </p>
                  {f.car_info && <p className="text-xs text-foreground mt-0.5">🚗 {f.car_info}</p>}
                  {f.comment && <p className="text-xs text-muted-foreground mt-0.5">💬 {f.comment}</p>}
                </div>
                <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer">
                  <Button size="sm" variant={idx === 0 ? 'default' : 'outline'} className="h-7 text-xs flex-shrink-0">
                    <Icon name="Download" size={12} className="mr-1" />Скачать
                  </Button>
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic px-1">Клиент ещё не загрузил файл прошивки</p>
        )}

        {/* Файлы отправленные клиенту */}
        {adminFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Отправлено клиенту ({adminFiles.length})
            </p>
            {[...adminFiles].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).map((f) => (
              <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-green-500/40 bg-green-500/5">
                <Icon name="FileCheck" size={16} className="text-green-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{f.file_name}
                    <span className="text-xs text-muted-foreground font-normal ml-1">{formatSize(f.file_size)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">🕐 {formatDate(f.uploaded_at)}</p>
                </div>
                <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0">
                    <Icon name="Download" size={12} className="mr-1" />Скачать
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Выставить счёт — только для новых заказов */}
        {isNew && (
          <div className="pt-1 border-t border-border space-y-2">
            {!showInvoice ? (
              <Button className="w-full" variant="default" onClick={() => setShowInvoice(true)}>
                <Icon name="Receipt" size={16} className="mr-2" />Выставить счёт клиенту
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Название услуги"
                  value={invoiceTitle}
                  onChange={e => setInvoiceTitle(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Сумма, ₽"
                    value={invoiceAmount}
                    onChange={e => setInvoiceAmount(e.target.value)}
                    className="flex-1"
                    min={1}
                    autoFocus
                  />
                  <Button onClick={handleSendInvoice} disabled={sendingInvoice || !invoiceAmount}>
                    {sendingInvoice
                      ? <Icon name="Loader2" size={16} className="animate-spin" />
                      : <><Icon name="Send" size={16} className="mr-1" />Отправить</>
                    }
                  </Button>
                  <Button variant="ghost" onClick={() => setShowInvoice(false)}>
                    <Icon name="X" size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Кнопка отправки готовой прошивки — только если оплачено и не выполнено */}
        {isPaid && !isCompleted && (
          <div className="pt-1 border-t border-border">
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
            <Button
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Загрузка...</>
                : <><Icon name="Upload" size={16} className="mr-2" />
                  {adminFiles.length > 0 ? 'Отправить новую версию прошивки' : 'Отправить готовую прошивку клиенту'}
                </>
              }
            </Button>
          </div>
        )}

        {/* Заказ закрыт */}
        {isCompleted && (
          <div className="pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground text-center py-1">🔒 Заказ закрыт — прошивка отправлена клиенту</p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}