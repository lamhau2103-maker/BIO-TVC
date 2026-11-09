import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mail,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { invokeRpc, setStoredSessionToken, LoginResult, RequestAccessResult } from '../lib/supabase';

interface LoginViewProps {
  onLoginSuccess: (token: string, email: string, role: string) => void;
  onNotify: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
  initialNotice?: string | null;
}

const THAI_VIET_LOGO = '/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg';

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNotify,
  initialNotice,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordWarningBorder, setPasswordWarningBorder] = useState(false);
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  } | null>(initialNotice ? { type: 'warning', text: initialNotice } : null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Clear password from memory on mount/unmount (including after logout)
  useEffect(() => {
    setPasswordInput('');
    return () => {
      setPasswordInput('');
    };
  }, []);

  // Automatic 15-minute unlock timer when account is locked
  useEffect(() => {
    if (!lockedEmail) return;
    const timer = setTimeout(() => {
      setLockedEmail(null);
    }, 15 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [lockedEmail]);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const normalizedCurrentEmail = emailInput.trim().toLowerCase();
  const isLoginDisabledByLock = Boolean(lockedEmail && lockedEmail === normalizedCurrentEmail);

  const handleRequestAccess = async () => {
    const email = normalizedCurrentEmail;
    if (!email) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập địa chỉ email của bạn.' });
      return;
    }
    if (!validateEmail(email)) {
      setStatusMessage({
        type: 'error',
        text: 'Địa chỉ email không đúng định dạng. Vui lòng kiểm tra lại.',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    setPasswordWarningBorder(false);

    const { data, error } = await invokeRpc<RequestAccessResult>('request_access', {
      p_email: email,
    });

    setIsLoading(false);

    if (error) {
      setStatusMessage({ type: 'error', text: error });
      return;
    }

    if (data?.status === 'pending') {
      setStatusMessage({
        type: 'warning',
        text: 'Yêu cầu của bạn đã được gửi. Vui lòng LIÊN HỆ TRỰC TIẾP Admin để nhờ phê duyệt trên hệ thống, sau đó quay lại bấm Đăng nhập.',
      });
      onNotify(
        'info',
        'Đã gửi yêu cầu truy cập',
        'Vui lòng liên hệ trực tiếp Admin để được phê duyệt quyền truy cập.'
      );
    } else if (data?.status === 'approved') {
      setStatusMessage({
        type: 'success',
        text: 'Email này đã được cấp quyền, hãy bấm Đăng nhập.',
      });
    } else if (data?.status === 'rejected') {
      setStatusMessage({
        type: 'error',
        text: 'Yêu cầu đã bị từ chối, vui lòng liên hệ Admin.',
      });
    } else {
      setStatusMessage({
        type: 'info',
        text: 'Yêu cầu của bạn đã được ghi nhận. Vui lòng liên hệ Admin để được phê duyệt.',
      });
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || isLoginDisabledByLock) return;

    const email = normalizedCurrentEmail;
    if (!email) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập email để đăng nhập.' });
      return;
    }
    if (!validateEmail(email)) {
      setStatusMessage({ type: 'error', text: 'Email không đúng định dạng. Vui lòng nhập lại.' });
      return;
    }

    const payload: { p_email: string; p_password: string | null } = {
      p_email: email,
      p_password: passwordInput.length > 0 ? passwordInput : null,
    };

    setIsLoading(true);
    setStatusMessage(null);
    setPasswordWarningBorder(false);

    const { data, error } = await invokeRpc<LoginResult>('login', payload);

    setIsLoading(false);

    if (error) {
      setStatusMessage({ type: 'error', text: error });
      return;
    }

    if (data?.ok && data.token) {
      setPasswordInput('');
      setStoredSessionToken(data.token);
      onLoginSuccess(data.token, data.email || email, data.role || 'user');
      return;
    }

    // Handle specific reasons
    switch (data?.reason) {
      case 'PASSWORD_REQUIRED':
        setPasswordWarningBorder(true);
        setStatusMessage({
          type: 'warning',
          text: 'Tài khoản này yêu cầu mật khẩu.',
        });
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 20);
        break;
      case 'WRONG_PASSWORD':
        setPasswordInput('');
        setPasswordWarningBorder(true);
        setStatusMessage({
          type: 'error',
          text: 'Sai mật khẩu.',
        });
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 20);
        break;
      case 'LOCKED':
        setLockedEmail(email);
        setStatusMessage({
          type: 'error',
          text: 'Tài khoản tạm khóa 15 phút do nhập sai nhiều lần.',
        });
        break;
      case 'NOT_REQUESTED':
        setStatusMessage({
          type: 'warning',
          text: 'Email này chưa gửi yêu cầu, hãy bấm Gửi yêu cầu truy cập.',
        });
        break;
      case 'PENDING':
        setStatusMessage({
          type: 'warning',
          text: 'Yêu cầu đang chờ phê duyệt, vui lòng liên hệ trực tiếp Admin.',
        });
        break;
      case 'REJECTED':
        setStatusMessage({
          type: 'error',
          text: 'Yêu cầu đã bị từ chối, vui lòng liên hệ Admin.',
        });
        break;
      default:
        setStatusMessage({
          type: 'error',
          text: 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.',
        });
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#081C34] via-[#0B4F5A] to-[#082B49] text-[#F8FAFC]">
      {/* Aurora Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="animate-aurora-mint absolute -top-20 -left-16 w-[520px] h-[520px] rounded-full blur-[110px] opacity-30"
          style={{ backgroundColor: '#34D399' }}
        />
        <div
          className="animate-aurora-aqua absolute top-1/4 -right-20 w-[560px] h-[560px] rounded-full blur-[110px] opacity-30"
          style={{ backgroundColor: '#22D3EE' }}
        />
        <div
          className="animate-aurora-sky absolute -bottom-24 left-1/3 w-[580px] h-[580px] rounded-full blur-[110px] opacity-30"
          style={{ backgroundColor: '#38BDF8' }}
        />
        <div className="absolute inset-0 bg-aurora-dot-grid" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Prominent Company Banner */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center gap-3.5 px-6 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-cyan-300/30 shadow-[0_0_35px_rgba(34,211,238,0.2)]"
          >
            <div className="rounded-xl bg-white p-1.5 shadow-[0_4px_12px_rgba(6,182,212,0.3)] shrink-0">
              <img
                src={THAI_VIET_LOGO}
                alt="Logo Thái Việt Corporation"
                className="h-10 w-auto object-contain block"
              />
            </div>
            <span className="text-base sm:text-lg font-extrabold tracking-wider uppercase bg-gradient-to-r from-white via-[#E0F2FE] to-[#A5F3FC] bg-clip-text text-transparent">
              THÁI VIỆT CORPORATION
            </span>
          </motion.div>
        </div>

        {/* Login Glassmorphism Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-cyan-300/25 p-7 sm:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/10 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              <span>HỆ THỐNG AN TOÀN SINH HỌC</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              TRA CỨU QUY TRÌNH
            </h1>
            <p className="text-xs text-cyan-100/75 leading-relaxed">
              Nhập email công vụ để đăng nhập hoặc gửi yêu cầu phê duyệt truy cập. Admin và Phó admin nhập thêm mật khẩu.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-semibold text-cyan-100">
                Email nhân sự:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-cyan-300/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="vidu: nhanvien@thaiviet.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-cyan-300/30 focus:border-emerald-300 focus:shadow-[0_0_20px_rgba(52,211,153,0.3)] focus:outline-none text-sm text-white placeholder-cyan-100/50 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input (for Admin / Phó admin) */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-semibold text-cyan-100">
                Mật khẩu (chỉ dành cho Admin / Phó admin):
              </label>
              <div className="relative">
                <Lock
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                    passwordWarningBorder ? 'text-amber-300' : 'text-cyan-300/70'
                  }`}
                />
                <input
                  ref={passwordInputRef}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordWarningBorder) setPasswordWarningBorder(false);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Để trống nếu bạn là nhân viên / người dùng"
                  className={`w-full pl-10 pr-10 py-3 rounded-xl bg-white/10 backdrop-blur-md border focus:outline-none text-sm text-white placeholder-cyan-100/50 transition-all ${
                    passwordWarningBorder
                      ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] focus:border-amber-300'
                      : 'border-cyan-300/30 focus:border-emerald-300 focus:shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cyan-300/70 hover:text-white transition-colors cursor-pointer"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Status & Feedback Alert */}
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-200'
                    : statusMessage.type === 'warning'
                    ? 'bg-amber-500/15 border-amber-400/35 text-amber-200'
                    : statusMessage.type === 'info'
                    ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-200'
                    : 'bg-rose-500/15 border-rose-400/35 text-rose-200'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{statusMessage.text}</div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <motion.button
                type="submit"
                whileHover={isLoading || isLoginDisabledByLock ? undefined : { scale: 1.02 }}
                whileTap={isLoading || isLoginDisabledByLock ? undefined : { scale: 0.98 }}
                disabled={isLoading || isLoginDisabledByLock}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-400/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kết nối...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Đăng Nhập</span>
                  </>
                )}
              </motion.button>

              <motion.button
                type="button"
                whileHover={isLoading ? undefined : { scale: 1.01 }}
                whileTap={isLoading ? undefined : { scale: 0.98 }}
                onClick={handleRequestAccess}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-cyan-300/30 text-xs font-semibold text-cyan-100 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4 text-cyan-300" />
                <span>Gửi yêu cầu truy cập</span>
              </motion.button>
            </div>
          </form>

          <div className="pt-3 border-t border-cyan-300/15 text-center text-[11px] text-cyan-200/60 leading-relaxed">
            Hệ thống An toàn sinh học bảo mật cao · Phân quyền tự động qua cơ sở dữ liệu Supabase.
          </div>
        </motion.div>
      </div>
    </div>
  );
};
