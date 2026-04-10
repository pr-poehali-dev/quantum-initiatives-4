import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { adminApi, type AdminUser } from '@/lib/admin-api';
import Icon from '@/components/ui/icon';

export function CreateOrderDialog({ users, onCreated }: { users: AdminUser[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('Услуга прошивки ЭБУ');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.createOrder(Number(userId), Number(amount), title);
      toast({ title: 'Заказ создан', description: 'Клиент получил уведомление в Telegram — он зайдёт в кабинет и оплатит' });
      setOpen(false);
      onCreated();
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Icon name="Plus" size={16} className="mr-1" />Создать заказ</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый заказ клиенту</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Клиент</Label>
            <select
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
            >
              <option value="">Выберите клиента</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.email ? `(${u.email})` : u.phone ? `(${u.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Название услуги</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label>Сумма (₽)</Label>
            <Input type="number" min="1" placeholder="3500" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
            Создать и отправить ссылку
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UploadFirmwareDialog({ users, onUploaded }: { users: AdminUser[]; onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !userId) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        await adminApi.uploadFirmware(Number(userId), base64, file.name);
        toast({ title: 'Прошивка отправлена', description: 'Клиент получил уведомление в Telegram' });
        setOpen(false);
        onUploaded();
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка', variant: 'destructive' });
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Icon name="Upload" size={16} className="mr-1" />Отправить прошивку</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отправить готовую прошивку клиенту</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Клиент</Label>
            <select
              className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
            >
              <option value="">Выберите клиента</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.email ? `(${u.email})` : u.phone ? `(${u.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Файл прошивки</Label>
            <input ref={fileRef} type="file" className="w-full mt-1 text-sm" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
            Отправить клиенту
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
