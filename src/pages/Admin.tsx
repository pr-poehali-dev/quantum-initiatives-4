import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { adminApi, getAdminKey, clearAdminKey, type AdminUser, type AdminOrder, type AdminFile } from '@/lib/admin-api';
import Icon from '@/components/ui/icon';
import AdminLogin from '@/pages/admin/AdminLogin';
import { CreateOrderDialog, UploadFirmwareDialog } from '@/pages/admin/AdminDialogs';
import AdminOrderCard, { formatDate, formatSize } from '@/pages/admin/AdminOrderCard';

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
            <div className="space-y-3">
              {orders.filter(o => !(o.status === 'pending' && o.payment_status === 'pending' && o.amount === 0)).length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Заказов нет</p>
              ) : orders.filter(o => !(o.status === 'pending' && o.payment_status === 'pending' && o.amount === 0)).map(o => (
                <AdminOrderCard
                  key={o.id}
                  order={o}
                  files={files.filter(f => f.user_id === o.user.id && f.file_type === 'client_upload')}
                  adminFiles={files.filter(f => f.user_id === o.user.id && f.file_type === 'admin_upload')}
                  onDelete={async () => {
                    if (!confirm(`Удалить заказ #${o.id}?`)) return;
                    try { await adminApi.deleteOrder(o.id); toast({ title: 'Заказ удалён' }); loadAll(); }
                    catch (e: unknown) { toast({ title: 'Ошибка', description: e instanceof Error ? e.message : 'Ошибка', variant: 'destructive' }); }
                  }}
                  onUploaded={loadAll}
                />
              ))}
            </div>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
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
              <CardContent className="pt-4">
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