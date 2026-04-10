const CABINET_URL = 'https://functions.poehali.dev/f3320483-74c7-4679-af0e-b96363856414';

export interface User {
  user_id: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface Order {
  id: number;
  title: string;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface FirmwareFile {
  id: number;
  file_name: string;
  file_url: string;
  file_type: 'client_upload' | 'admin_upload';
  file_size: number;
  uploaded_at: string;
  order_id?: number;
  car_info?: string;
}

async function call(action: string, data: Record<string, unknown> = {}, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;
  const res = await fetch(CABINET_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Ошибка сервера');
  return json;
}

export function getToken() {
  return localStorage.getItem('cabinet_token') || '';
}

export function saveSession(token: string, user: User) {
  localStorage.setItem('cabinet_token', token);
  localStorage.setItem('cabinet_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('cabinet_token');
  localStorage.removeItem('cabinet_user');
}

export function getSavedUser(): User | null {
  try {
    const s = localStorage.getItem('cabinet_user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export const cabinetApi = {
  register: (email: string, password: string, name: string, phone?: string) =>
    call('register', { email, password, name, phone }),

  login: (email: string, password: string) =>
    call('login', { email, password }),

  telegramLogin: (tgData: Record<string, unknown>) =>
    call('telegram_login', tgData),

  me: (token: string) => call('me', {}, token),

  getOrders: (token: string) => call('get_orders', {}, token),

  createPayment: (token: string, amount: number, title: string) =>
    call('create_payment', { amount, title, return_url: `${window.location.origin}/cabinet` }, token),

  getFirmware: (token: string) => call('get_firmware', {}, token),

  uploadFirmware: (token: string, fileData: string, fileName: string, carInfo?: string, orderId?: number) =>
    call('upload_firmware', { file_data: fileData, file_name: fileName, car_info: carInfo, order_id: orderId }, token),
};