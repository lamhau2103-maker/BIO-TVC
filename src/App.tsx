import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  LogOut,
  Shield,
  Layers,
  BookOpen,
  MessageSquare,
  FileText,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChatMessage,
  ChatResponsePayload,
  SopDocument,
  SpeciesType,
  ToastNotice,
  ZoneType,
} from './types/biosecurity';
import {
  UserRole,
  getStoredSessionToken,
  setStoredSessionToken,
  clearStoredSessionToken,
  invokeRpc,
  getRoleLabel,
  isValidUuid,
} from './lib/supabase';
import {
  buildLocalRagFallback,
  findBestMatchingSop,
  zoneTypeToBioZone,
  zoneTypeToVietnameseLabel,
} from './utils/ragMatcher';
import { LoginView } from './components/LoginView';
import { AssistantView } from './components/AssistantView';
import { SopLibraryView } from './components/SopLibraryView';
import { AdminPortal } from './components/AdminPortal';
import { UserManagementView } from './components/UserManagementView';

const THAI_VIET_LOGO = '/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg';

type MainTabId = 'ga' | 'heo' | 'tailieu' | 'admin';
type SubTabId = 'chat' | 'library';

interface AuthUserState {
  email: string;
  role: UserRole;
}

function mapRawSopRecord(item: any, fallbackSpecies: SpeciesType): SopDocument {
  const zoneType: ZoneType =
    item.zone_type === 'do' || item.zone_type === 'vang' || item.zone_type === 'xanh'
      ? item.zone_type
      : 'xanh';
  const area = typeof item.area === 'string' && item.area.trim() ? item.area.trim() : 'Khu vực chung';
  const disinfect_min =
    item.disinfect_min !== null && item.disinfect_min !== undefined && item.disinfect_min !== ''
      ? Number(item.disinfect_min)
      : null;
  const dilution =
    typeof item.dilution === 'string' && item.dilution.trim() !== ''
      ? item.dilution.trim()
      : null;
  const warning =
    typeof item.warning === 'string' && item.warning.trim() !== '' ? item.warning.trim() : null;

  return {
    id: String(item.id),
    species: (item.species === 'ga' || item.species === 'heo' ? item.species : fallbackSpecies) as SpeciesType,
    title: String(item.title || ''),
    area,
    zone_type: zoneType,
    disinfect_min: Number.isFinite(disinfect_min) && disinfect_min !== null && disinfect_min > 0 ? disinfect_min : null,
    dilution,
    content: String(item.content || ''),
    warning,
    created_by: item.created_by ?? null,
    updated_by: item.updated_by ?? null,
    created_at: item.created_at || undefined,
    updated_at: item.updated_at || undefined,
    zone: zoneTypeToBioZone(zoneType),
    zoneLabel: `${area} · ${zoneTypeToVietnameseLabel(zoneType)}`,
    active: true,
    updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
  };
}

