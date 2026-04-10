const CABINET_URL = 'https://functions.poehali.dev/f3320483-74c7-4679-af0e-b96363856414';

export function getAdminKey() {
  return sessionStorage.getItem('admin_key') || '';
}

export function saveAdminKey(key: string) {
  sessionStorage.setItem('admin_key', key);
}

export function clearAdminKey() {
  sessionStorage.removeItem('admin_key');
}

async function call(action: string, data: Record<string, unknown> = {}) {
  const res = await fetch(CABINET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, admin_key: getAdminKey(), ...data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Ошибка сервера');
  return json;
}

export interface AdminUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  telegram_id?: number;
  created_at: string;
  orders_count: number;
}

export interface AdminOrder {
  id: number;
  title: string;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  user: { id: number; name: string; email?: string; phone?: string };
}

export interface AdminFile {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  order_id?: number;
  user_id: number;
  car_info?: string;
  comment?: string;
}

export const adminApi = {
  getUsers: () => call('admin_get_users'),
  getOrders: () => call('admin_get_orders'),
  getFirmware: (userId?: number) => call('admin_get_firmware', userId ? { user_id: userId } : {}),
  createOrder: (userId: number, amount: number, title: string) =>
    call('admin_create_order', { user_id: userId, amount, title }),
  uploadFirmware: (userId: number, fileData: string, fileName: string, orderId?: number) =>
    call('admin_upload_firmware', { user_id: userId, file_data: fileData, file_name: fileName, order_id: orderId }),
  deleteOrder: (orderId: number) =>
    call('admin_delete_order', { order_id: orderId }),
};