import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cabinetApi, saveSession } from '@/lib/cabinet-api';
import Icon from '@/components/ui/icon';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ email: '', password: '', name: '', phone: '' });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await cabinetApi.login(loginForm.email, loginForm.password);
      saveSession(res.token, { user_id: res.user_id, name: res.name, email: res.email });
      navigate('/cabinet');
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка входа', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await cabinetApi.register(regForm.email, regForm.password, regForm.name, regForm.phone);
      saveSession(res.token, { user_id: res.user_id, name: res.name, email: res.email });
      navigate('/cabinet');
    } catch (err: unknown) {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка регистрации', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Icon name="Zap" size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">ECUPro</span>
          </div>
          <p className="text-muted-foreground text-sm">Личный кабинет клиента</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-foreground text-lg">Войдите в аккаунт</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.ru"
                      value={loginForm.email}
                      onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Пароль</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
                    Войти
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">или</span>
                  </div>
                </div>

                <TelegramButton onSuccess={(token, name, userId) => {
                  saveSession(token, { user_id: userId, name });
                  navigate('/cabinet');
                }} />
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="reg-name">Имя *</Label>
                    <Input
                      id="reg-name"
                      placeholder="Иван Иванов"
                      value={regForm.name}
                      onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">Email *</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="your@email.ru"
                      value={regForm.email}
                      onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-phone">Телефон</Label>
                    <Input
                      id="reg-phone"
                      type="tel"
                      placeholder="+7 999 000 00 00"
                      value={regForm.phone}
                      onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">Пароль *</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Минимум 6 символов"
                      value={regForm.password}
                      onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
                    Создать аккаунт
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">или</span>
                  </div>
                </div>

                <TelegramButton onSuccess={(token, name, userId) => {
                  saveSession(token, { user_id: userId, name });
                  navigate('/cabinet');
                }} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center mt-4">
          <a href="/" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
            ← Вернуться на сайт
          </a>
        </p>
      </div>
    </div>
  );
}

interface TelegramButtonProps {
  onSuccess: (token: string, name: string, userId: number) => void;
}

function TelegramButton({ onSuccess }: TelegramButtonProps) {
  const { toast } = useToast();

  function handleTelegramClick() {
    const botName = 'ecuproo_bot';
    const authUrl = `https://telegram.me/${botName}?start=auth`;
    const width = 550;
    const height = 470;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `https://oauth.telegram.org/auth?bot_id=&origin=${encodeURIComponent(window.location.origin)}&embed=1&request_access=write`,
      'telegram_oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const handler = async (event: MessageEvent) => {
      if (event.origin !== 'https://oauth.telegram.org') return;
      window.removeEventListener('message', handler);
      popup?.close();

      const tgData = event.data;
      if (!tgData?.id) {
        toast({ title: 'Ошибка', description: 'Не удалось получить данные Telegram', variant: 'destructive' });
        return;
      }
      try {
        const res = await cabinetApi.telegramLogin({ ...tgData, action: 'telegram_login' });
        onSuccess(res.token, res.name, res.user_id);
      } catch (err: unknown) {
        toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Ошибка Telegram', variant: 'destructive' });
      }
    };

    window.addEventListener('message', handler);
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full border-[#2AABEE] text-[#2AABEE] hover:bg-[#2AABEE]/10"
      onClick={handleTelegramClick}
    >
      <svg className="mr-2" width="18" height="18" viewBox="0 0 24 24" fill="#2AABEE">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.04 13.845l-2.956-.924c-.642-.2-.657-.642.136-.953l11.57-4.461c.534-.194 1.001.13.834.714z"/>
      </svg>
      Войти через Telegram
    </Button>
  );
}
