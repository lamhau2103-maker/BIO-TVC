import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  KeyRound,
  ShieldAlert,
  Clock,
  RotateCcw,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  Lock,
} from 'lucide-react';
import {
  AdminUserRecord,
  UserRole,
  invokeRpc,
  getRoleLabel,
} from '../lib/supabase';

interface UserManagementViewProps {
  token: string;
  currentUserEmail: string;
  onNotify: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
  onSessionInvalid: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  token,
  currentUserEmail,
  onNotify,
  onSessionInvalid,
}) => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form: Thêm email bộ phận Bio
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'nv_bio' | 'phu_admin'>('nv_bio');
  const [newPassword, setNewPassword] = useState('');

  // Form: Đổi mật khẩu
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  // Modal: Đổi vai trò sang Phó admin cần mật khẩu
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    email: string;
    targetRole: UserRole;
  } | null>(null);
  const [roleChangePassword, setRoleChangePassword] = useState('');

  // Modal: Xác nhận xóa người dùng
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await invokeRpc<AdminUserRecord[]>(
      'admin_list_users',
      { p_token: token },
      onSessionInvalid
    );
    setIsLoading(false);

    if (error) {
      onNotify('error', 'Lỗi tải danh sách người dùng', error);
      return;
    }

    if (Array.isArray(data)) {
      setUsers(data);
    }
  }, [token, onNotify, onSessionInvalid]);

  // Initial fetch and 15s auto-polling
  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => {
      fetchUsers();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Phê duyệt / Từ chối yêu cầu
  const handleDecide = async (email: string, action: 'approve' | 'reject') => {
    setIsActionLoading(true);
    const { error } = await invokeRpc(
      'admin_decide',
      {
        p_token: token,
        p_email: email,
        p_action: action,
      },
      onSessionInvalid
    );
    setIsActionLoading(false);

    if (error) {
      onNotify('error', 'Thao tác không thành công', error);
      return;
    }

    onNotify(
      action === 'approve' ? 'success' : 'info',
      action === 'approve' ? 'Đã phê duyệt tài khoản' : 'Đã từ chối yêu cầu',
      `Tài khoản "${email}" đã được ${action === 'approve' ? 'cấp quyền truy cập' : 'từ chối'}.`
    );

    await fetchUsers();
  };

  // Thêm người dùng Bio mới (được duyệt ngay)
  const handleAddBioUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      onNotify('warning', 'Thiếu email', 'Vui lòng nhập địa chỉ email.');
      return;
    }

    if (newRole === 'phu_admin' && newPassword.length < 6) {
      onNotify('warning', 'Mật khẩu quá ngắn', 'Mật khẩu Phó admin bắt buộc tối thiểu 6 ký tự.');
      return;
    }

    setIsActionLoading(true);
    const params: { p_token: string; p_email: string; p_role: string; p_password?: string } = {
      p_token: token,
      p_email: email,
      p_role: newRole,
    };
    if (newRole === 'phu_admin' && newPassword) {
      params.p_password = newPassword;
    }

    const { error } = await invokeRpc('admin_add_user', params, onSessionInvalid);
    setIsActionLoading(false);

    if (error) {
      onNotify('error', 'Lỗi thêm người dùng', error);
      return;
    }

    onNotify(
      'success',
      'Đã thêm tài khoản bộ phận Bio',
      `Tài khoản "${email}" đã được cấp vai trò ${getRoleLabel(newRole)} và phê duyệt ngay.`
    );

    setNewEmail('');
    setNewPassword('');
    await fetchUsers();
  };

  // Đổi vai trò người dùng
  const handleChangeRole = async (email: string, currentRole: UserRole, targetRole: UserRole) => {
    if (email === currentUserEmail) {
      onNotify('warning', 'Không thể tự hạ quyền', 'Anh/Chị không thể tự đổi vai trò của chính mình.');
      return;
    }

    if (currentRole === 'admin') {
      onNotify('warning', 'Không thể đổi quyền Admin', 'Không thể thay đổi vai trò của tài khoản Admin gốc.');
      return;
    }

    // Nếu đổi sang Phó admin -> cần mật khẩu
    if (targetRole === 'phu_admin') {
      setRoleChangeTarget({ email, targetRole });
      setRoleChangePassword('');
      return;
    }

    // Đổi sang NV Bio hoặc User
    setIsActionLoading(true);
    const { error } = await invokeRpc(
      'admin_add_user',
      {
        p_token: token,
        p_email: email,
        p_role: targetRole,
      },
      onSessionInvalid
    );
    setIsActionLoading(false);

    if (error) {
      onNotify('error', 'Lỗi chuyển đổi vai trò', error);
      return;
    }

    onNotify(
      'success',
      'Đã cập nhật vai trò',
      `Tài khoản "${email}" đã được chuyển sang vai trò ${getRoleLabel(targetRole)}.`
    );
    await fetchUsers();
  };

  // Xác nhận đổi sang Phó admin với mật khẩu
  const handleConfirmRoleChangeToPhuAdmin = async () => {
    if (!roleChangeTarget) return;
    if (roleChangePassword.length < 6) {
      onNotify('warning', 'Mật khẩu quá ngắn', 'Mật khẩu cho Phó admin phải có tối thiểu 6 ký tự.');
      return;
    }

    setIsActionLoading(true);
    const { error } = await invokeRpc(
      'admin_add_user',
      {
        p_token: token,
        p_email: roleChangeTarget.email,
        p_role: 'phu_admin',
        p_password: roleChangePassword,
      },
      onSessionInvalid
    );
    setIsActionLoading(false);

    if (error) {
      onNotify('error', 'Lỗi phân quyền Phó admin', error);
      return;
    }

    onNotify(
      'success',
      'Đã thăng cấp Phó admin',
      `Tài khoản "${roleChangeTarget.email}" đã được chuyển thành Phó admin kèm mật khẩu mới.`
    );

    setRoleChangeTarget(null);
    setRoleChangePassword('');
    await fetchUsers();
  };

  // Xóa người dùng
  const handleDeleteUser = async (email: string) => {
    if (email === currentUserEmail) {
      onNotify('warning', 'Thao tác bị chặn', 'Anh/Chị không thể tự xóa tài khoản của chính mình.');
      return;
    }

    setIsActionLoading(true);
    const { error } = await invokeRpc(
      'admin_delete_user',
      {
        p_token: token,
        p_email: email,
      },
      onSessionInvalid
    );
    setIsActionLoading(false);

    if (error) {
      onNotify('error', 'Lỗi xóa tài khoản', error);
      return;
    }

    onNotify('info', 'Đã xóa người dùng', `Đã thu hồi toàn bộ quyền truy cập của "${email}".`);
    setDeleteConfirmEmail(null);
    await fetchUsers();
  };

  // Đổi mật khẩu
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      onNotify('warning', 'Thiếu email', 'Vui lòng chọn email cần đặt lại mật khẩu.');
      return;
    }
    if (resetPassword.length < 6) {
      onNotify('warning', 'Mật khẩu quá ngắn', 'Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    setIsActionLoading(true);
    const { error } = await invokeRpc(
      'admin_set_password',
      {
        p_token: token,
        p_email: resetEmail,
        p_password: resetPassword,
      },
      onSessionInvalid
    );
    setIsActionLoading(false);

    if (error) {
      onNotify('error', 'Lỗi đặt lại mật khẩu', error);
      return;
    }

    onNotify('success', 'Đã đổi mật khẩu', `Đã cập nhật mật khẩu mới cho "${resetEmail}".`);
    setResetPassword('');
    await fetchUsers();
  };

  // Thống kê nhanh
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved');
  const nvBioCount = approvedUsers.filter((u) => u.role === 'nv_bio').length;
  const phuAdminCount = approvedUsers.filter((u) => u.role === 'phu_admin').length;
  const normalUserCount = approvedUsers.filter((u) => u.role === 'user' || !u.role).length;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Refresh */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 p-5 shadow-[0_8px_32px_0_rgba(6,182,212,0.18)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-100/80 mb-1">
            <span className="font-mono text-emerald-300 font-bold">● TRUNG TÂM QUẢN TRỊ TRUY CẬP (SUPABASE)</span>
            <span aria-hidden="true">·</span>
            <span>Tự động cập nhật mỗi 15 giây</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Phê Duyệt & Phân Quyền Người Dùng Hệ Thống
          </h1>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-cyan-200 border border-cyan-300/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Đang đồng bộ...' : 'Làm mới danh sách'}</span>
        </button>
      </div>

      {/* Thống kê nhanh (Quick Stats) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-amber-400/30 shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
          <div className="text-[11px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Yêu Cầu Chờ Duyệt</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-200 font-mono tabular-nums">
            {pendingUsers.length}
          </div>
          <div className="text-[11px] text-cyan-100/60 mt-0.5">Cần Admin phê duyệt</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-teal-300/25 shadow-[0_4px_20px_rgba(6,182,212,0.12)]">
          <div className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Đã Cấp Quyền</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold text-white font-mono tabular-nums">
            {approvedUsers.length}
          </div>
          <div className="text-[11px] text-cyan-100/60 mt-0.5">Người dùng đang hoạt động</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-emerald-400/30 shadow-[0_4px_20px_rgba(16,185,129,0.15)]">
          <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Nhân Viên Bio</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-300 font-mono tabular-nums">
            {nvBioCount}
          </div>
          <div className="text-[11px] text-cyan-100/60 mt-0.5">Tra cứu không cần mật khẩu</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-purple-400/30 shadow-[0_4px_20px_rgba(168,85,247,0.15)]">
          <div className="text-[11px] text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Phó Admin</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold text-purple-200 font-mono tabular-nums">
            {phuAdminCount}
          </div>
          <div className="text-[11px] text-cyan-100/60 mt-0.5">Được nạp & sửa tài liệu</div>
        </div>
      </div>

      {/* a) Yêu Cầu Chờ Duyệt (Pending) */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-amber-400/30 overflow-hidden shadow-[0_8px_32px_0_rgba(245,158,11,0.15)]">
        <div className="px-6 py-4 bg-white/[0.03] border-b border-amber-400/20 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-base font-bold text-white">
                Yêu Cầu Chờ Duyệt Truy Cập ({pendingUsers.length})
              </h2>
            </div>
            <p className="text-xs text-amber-200/80 mt-0.5">
              💡 Lưu ý: Người dùng sẽ tự liên hệ trực tiếp Admin để nhờ phê duyệt trên hệ thống.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/60 text-[11px] font-mono text-cyan-100/80">
                <th className="py-3 px-4">EMAIL NGƯỜI DÙNG</th>
                <th className="py-3 px-4">THỜI GIAN GỬI YÊU CẦU</th>
                <th className="py-3 px-4 text-right">QUYẾT ĐỊNH PHÊ DUYỆT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-cyan-200/60">
                    Hiện không có yêu cầu nào đang chờ phê duyệt.
                  </td>
                </tr>
              ) : (
                pendingUsers.map((u) => (
                  <tr key={u.email} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-sm text-white font-medium">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-cyan-100/70">
                      {u.requested_at ? new Date(u.requested_at).toLocaleString('vi-VN') : 'Mới gửi'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={isActionLoading}
                          onClick={() => handleDecide(u.email, 'approve')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Phê Duyệt</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={isActionLoading}
                          onClick={() => handleDecide(u.email, 'reject')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium cursor-pointer disabled:opacity-50"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Từ Chối</span>
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: c) Thêm email Bio (Left 6 cols) & d) Đổi mật khẩu (Right 6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* c) Thêm email bộ phận Bio */}
        <form
          onSubmit={handleAddBioUser}
          className="lg:col-span-6 rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-teal-300/20 pb-3">
            <UserPlus className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-base font-bold text-white">
              Thêm Email Bộ Phận Bio (Duyệt Ngay)
            </h2>
          </div>

          <p className="text-xs text-cyan-100/75 leading-relaxed">
            Thêm nhân sự chuyên môn vào hệ thống mà không cần chờ gửi yêu cầu phê duyệt.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cyan-100">
              Email nhân sự:
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nhansu.bio@thaiviet.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-cyan-300/30 focus:border-emerald-300 focus:outline-none text-xs text-white placeholder-cyan-100/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cyan-100">
              Lựa chọn vai trò:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewRole('nv_bio')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newRole === 'nv_bio'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow'
                    : 'bg-white/[0.04] border-white/10 text-cyan-100/75 hover:border-cyan-300/30'
                }`}
              >
                Nhân Viên Bio
              </button>
              <button
                type="button"
                onClick={() => setNewRole('phu_admin')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newRole === 'phu_admin'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow'
                    : 'bg-white/[0.04] border-white/10 text-cyan-100/75 hover:border-cyan-300/30'
                }`}
              >
                Phó Admin (Có Mật Khẩu)
              </button>
            </div>
          </div>

          {newRole === 'phu_admin' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="block text-xs font-semibold text-cyan-100">
                Mật khẩu cho Phó admin (Tối thiểu 6 ký tự) *:
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-purple-400/40 focus:border-purple-300 focus:outline-none text-xs text-white placeholder-cyan-100/50"
              />
            </motion.div>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            disabled={isActionLoading || !newEmail.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-400/25 cursor-pointer disabled:opacity-50"
          >
            {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Thêm & Cấp Quyền ${newRole === 'phu_admin' ? 'Phó Admin' : 'NV Bio'}`}
          </motion.button>
        </form>

        {/* d) Đổi mật khẩu */}
        <form
          onSubmit={handleSetPassword}
          className="lg:col-span-6 rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-teal-300/20 pb-3">
            <KeyRound className="w-5 h-5 text-cyan-300 shrink-0" />
            <h2 className="text-base font-bold text-white">
              Đổi Mật Khẩu (Admin & Phó Admin)
            </h2>
          </div>

          <p className="text-xs text-cyan-100/75 leading-relaxed">
            Admin có thể đặt lại mật khẩu cho chính mình hoặc cho tài khoản Phó admin.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cyan-100">
              Chọn tài khoản:
            </label>
            <select
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-300/30 focus:border-emerald-300 focus:outline-none text-xs text-white"
            >
              <option value="">-- Chọn tài khoản cần đổi mật khẩu --</option>
              {approvedUsers
                .filter((u) => u.role === 'admin' || u.role === 'phu_admin')
                .map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.email} ({getRoleLabel(u.role)})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cyan-100">
              Mật khẩu mới (Tối thiểu 6 ký tự):
            </label>
            <input
              type="password"
              required
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-cyan-300/30 focus:border-emerald-300 focus:outline-none text-xs text-white placeholder-cyan-100/50"
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            disabled={isActionLoading || !resetEmail || resetPassword.length < 6}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-cyan-300/30 text-xs font-bold text-cyan-200 cursor-pointer disabled:opacity-50"
          >
            {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Lưu Mật Khẩu Mới'}
          </motion.button>
        </form>
      </div>

      {/* b) Danh Sách Người Dùng Đang Được Cấp Quyền */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.35)]">
        <div className="px-6 py-4 bg-white/[0.03] border-b border-teal-300/20 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">
              Danh Sách Người Dùng Đang Được Cấp Quyền ({approvedUsers.length})
            </h2>
            <p className="text-xs text-cyan-100/75">
              Thay đổi vai trò hoặc thu hồi quyền truy cập ngay trên bảng.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-teal-300/20 bg-slate-950/60 text-[11px] font-mono text-cyan-100/80">
                <th className="py-3 px-4">EMAIL</th>
                <th className="py-3 px-4">VAI TRÒ HIỆN TẠI</th>
                <th className="py-3 px-4">NGÀY DUYỆT / THÊM</th>
                <th className="py-3 px-4">NGƯỜI DUYỆT / THÊM</th>
                <th className="py-3 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-300/15 text-sm">
              {approvedUsers.map((u) => {
                const isSelf = u.email === currentUserEmail;
                const isRootAdmin = u.role === 'admin';

                return (
                  <tr key={u.email} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-sm text-white">
                      <div className="flex items-center gap-2">
                        <span>{u.email}</span>
                        {isSelf && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[10px] text-cyan-200 font-semibold">
                            Chính Bạn
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isRootAdmin ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-xs font-bold text-emerald-300">
                          Admin (Gốc)
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.email, u.role, e.target.value as UserRole)}
                          disabled={isSelf || isActionLoading}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-300/30 text-xs font-semibold text-white focus:outline-none cursor-pointer"
                        >
                          <option value="user">Người dùng (Chỉ tra cứu)</option>
                          <option value="nv_bio">NV Bio (Chỉ tra cứu)</option>
                          <option value="phu_admin">Phó Admin (Nạp tài liệu)</option>
                        </select>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-cyan-100/70">
                      {u.decided_at ? new Date(u.decided_at).toLocaleString('vi-VN') : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-cyan-100/70">
                      {u.decided_by || u.added_by || 'Hệ thống'}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {!isSelf && !isRootAdmin ? (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmEmail(u.email)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa Quyền</span>
                        </button>
                      ) : (
                        <span className="text-xs text-cyan-200/40 italic">Không thể xóa</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Xác nhận xóa người dùng */}
      <AnimatePresence>
        {deleteConfirmEmail && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-300">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-white">Xác nhận thu hồi quyền truy cập</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed">
                Anh/Chị có chắc chắn muốn xóa quyền truy cập của tài khoản{' '}
                <strong className="text-white">&ldquo;{deleteConfirmEmail}&rdquo;</strong>?
                Tài khoản này sẽ bị đưa về màn hình đăng nhập và không thể truy cập hệ thống nữa.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmEmail(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(deleteConfirmEmail)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer"
                >
                  Xóa Người Dùng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Đổi vai trò sang Phó admin cần nhập mật khẩu */}
      <AnimatePresence>
        {roleChangeTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 border border-purple-500/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-purple-300">
                <Lock className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-white">Đặt mật khẩu cho Phó Admin</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed">
                Vai trò <strong>Phó Admin</strong> yêu cầu mật khẩu để bảo vệ quyền Nạp & Sửa tài liệu SOP. Vui lòng thiết lập mật khẩu đăng nhập cho{' '}
                <strong className="text-white">{roleChangeTarget.email}</strong>:
              </p>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-cyan-100">
                  Mật khẩu mới (Tối thiểu 6 ký tự):
                </label>
                <input
                  type="password"
                  value={roleChangePassword}
                  onChange={(e) => setRoleChangePassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-purple-400/40 focus:border-purple-300 focus:outline-none text-xs text-white"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleChangeTarget(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRoleChangeToPhuAdmin}
                  disabled={roleChangePassword.length < 6}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                >
                  Xác Nhận Thăng Cấp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
