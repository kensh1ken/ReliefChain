export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('reliefchain-token') : null;
  const response = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers }, cache: 'no-store' });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? `Request failed: ${response.status}`);
  return response.json();
}
export const money = (paise = 0) => new Intl.NumberFormat('en-IN', { style:'currency',currency:'INR',maximumFractionDigits:0 }).format(paise / 100);
