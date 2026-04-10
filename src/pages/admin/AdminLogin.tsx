import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { adminApi, saveAdminKey, clearAdminKey } from '@/lib/admin-api';
import Icon from '@/components/ui/icon';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
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
