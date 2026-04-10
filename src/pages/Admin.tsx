import { useState, useEffect, useCallback } from 'react';
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

function FilesTab({ files, users, onDeleted }: {
  files: AdminFile[];
  users: AdminUser[];
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [openUsers, setOpenUsers] = useState<Record<number, boolean>>({});
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({});

  const toggleUser = useCallback((id: number) => setOpenUsers(p => ({ ...p, [id]: !p[id] })), []);
  const toggleDate = useCallback((key: string) => setOpenDates(p => ({ ...p, [key]: !p[key] })), []);

  const allFiles = [...files].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

  if (allFiles.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">Файлов нет</p>;
  }

  // Группируем: userId → dateStr → files
  const byUser = allFiles.reduce<Record<number, { user_id: number; name: string; byDate: Record<string, AdminFile[]> }>>((acc, f) => {
    const owner = users.find(u => u.id === f.user_id);
    const name = owner?.name || `Клиент #${f.user_id}`;
    if (!acc[f.user_id]) acc[f.user_id] = { user_id: f.user_id, name, byDate: {} };
    const date = new Date(f.uploaded_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!acc[f.user_id].byDate[date]) acc[f.user_id].byDate[date] = [];
    acc[f.user_id].byDate[date].push(f);
    return acc;
  }, {});

  async function handleDelete(fileId: number) {
    if (!confirm('Удалить файл?')) return;
    try {
      await adminApi.deleteFile(fileId);
      toast({ title: 'Файл удалён' });
      onDeleted();
    } catch (e: unknown) {
      toast({ title: 'Ошибка', description: e instanceof Error ? e.message : 'Ошибка', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-2">
      {Object.values(byUser).map(({ user_id, name, byDate }) => {
        const totalFiles = Object.values(byDate).flat().length;
        const isUserOpen = !!openUsers[user_id];
        return (
          <div key={user_id} className="border border-border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              onClick={() => toggleUser(user_id)}
            >
              <Icon name={isUserOpen ? 'ChevronDown' : 'ChevronRight'} size={16} className="text-muted-foreground flex-shrink-0" />
              <Icon name="User" size={16} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground text-sm">{name}</span>
              <Badge variant="secondary" className="text-xs ml-auto">{totalFiles} файлов</Badge>
            </button>

            {isUserOpen && (
              <div className="divide-y divide-border">
                {Object.entries(byDate).map(([date, dateFiles]) => {
                  const dateKey = `${user_id}_${date}`;
                  const isDateOpen = !!openDates[dateKey];
                  return (
                    <div key={date}>
                      <button
                        className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-muted/30 transition-colors text-left"
                        onClick={() => toggleDate(dateKey)}
                      >
                        <Icon name={isDateOpen ? 'ChevronDown' : 'ChevronRight'} size={14} className="text-muted-foreground flex-shrink-0" />
                        <Icon name="CalendarDays" size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground">{date}</span>
                        <Badge variant="outline" className="text-xs ml-auto">{dateFiles.length}</Badge>
                      </button>

                      {isDateOpen && (
                        <div className="px-6 pb-3 pt-1 space-y-2 bg-background/50">
                          {dateFiles.map(f => (
                            <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border gap-3">
                              <div className="min-w-0 flex-1 flex items-center gap-3">
                                <Icon name={f.file_type === 'admin_upload' ? 'FileCheck' : 'File'} size={18}
                                  className={f.file_type === 'admin_upload' ? 'text-green-500 flex-shrink-0' : 'text-muted-foreground flex-shrink-0'} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                                  {f.car_info && <p className="text-xs text-primary font-medium truncate">🚗 {f.car_info}</p>}
                                  {f.comment && <p className="text-xs text-muted-foreground truncate">💬 {f.comment}</p>}
                                  <p className="text-xs text-muted-foreground">
                                    {f.file_type === 'admin_upload' ? 'Отправлен клиенту' : 'От клиента'} · {formatSize(f.file_size)} · {formatDate(f.uploaded_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer">
                                  <Button size="sm" variant="outline" className="h-7 text-xs">
                                    <Icon name="Download" size={13} className="mr-1" />Скачать
                                  </Button>
                                </a>
                                <Button size="sm" variant="ghost"
                                  className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                  onClick={() => handleDelete(f.id)}>
                                  <Icon name="Trash2" size={13} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ArchiveTab({ orders, files, onDelete, onUploaded }: {
  orders: AdminOrder[];
  files: AdminFile[];
  onDelete: (id: number) => void;
  onUploaded: () => void;
}) {
  const [openUsers, setOpenUsers] = useState<Record<number, boolean>>({});
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({});

  const toggleUser = useCallback((id: number) => setOpenUsers(p => ({ ...p, [id]: !p[id] })), []);
  const toggleDate = useCallback((key: string) => setOpenDates(p => ({ ...p, [key]: !p[key] })), []);

  const archived = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  if (archived.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">Архив пуст</p>;
  }

  // Группируем: userId → dateStr → orders
  const byUser = archived.reduce<Record<number, { user: AdminOrder['user']; byDate: Record<string, AdminOrder[]> }>>((acc, o) => {
    if (!acc[o.user.id]) acc[o.user.id] = { user: o.user, byDate: {} };
    const date = new Date(o.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!acc[o.user.id].byDate[date]) acc[o.user.id].byDate[date] = [];
    acc[o.user.id].byDate[date].push(o);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {Object.values(byUser).map(({ user, byDate }) => {
        const totalOrders = Object.values(byDate).flat().length;
        const isUserOpen = !!openUsers[user.id];
        return (
          <div key={user.id} className="border border-border rounded-lg overflow-hidden">
            {/* Клиент — заголовок */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              onClick={() => toggleUser(user.id)}
            >
              <Icon name={isUserOpen ? 'ChevronDown' : 'ChevronRight'} size={16} className="text-muted-foreground flex-shrink-0" />
              <Icon name="User" size={16} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground text-sm">{user.name}</span>
              {user.phone && <span className="text-xs text-muted-foreground">· {user.phone}</span>}
              {user.email && <span className="text-xs text-muted-foreground">· {user.email}</span>}
              <Badge variant="secondary" className="text-xs ml-auto">{totalOrders} заказов</Badge>
            </button>

            {/* Даты */}
            {isUserOpen && (
              <div className="divide-y divide-border">
                {Object.entries(byDate).map(([date, dateOrders]) => {
                  const dateKey = `${user.id}_${date}`;
                  const isDateOpen = !!openDates[dateKey];
                  return (
                    <div key={date}>
                      <button
                        className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-muted/30 transition-colors text-left"
                        onClick={() => toggleDate(dateKey)}
                      >
                        <Icon name={isDateOpen ? 'ChevronDown' : 'ChevronRight'} size={14} className="text-muted-foreground flex-shrink-0" />
                        <Icon name="CalendarDays" size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground">{date}</span>
                        <Badge variant="outline" className="text-xs ml-auto">{dateOrders.length}</Badge>
                      </button>

                      {/* Заказы */}
                      {isDateOpen && (
                        <div className="px-6 pb-4 pt-2 space-y-3 bg-background/50">
                          {dateOrders.map(o => (
                            <AdminOrderCard
                              key={o.id}
                              order={o}
                              files={files.filter(f => f.user_id === o.user.id && f.file_type === 'client_upload')}
                              adminFiles={files.filter(f => f.user_id === o.user.id && f.file_type === 'admin_upload')}
                              onDelete={() => onDelete(o.id)}
                              onUploaded={onUploaded}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
              <TabsTrigger value="archive">Архив</TabsTrigger>
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
            {(() => {
              const activeOrders = orders.filter(o =>
                o.status !== 'completed' && o.status !== 'cancelled' &&
                !(o.status === 'pending' && o.payment_status === 'pending' && o.amount === 0)
              );
              const renderCard = (o: typeof orders[0]) => (
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
              );
              return (
                <div className="space-y-3">
                  {activeOrders.length === 0
                    ? <p className="text-muted-foreground text-sm text-center py-8">Активных заказов нет</p>
                    : activeOrders.map(renderCard)
                  }
                </div>
              );
            })()}
          </TabsContent>

          {/* ARCHIVE */}
          <TabsContent value="archive">
            <ArchiveTab orders={orders} files={files} onDelete={async (id) => {
              if (!confirm(`Удалить заказ #${id}?`)) return;
              try { await adminApi.deleteOrder(id); toast({ title: 'Заказ удалён' }); loadAll(); }
              catch (e: unknown) { toast({ title: 'Ошибка', description: e instanceof Error ? e.message : 'Ошибка', variant: 'destructive' }); }
            }} onUploaded={loadAll} />
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
            <FilesTab files={files} users={users} onDeleted={loadAll} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}