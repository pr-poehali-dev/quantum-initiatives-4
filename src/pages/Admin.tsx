import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { adminApi, getAdminKey, saveAdminKey, clearAdminKey, type AdminUser, type AdminOrder, type AdminFile } from '@/lib/admin-api';
import Icon from '@/components/ui/icon';

const statusLabel: Record<string, string> = {
  pending: 'Ожидает', paid: 'Оплачен', completed: 'Выполнен', cancelled: 'Отменён',
};

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

// ─── Login screen ───────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    saveAdminKey(key);
    try {
      await adminApi.getUsers();
      onLogin();
    } catch {
      clearAdminKey();
      toast({ title: 'Неверный ключ', description: 'Проверьте ADMIN_SECRET_KEY', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="Shield" size={20} className="text-primary" />
            Админ-панель ECUPro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Секретный ключ</Label>
              <Input
                type="password"
                placeholder="Введите ADMIN_SECRET_KEY"
                value={key}
                onChange={e => setKey(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
              Войти
            </Button>
          </form>
          <p className="text-center mt-4">
            <a href="/" className="text-muted-foreground text-sm hover:text-foreground">← На сайт</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Create order dialog ─────────────────────────────────
function CreateOrderDialog({ users, onCreated }: { users: AdminUser[]; onCreated: () => void }) {
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

// ─── Upload firmware dialog ──────────────────────────────
function UploadFirmwareDialog({ users, onUploaded }: { users: AdminUser[]; onUploaded: () => void }) {
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

// ─── Main Admin Panel ────────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(!!getAdminKey());
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (authed) loadAll();
  }, [authed]);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, o, f] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getOrders(),
        adminApi.getFirmware(),
      ]);
      setUsers(u.users || []);
      setOrders(o.orders || []);
      setFiles(f.files || []);
    } catch (err: unknown) {
      toast({ title: 'Ошибка загрузки', description: err instanceof Error ? err.message : 'Ошибка', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  const clientFiles = files.filter(f => f.file_type === 'client_upload');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Shield" size={18} className="text-primary" />
            <span className="font-bold text-foreground">ECUPro Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadAll} disabled={loading}>
              <Icon name="RefreshCw" size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { clearAdminKey(); setAuthed(false); }}>
              <Icon name="LogOut" size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Клиентов', value: users.length, icon: 'Users' },
            { label: 'Заказов', value: orders.length, icon: 'ShoppingCart' },
            { label: 'Оплачено', value: orders.filter(o => o.payment_status === 'succeeded').length, icon: 'CheckCircle' },
            { label: 'Файлов получено', value: clientFiles.length, icon: 'Files' },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={s.icon as 'Users'} size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="orders">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="orders">Заказы</TabsTrigger>
              <TabsTrigger value="users">Клиенты</TabsTrigger>
              <TabsTrigger value="files">Файлы</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <CreateOrderDialog users={users} onCreated={loadAll} />
              <UploadFirmwareDialog users={users} onUploaded={loadAll} />
            </div>
          </div>

          {/* ORDERS */}
          <TabsContent value="orders">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Все заказы</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Заказов нет</p>
                ) : (
                  <div className="space-y-2">
                    {orders.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-border gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">#{o.id} {o.title}</span>
                            <Badge variant={o.payment_status === 'succeeded' ? 'default' : 'secondary'} className="text-xs">
                              {statusLabel[o.status] || o.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {o.user.name} {o.user.email ? `· ${o.user.email}` : ''} · {formatDate(o.created_at)}
                          </p>
                        </div>
                        <span className="font-bold text-foreground flex-shrink-0">{o.amount.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Все клиенты</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Клиентов нет</p>
                ) : (
                  <div className="space-y-2">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.email || ''}
                            {u.phone ? ` · ${u.phone}` : ''}
                            {u.telegram_id ? ' · TG ✓' : ''}
                            {' · Зарегистрирован '}
                            {formatDate(u.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-xs">{u.orders_count} заказов</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FILES */}
          <TabsContent value="files">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Файлы прошивок от клиентов</CardTitle>
              </CardHeader>
              <CardContent>
                {clientFiles.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Файлов нет</p>
                ) : (
                  <div className="space-y-2">
                    {clientFiles.map(f => {
                      const owner = users.find(u => u.id === f.user_id);
                      return (
                        <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border gap-3">
                          <div className="min-w-0 flex-1 flex items-center gap-3">
                            <Icon name="File" size={18} className="text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                              {f.car_info && (
                                <p className="text-xs text-primary font-medium truncate">🚗 {f.car_info}</p>
                              )}
                              {f.comment && (
                                <p className="text-xs text-muted-foreground truncate">💬 {f.comment}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {owner?.name || `ID ${f.user_id}`} · {formatSize(f.file_size)} · {formatDate(f.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">
                              <Icon name="Download" size={14} className="mr-1" />
                              Скачать
                            </Button>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}