import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cabinetApi, getToken, getSavedUser, clearSession, type Order, type FirmwareFile } from '@/lib/cabinet-api';
import Icon from '@/components/ui/icon';

const statusLabel: Record<string, string> = {
  pending: 'Ожидает',
  paid: 'Оплачен',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  paid: 'default',
  completed: 'default',
  cancelled: 'destructive',
};

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Cabinet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = getToken();
  const savedUser = getSavedUser();

  const [orders, setOrders] = useState<Order[]>([]);
  const [files, setFiles] = useState<FirmwareFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [comment, setComment] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ordersRes, filesRes] = await Promise.all([
        cabinetApi.getOrders(token),
        cabinetApi.getFirmware(token),
      ]);
      setOrders(ordersRes.orders || []);
      setFiles(filesRes.files || []);
    } catch {
      toast({ title: 'Ошибка загрузки', description: 'Не удалось загрузить данные', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(orderId: number, amount: number, title: string) {
    setPayLoading(true);
    try {
      const res = await cabinetApi.createPayment(token, amount, title);
      if (res.confirmation_url) {
        window.location.href = res.confirmation_url;
      }
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка оплаты', variant: 'destructive' });
    } finally {
      setPayLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadDialog(true);
    e.target.value = '';
  }

  async function handleUploadConfirm() {
    if (!pendingFile) return;
    setUploadLoading(true);
    setUploadDialog(false);
    const carInfo = [carMake, carModel, carYear].filter(Boolean).join(' ');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
        reader.readAsDataURL(pendingFile);
      });
      await cabinetApi.uploadFirmware(token, base64, pendingFile.name, carInfo || undefined, comment || undefined);
      toast({ title: 'Файл загружен', description: `${pendingFile.name} успешно отправлен` });
      setPendingFile(null);
      setCarMake(''); setCarModel(''); setCarYear(''); setComment('');
      await loadData();
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка загрузки', variant: 'destructive' });
    } finally {
      setUploadLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  const clientFiles = files.filter(f => f.file_type === 'client_upload');
  const adminFiles = files.filter(f => f.file_type === 'admin_upload');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
              <Icon name="Zap" size={14} className="text-white" />
            </div>
            <span className="font-bold text-foreground">ECUPro</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{savedUser?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <Icon name="LogOut" size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Личный кабинет</h1>
          <p className="text-muted-foreground text-sm mt-1">Здравствуйте, {savedUser?.name}!</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Icon name="Loader2" size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Upload firmware section */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="Upload" size={18} className="text-primary" />
                  Отправить файл прошивки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Загрузите файл прошивки вашего ЭБУ для обработки. Мы свяжемся с вами после получения.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bin,.hex,.ori,.mod,.damo,.kess,.ktag,*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className="w-full sm:w-auto"
                >
                  {uploadLoading
                    ? <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Загрузка...</>
                    : <><Icon name="Upload" size={16} className="mr-2" />Выбрать файл</>
                  }
                </Button>
              </CardContent>
            </Card>

            {/* Car info dialog */}
            <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Информация об автомобиле</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Укажите данные авто — это поможет нам быстрее обработать вашу прошивку.</p>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Марка (например: BMW, Audi, Skoda)</Label>
                    <Input placeholder="BMW" value={carMake} onChange={e => setCarMake(e.target.value)} />
                  </div>
                  <div>
                    <Label>Модель</Label>
                    <Input placeholder="X5 3.0d" value={carModel} onChange={e => setCarModel(e.target.value)} />
                  </div>
                  <div>
                    <Label>Год выпуска</Label>
                    <Input placeholder="2019" value={carYear} onChange={e => setCarYear(e.target.value)} />
                  </div>
                  <div>
                    <Label>Комментарий / описание проблемы</Label>
                    <textarea
                      className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={3}
                      placeholder="Опишите что нужно сделать: чип-тюнинг, отключение DPF, EGR..."
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                  </div>
                  {pendingFile && (
                    <p className="text-xs text-muted-foreground">Файл: {pendingFile.name}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button className="flex-1" onClick={handleUploadConfirm}>
                    <Icon name="Upload" size={16} className="mr-2" />
                    Отправить
                  </Button>
                  <Button variant="outline" onClick={() => { setUploadDialog(false); setPendingFile(null); setComment(''); }}>
                    Отмена
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Ready firmwares from admin */}
            {adminFiles.length > 0 && (
              <Card className="bg-card border-border border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="Download" size={18} className="text-primary" />
                    Готовые прошивки для вас
                    <Badge className="ml-auto">{adminFiles.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {adminFiles.map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon name="FileCheck" size={18} className="text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(f.uploaded_at)} · {formatSize(f.file_size)}</p>
                          </div>
                        </div>
                        <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="default">
                            <Icon name="Download" size={14} className="mr-1" />
                            Скачать
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Orders */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="ShoppingCart" size={18} className="text-primary" />
                  Мои заказы
                  {orders.length > 0 && <Badge variant="secondary" className="ml-auto">{orders.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Заказов пока нет</p>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{order.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(order.created_at)} · #{order.id}</p>
                          <Badge variant={statusColor[order.status] || 'secondary'} className="mt-1 text-xs">
                            {statusLabel[order.status] || order.status}
                          </Badge>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3 flex-shrink-0">
                          <span className="font-bold text-foreground">{order.amount.toLocaleString('ru-RU')} ₽</span>
                          {order.payment_status !== 'succeeded' && order.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handlePay(order.id, order.amount, order.title)}
                              disabled={payLoading}
                            >
                              {payLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : 'Оплатить'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Uploaded files */}
            {clientFiles.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="Files" size={18} className="text-primary" />
                    Отправленные файлы
                    <Badge variant="secondary" className="ml-auto">{clientFiles.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clientFiles.map(f => (
                      <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                        <Icon name="File" size={18} className="text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground truncate">{f.file_name}</p>
                          {f.car_info && (
                            <p className="text-xs text-primary font-medium truncate">🚗 {f.car_info}</p>
                          )}
                          {f.comment && (
                            <p className="text-xs text-muted-foreground truncate">💬 {f.comment}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatDate(f.uploaded_at)} · {formatSize(f.file_size)}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">Отправлен</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}