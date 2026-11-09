import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://yturrmoqtckrshisnhin.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2DpiDMX4NLL-3Dr8dcdaog_LxvT7X1o';
export const SESSION_STORAGE_KEY = 'atsh_session';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export type SpeciesType = 'ga' | 'heo';
export type UserRole = 'admin' | 'phu_admin' | 'nv_bio' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type ZoneType = 'do' | 'vang' | 'xanh';

export interface AuthSessionUser {
  email: string;
  role: UserRole;
}

export interface SopRecord {
  id: string;
  species: SpeciesType;
  title: string;
  area: string;
  zone_type: ZoneType;
  disinfect_min: number | null;
  dilution: string | null;
  content: string;
  warning: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminUserRecord {
  email: string;
  role: UserRole;
  status: UserStatus;
  requested_at?: string;
  decided_at?: string;
  decided_by?: string;
  added_by?: string;
  has_password?: boolean;
}

export interface LoginResult {
  ok: boolean;
  reason?: 'NOT_REQUESTED' | 'PENDING' | 'REJECTED' | 'LOCKED' | 'PASSWORD_REQUIRED' | 'WRONG_PASSWORD';
  token?: string;
  email?: string;
  role?: string;
}

export interface RequestAccessResult {
  status: 'pending' | 'approved' | 'rejected';
  created?: boolean;
}

// UUID validation helper to prevent invalid uuid syntax errors
export function isValidUuid(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

export function getStoredSessionToken(): string | null {
  try {
    const token = localStorage.getItem(SESSION_STORAGE_KEY);
    if (token && isValidUuid(token)) {
      return token.trim();
    }
  } catch {
    // ignore
  }
  return null;
}

export function setStoredSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, token.trim());
  } catch {
    // ignore
  }
}

export function clearStoredSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'phu_admin':
      return 'Phó admin';
    case 'nv_bio':
      return 'NV Bio';
    case 'user':
    default:
      return 'Người dùng';
  }
}

export function getZoneTypeBadge(type: ZoneType | string): {
  label: string;
  fullLabel: string;
  colorClass: string;
  glyph: string;
} {
  switch (type) {
    case 'do':
      return {
        label: 'Vùng Đỏ',
        fullLabel: 'Vùng Đỏ (nguy hiểm)',
        colorClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
        glyph: '●',
      };
    case 'vang':
      return {
        label: 'Vùng Vàng',
        fullLabel: 'Vùng Vàng (rủi ro)',
        colorClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        glyph: '▲',
      };
    case 'xanh':
    default:
      return {
        label: 'Vùng Xanh',
        fullLabel: 'Vùng Xanh (an toàn)',
        colorClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        glyph: '■',
      };
  }
}

export function translateRpcError(msg: string): string {
  if (msg.includes('MISSING_FIELDS')) {
    return 'Vui lòng nhập đủ tiêu đề, khu vực và nội dung';
  }
  if (msg.includes('INVALID_ZONE')) {
    return 'Vui lòng chọn vùng';
  }
  if (msg.includes('INVALID_DISINFECT')) {
    return 'Thời gian sát trùng phải là số lớn hơn 0';
  }
  if (msg.includes('INVALID_DILUTION')) {
    return 'Nồng độ pha thuốc phải có dạng 1:100';
  }
  if (msg.includes('NO_VALID_ITEMS')) {
    return 'File không có quy trình hợp lệ, dữ liệu hiện tại được giữ nguyên';
  }
  if (msg.includes('FORBIDDEN') || msg.toLowerCase().includes('forbidden')) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  return msg;
}

// Generic RPC invoker with standard error parsing
export async function invokeRpc<T>(
  rpcName: string,
  params: Record<string, unknown>,
  onSessionInvalid?: () => void
): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc(rpcName, params);

    if (error) {
      const msg = error.message || String(error);
      if (
        msg.includes('SESSION_INVALID') ||
        error.code === '22P02' ||
        msg.toLowerCase().includes('invalid session')
      ) {
        clearStoredSessionToken();
        if (onSessionInvalid) {
          onSessionInvalid();
        }
        return {
          ok: false,
          data: null,
          error: 'Phiên đăng nhập đã hết hạn hoặc quyền truy cập đã bị thu hồi.',
        };
      }
      return { ok: false, data: null, error: translateRpcError(msg) };
    }

    return { ok: true, data: data as T, error: null };
  } catch (err) {
    const errText = err instanceof Error ? err.message : String(err);
    if (errText.includes('SESSION_INVALID')) {
      clearStoredSessionToken();
      if (onSessionInvalid) {
        onSessionInvalid();
      }
      return {
        ok: false,
        data: null,
        error: 'Phiên đăng nhập đã hết hạn hoặc quyền truy cập đã bị thu hồi.',
      };
    }
    return { ok: false, data: null, error: translateRpcError(errText) };
  }
}