export default function App() {
  // Session & Auth state
  const [token, setToken] = useState<string | null>(() => getStoredSessionToken());
  const [authUser, setAuthUser] = useState<AuthUserState | null>(null);
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);

  // Active navigation tabs
  const [activeTab, setActiveTab] = useState<MainTabId>('ga');
  const [gaSubTab, setGaSubTab] = useState<SubTabId>('chat');
  const [heoSubTab, setHeoSubTab] = useState<SubTabId>('chat');

  // Supabase Data (strictly isolated Gà vs Heo)
  const [gaSops, setGaSops] = useState<SopDocument[]>([]);
  const [heoSops, setHeoSops] = useState<SopDocument[]>([]);

  // System Prompt for AI
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'Diễn đạt chuyên nghiệp, rõ ràng, bám sát quy trình an toàn sinh học của Thái Việt Corporation.'
  );

  // Highlighted SOP in library
  const [highlightedSopId, setHighlightedSopId] = useState<string | null>(null);

  // Chat states (isolated per species)
  const [gaMessages, setGaMessages] = useState<ChatMessage[]>([]);
  const [heoMessages, setHeoMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const addToast = useCallback(
    (type: ToastNotice['type'], title: string, message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  // Logout handler
  const handleLogout = useCallback(
    async (isRevoked = false) => {
      if (token && isValidUuid(token)) {
        try {
          await invokeRpc('logout', { p_token: token });
        } catch {
          // ignore
        }
      }
      clearStoredSessionToken();
      setToken(null);
      setAuthUser(null);
      setActiveTab('ga');
      if (isRevoked) {
        addToast(
          'warning',
          'Phiên làm việc hết hạn',
          'Quyền truy cập của bạn đã bị thay đổi hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        );
      } else {
        addToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất khỏi Hệ Thống An Toàn Sinh Học.');
      }
    },
    [token, addToast]
  );

  // Fetch SOPs for a single species and return the mapped list
  const fetchSopsBySpecies = useCallback(
    async (sessionToken: string, species: SpeciesType): Promise<SopDocument[]> => {
      if (!isValidUuid(sessionToken)) return [];
      const res = await invokeRpc<any[]>(
        'list_sops',
        { p_token: sessionToken, p_species: species },
        () => handleLogout(true)
      );
      if (res.ok && Array.isArray(res.data)) {
        const mapped = res.data.map((item) => mapRawSopRecord(item, species));
        if (species === 'ga') {
          setGaSops(mapped);
        } else {
          setHeoSops(mapped);
        }
        return mapped;
      }
      return species === 'ga' ? gaSops : heoSops;
    },
    [handleLogout, gaSops, heoSops]
  );

  // Fetch Supabase data for both Gà and Heo
  const fetchSpeciesData = useCallback(
    async (sessionToken: string) => {
      if (!isValidUuid(sessionToken)) return;
      try {
        const [gaSopsRes, heoSopsRes] = await Promise.all([
          invokeRpc<any[]>('list_sops', { p_token: sessionToken, p_species: 'ga' }),
          invokeRpc<any[]>('list_sops', { p_token: sessionToken, p_species: 'heo' }),
        ]);

        if (gaSopsRes.ok && Array.isArray(gaSopsRes.data)) {
          setGaSops(gaSopsRes.data.map((item) => mapRawSopRecord(item, 'ga')));
        }

        if (heoSopsRes.ok && Array.isArray(heoSopsRes.data)) {
          setHeoSops(heoSopsRes.data.map((item) => mapRawSopRecord(item, 'heo')));
        }
      } catch {
        // silent background fetch error
      }
    },
    []
  );

  // Heartbeat verification on mount
  useEffect(() => {
    let isCancelled = false;

    async function verifyInitialSession() {
      const savedToken = getStoredSessionToken();
      if (!savedToken || !isValidUuid(savedToken)) {
        clearStoredSessionToken();
        setToken(null);
        setAuthUser(null);
        setIsVerifyingSession(false);
        return;
      }

      try {
        const res = await invokeRpc<{ email: string; role: UserRole }>('me', {
          p_token: savedToken,
        });

        if (isCancelled) return;

        if (res.ok && res.data && res.data.email) {
          setAuthUser(res.data);
          setToken(savedToken);
          fetchSpeciesData(savedToken);
        } else {
          clearStoredSessionToken();
          setToken(null);
          setAuthUser(null);
        }
      } catch {
        if (!isCancelled) {
          clearStoredSessionToken();
          setToken(null);
          setAuthUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsVerifyingSession(false);
        }
      }
    }

    verifyInitialSession();

    return () => {
      isCancelled = true;
    };
  }, [fetchSpeciesData]);

  // Reload list_sops whenever user switches tabs or subtabs
  useEffect(() => {
    if (!token || !authUser || !isValidUuid(token)) return;
    if (activeTab === 'ga') {
      invokeRpc<any[]>('list_sops', { p_token: token, p_species: 'ga' }).then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          setGaSops(res.data.map((item) => mapRawSopRecord(item, 'ga')));
        }
      });
    } else if (activeTab === 'heo') {
      invokeRpc<any[]>('list_sops', { p_token: token, p_species: 'heo' }).then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          setHeoSops(res.data.map((item) => mapRawSopRecord(item, 'heo')));
        }
      });
    } else if (activeTab === 'tailieu') {
      fetchSpeciesData(token);
    }
  }, [activeTab, gaSubTab, heoSubTab, token, authUser, fetchSpeciesData]);

  // Periodic 60s heartbeat to detect revoked access
  useEffect(() => {
    if (!token || !authUser) return;

    const intervalId = setInterval(async () => {
      if (!isValidUuid(token)) {
        handleLogout(true);
        return;
      }

      const res = await invokeRpc<{ email: string; role: UserRole }>('me', {
        p_token: token,
      });

      if (!res.ok || !res.data || !res.data.email) {
        handleLogout(true);
      } else if (res.data.role !== authUser.role) {
        setAuthUser(res.data);
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [token, authUser, handleLogout]);

  // Handle successful login
  const handleLoginSuccess = (newToken: string, email: string, role: string) => {
    const userRole = (role || 'user') as UserRole;
    const userObj: AuthUserState = { email, role: userRole };
    setStoredSessionToken(newToken);
    setToken(newToken);
    setAuthUser(userObj);
    addToast(
      'success',
      'Đăng nhập thành công',
      `Chào mừng ${email} (${getRoleLabel(userRole)})`
    );
    fetchSpeciesData(newToken);
  };

  // Adjust active tab if role privileges decrease
  useEffect(() => {
    if (!authUser) return;
    if (activeTab === 'admin' && authUser.role !== 'admin') {
      setActiveTab('ga');
    } else if (
      activeTab === 'tailieu' &&
      authUser.role !== 'admin' &&
      authUser.role !== 'phu_admin'
    ) {
      setActiveTab('ga');
    }
  }, [authUser, activeTab]);

  // Handle asking AI question (strict species isolation + fresh list_sops before query)
  const handleSendQuestion = async (species: SpeciesType, question: string) => {
    const trimmed = question.trim();
    if (!trimmed || !token) return;

    const nowTime = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      timestamp: nowTime,
      question: trimmed,
    };

    if (species === 'ga') {
      setGaMessages((prev) => [...prev, userMsg]);
    } else {
      setHeoMessages((prev) => [...prev, userMsg]);
    }

    setIsLoadingChat(true);

    // Fetch latest SOPs for this species from Supabase before sending to AI
    const latestSpeciesSops = await fetchSopsBySpecies(token, species);
    const activeSops = latestSpeciesSops.filter((s) => s.active !== false);

    try {
      const response = await fetch('/api/biosecurity/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          species,
          activeSops,
          customSystemInstruction: systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as ChatResponsePayload;

      // Locate source SOPs via source_ids and matchedSopId
      const sourceIdList = Array.isArray(data.source_ids) ? data.source_ids : [];
      const sourceSops: SopDocument[] = [];
      for (const sid of sourceIdList) {
        const found = activeSops.find((s) => s.id === sid);
        if (found && !sourceSops.some((x) => x.id === found.id)) {
          sourceSops.push(found);
        }
      }

      let matchedSop: SopDocument | undefined = sourceSops[0];
      if (!matchedSop && data.matchedSopId) {
        matchedSop = activeSops.find((s) => s.id === data.matchedSopId);
      }
      if (!matchedSop && !data.isOutOfScope) {
        const localBest = findBestMatchingSop(trimmed, activeSops);
        if (localBest.score >= 8) {
          matchedSop = localBest.sop;
        }
      }
      if (matchedSop && !sourceSops.some((x) => x.id === matchedSop!.id)) {
        sourceSops.unshift(matchedSop);
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        payload: {
          ...data,
          sourceSopTitle: data.sourceSopTitle || matchedSop?.title,
          sourceZone:
            data.sourceZone ||
            (matchedSop
              ? `${matchedSop.area} (${zoneTypeToVietnameseLabel(matchedSop.zone_type)})`
              : undefined),
        },
        matchedSop,
        sourceSops,
      };

      if (species === 'ga') {
        setGaMessages((prev) => [...prev, assistantMsg]);
      } else {
        setHeoMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      const fallback = buildLocalRagFallback(trimmed, activeSops, species);
      const assistantMsg: ChatMessage = {
        id: `ai-fallback-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        payload: fallback.payload,
        matchedSop: fallback.matchedSop,
        sourceSops: fallback.sourceSops,
      };

      if (species === 'ga') {
        setGaMessages((prev) => [...prev, assistantMsg]);
      } else {
        setHeoMessages((prev) => [...prev, assistantMsg]);
      }
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Jump from library to AI ask
  const handleAskAiAboutSop = (species: SpeciesType, sop: SopDocument) => {
    setActiveTab(species);
    if (species === 'ga') {
      setGaSubTab('chat');
    } else {
      setHeoSubTab('chat');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleSendQuestion(species, `Quy trình thực hiện cụ thể và các điểm kiểm soát của: ${sop.title}?`);
  };

  const handleSaveSystemPrompt = (newPrompt: string) => {
    setSystemPrompt(newPrompt);
    addToast(
      'success',
      'Đã lưu cấu hình bộ máy AI',
      'Hướng dẫn bổ sung đã được áp dụng cho các câu trả lời tiếp theo.'
    );
  };

  // Role permissions
  const canAccessDocs = authUser?.role === 'admin' || authUser?.role === 'phu_admin';
  const canAccessAdmin = authUser?.role === 'admin';

  // Navigation tabs configuration
  const navTabs: { id: MainTabId; label: string; icon: any }[] = [
    { id: 'ga', label: 'Quy Trình (Gà)', icon: Layers },
    { id: 'heo', label: 'Quy Trình (Heo)', icon: Layers },
    ...(canAccessDocs ? [{ id: 'tailieu' as MainTabId, label: 'Tài Liệu', icon: FileText }] : []),
    ...(canAccessAdmin ? [{ id: 'admin' as MainTabId, label: 'Admin', icon: Settings }] : []),
  ];

  // If verifying session initially, show smooth bio-loading state
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#081C34] via-[#0B4F5A] to-[#082B49] text-white">
        <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-cyan-300/30 shadow-[0_0_50px_rgba(6,182,212,0.25)]">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-cyan-400 animate-spin flex items-center justify-center p-0.5">
            <div className="w-full h-full bg-[#081C34] rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-300" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-sm font-bold tracking-wider text-cyan-100 uppercase">
              Hệ Thống An Toàn Sinh Học
            </h2>
            <p className="text-xs text-cyan-300/70 mt-1">Đang kiểm tra chứng chỉ xác thực...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, render LoginView
  if (!token || !authUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} onNotify={addToast} />
        {/* TOAST NOTIFICATIONS */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.95, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(4px)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="pointer-events-auto rounded-2xl bg-[#081C34]/85 backdrop-blur-2xl border border-cyan-300/30 p-4 shadow-[0_8px_32px_0_rgba(6,182,212,0.28)] ring-1 ring-inset ring-white/15 flex items-start gap-3"
              >
                {t.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
                ) : t.type === 'warning' || t.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#F8FAFC]">{t.title}</div>
                  <div className="text-xs text-cyan-100/80 mt-0.5 leading-relaxed">{t.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  className="text-cyan-200/70 hover:text-[#F8FAFC] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  }

  // Authenticated Workspace
  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-[#081C34] via-[#0B4F5A] to-[#082B49] text-[#F8FAFC] overflow-x-hidden">
      {/* 1. VIBRANT AURORA MESH GRADIENT & DOT-MATRIX BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-85"
          style={{
            background:
              'radial-gradient(circle at 18% 18%, rgba(13, 148, 136, 0.45) 0%, transparent 55%), radial-gradient(circle at 82% 28%, rgba(6, 182, 212, 0.4) 0%, transparent 55%), radial-gradient(circle at 50% 85%, rgba(8, 28, 52, 0.9) 0%, #081C34 100%)',
          }}
        />

        <div
          className="animate-aurora-mint absolute -top-24 -left-20 w-[560px] h-[560px] rounded-full blur-[110px] opacity-35"
          style={{ backgroundColor: '#34D399' }}
        />

        <div
          className="animate-aurora-aqua absolute top-1/5 -right-24 w-[600px] h-[600px] rounded-full blur-[110px] opacity-35"
          style={{ backgroundColor: '#22D3EE' }}
        />

        <div
          className="animate-aurora-sky absolute -bottom-28 left-1/4 w-[640px] h-[640px] rounded-full blur-[110px] opacity-35"
          style={{ backgroundColor: '#38BDF8' }}
        />

        <div className="absolute inset-0 bg-aurora-dot-grid" />
      </div>

      {/* 2. HEADER & CORPORATE BANNER */}
      <header className="sticky top-0 z-30 bg-[#081C34]/70 backdrop-blur-2xl border-b border-cyan-300/25 shadow-[0_8px_32px_0_rgba(6,182,212,0.18)] ring-1 ring-inset ring-white/10">
        {/* Top Row: Corporate Banner */}
        <div className="border-b border-cyan-300/20 bg-gradient-to-r from-[#081C34]/60 via-[#0D9488]/25 to-[#081C34]/60 py-2.5 px-4 sm:px-6">
          <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4">
            {/* Center Logo & Title */}
            <div className="flex-1 flex justify-center">
              <motion.div
                whileHover={{ y: -1, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="relative overflow-hidden inline-flex items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-cyan-300/30 shadow-[0_0_30px_rgba(34,211,238,0.2)] ring-1 ring-inset ring-white/15"
              >
                <div
                  aria-hidden="true"
                  className="animate-banner-shimmer pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />

                <div className="relative z-10 rounded-xl bg-gradient-to-b from-white via-slate-50 to-cyan-50 p-1 border border-white shadow-[0_4px_12px_rgba(6,182,212,0.35)] shrink-0">
                  <img
                    src={THAI_VIET_LOGO}
                    alt="Logo Thái Việt"
                    className="h-8 sm:h-10 w-auto object-contain block"
                  />
                </div>

                <span className="relative z-10 text-xs sm:text-base md:text-xl font-extrabold tracking-wider uppercase text-center bg-gradient-to-r from-white via-[#E0F2FE] to-[#A5F3FC] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(34,211,238,0.35)]">
                  CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION
                </span>
              </motion.div>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                  {authUser.email}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                    authUser.role === 'admin'
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-400/40'
                      : authUser.role === 'phu_admin'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                      : authUser.role === 'nv_bio'
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
                      : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                  }`}
                >
                  {getRoleLabel(authUser.role)}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleLogout(false)}
                title="Đăng xuất"
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 border border-white/20 hover:border-rose-400/40 text-cyan-200 hover:text-rose-300 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom Row: System Title & Sliding Pill Tabs */}
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(34,211,238,0.25)] whitespace-nowrap">
              Hệ Thống An Toàn Sinh Học
            </span>
            <span className="hidden lg:inline text-xs px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-400/30">
              GÀ & HEO
            </span>
          </div>

          {/* Sliding Pill Navigation */}
          <nav
            aria-label="Điều hướng chính"
            className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-cyan-300/25 shadow-[0_4px_24px_rgba(6,182,212,0.15)]"
          >
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`relative px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? 'text-slate-950 font-black'
                      : 'text-cyan-50/85 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMainTabIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 rounded-xl shadow-lg shadow-cyan-400/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </motion.button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <main className="relative z-10 flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        <AnimatePresence mode="wait">
          {/* TAB 1: QUY TRÌNH (GÀ) */}
          {activeTab === 'ga' && (
            <motion.div
              key="tab-ga"
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.24 }}
              className="space-y-6"
            >
              {/* Species Sub-bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-cyan-300/25">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-300/30 text-xs font-black uppercase tracking-wider">
                    Phân hệ GÀ
                  </span>
                  <span className="text-xs text-cyan-200/80">
                    {gaSops.length} quy trình ATSH trang trại gà đang hoạt động
                  </span>
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setGaSubTab('chat')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      gaSubTab === 'chat'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md'
                        : 'text-cyan-200/70 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Tra Cứu Quy Trình</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGaSubTab('library')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      gaSubTab === 'library'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md'
                        : 'text-cyan-200/70 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Quy Trình Hệ Thống</span>
                  </button>
                </div>
              </div>

              {gaSubTab === 'chat' ? (
                <AssistantView
                  species="ga"
                  sops={gaSops}
                  messages={gaMessages}
                  isLoading={isLoadingChat}
                  onSendQuestion={(q) => handleSendQuestion('ga', q)}
                  onClearHistory={() => setGaMessages([])}
                  onNavigateToSopLibrary={(sopId) => {
                    setHighlightedSopId(sopId || null);
                    setGaSubTab('library');
                  }}
                />
              ) : (
                <SopLibraryView
                  species="ga"
                  sops={gaSops}
                  highlightedSopId={highlightedSopId}
                  onAskAiAboutSop={(sop) => handleAskAiAboutSop('ga', sop)}
                  canUpload={canAccessDocs}
                  onNavigateToUpload={() => setActiveTab('tailieu')}
                />
              )}
            </motion.div>
          )}

          {/* TAB 2: QUY TRÌNH (HEO) */}
          {activeTab === 'heo' && (
            <motion.div
              key="tab-heo"
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.24 }}
              className="space-y-6"
            >
              {/* Species Sub-bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-cyan-300/25">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-pink-400/20 text-pink-300 border border-pink-300/30 text-xs font-black uppercase tracking-wider">
                    Phân hệ HEO
                  </span>
                  <span className="text-xs text-cyan-200/80">
                    {heoSops.length} quy trình ATSH trang trại heo đang hoạt động
                  </span>
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setHeoSubTab('chat')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      heoSubTab === 'chat'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md'
                        : 'text-cyan-200/70 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Tra Cứu Quy Trình</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeoSubTab('library')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      heoSubTab === 'library'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-md'
                        : 'text-cyan-200/70 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Quy Trình Hệ Thống</span>
                  </button>
                </div>
              </div>

              {heoSubTab === 'chat' ? (
                <AssistantView
                  species="heo"
                  sops={heoSops}
                  messages={heoMessages}
                  isLoading={isLoadingChat}
                  onSendQuestion={(q) => handleSendQuestion('heo', q)}
                  onClearHistory={() => setHeoMessages([])}
                  onNavigateToSopLibrary={(sopId) => {
                    setHighlightedSopId(sopId || null);
                    setHeoSubTab('library');
                  }}
                />
              ) : (
                <SopLibraryView
                  species="heo"
                  sops={heoSops}
                  highlightedSopId={highlightedSopId}
                  onAskAiAboutSop={(sop) => handleAskAiAboutSop('heo', sop)}
                  canUpload={canAccessDocs}
                  onNavigateToUpload={() => setActiveTab('tailieu')}
                />
              )}
            </motion.div>
          )}

          {/* TAB 3: TÀI LIỆU (PHÓ ADMIN + ADMIN) */}
          {activeTab === 'tailieu' && canAccessDocs && (
            <motion.div
              key="tab-tailieu"
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.24 }}
            >
              <AdminPortal
                token={token}
                gaSops={gaSops}
                heoSops={heoSops}
                systemPrompt={systemPrompt}
                onSaveSystemPrompt={handleSaveSystemPrompt}
                onRefreshData={() => fetchSpeciesData(token)}
                onNotify={addToast}
                onSessionInvalid={() => handleLogout(true)}
              />
            </motion.div>
          )}

          {/* TAB 4: ADMIN (CHỈ ADMIN) */}
          {activeTab === 'admin' && canAccessAdmin && (
            <motion.div
              key="tab-admin"
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.24 }}
            >
              <UserManagementView
                token={token}
                currentUserEmail={authUser.email}
                onNotify={addToast}
                onSessionInvalid={() => handleLogout(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* QUIET GLASSMORPHIC FOOTER */}
      <footer className="relative z-10 border-t border-cyan-300/20 bg-[#081C34]/60 backdrop-blur-xl py-5 px-4 sm:px-6 mt-12">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-cyan-100/75">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION</span>
            <span aria-hidden="true">·</span>
            <span>Hệ Thống An Toàn Sinh Học Gà & Heo</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ga');
                setGaSubTab('chat');
              }}
              className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              Quy Trình Gà
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('heo');
                setHeoSubTab('chat');
              }}
              className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              Quy Trình Heo
            </button>
            {canAccessDocs && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('tailieu')}
                  className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Tài Liệu
                </button>
              </>
            )}
            {canAccessAdmin && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Quản Trị
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="pointer-events-auto rounded-2xl bg-[#081C34]/90 backdrop-blur-2xl border border-cyan-300/30 p-4 shadow-[0_8px_32px_0_rgba(6,182,212,0.28)] ring-1 ring-inset ring-white/15 flex items-start gap-3"
            >
              {t.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              ) : t.type === 'warning' || t.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#F8FAFC]">{t.title}</div>
                <div className="text-xs text-cyan-100/80 mt-0.5 leading-relaxed">{t.message}</div>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-cyan-200/70 hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
