import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BioZone,
  ChatMessage,
  ChatResponsePayload,
  SopDocument,
  ToastNotice,
} from './types/biosecurity';
import {
  DEFAULT_SYSTEM_PROMPT,
  INITIAL_SEED_SOPS,
} from './data/seedSops';
import {
  buildLocalRagFallback,
  findBestMatchingSop,
} from './utils/ragMatcher';
import { AssistantView } from './components/AssistantView';
import { SopLibraryView } from './components/SopLibraryView';
import { AdminPortal } from './components/AdminPortal';
import { LightboxModal } from './components/LightboxModal';

const STORAGE_KEYS = {
  SOPS: 'bioshield_ai_sops_v1',
  ADMIN_ID: 'thaiviet_bio_admin_id_v2',
  ADMIN_PASS: 'thaiviet_bio_admin_pass_v2',
  SYSTEM_PROMPT: 'bioshield_ai_system_prompt_v1',
  AREA_CATALOG: 'thaiviet_bio_area_catalog_v1',
};

const DEFAULT_AREA_CATALOG = [
  'Vùng Đỏ · Ngoại Vi & Trạm Rửa Xe',
  'Vùng Vàng · Nhà Tắm Sát Trùng & Cách Ly',
  'Vùng Vàng · Phòng Khử Khuẩn Vật Tư',
  'Vùng Đỏ - Vàng · Cầu Trung Chuyển Xuất Nhập Heo',
  'Vùng Xanh · Khu Sản Xuất & Chuồng Nuôi',
];

const THAI_VIET_LOGO = '/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg';

type ActiveTab = 'assistant' | 'library' | 'admin';

const NAV_TABS: { id: ActiveTab; label: string }[] = [
  { id: 'assistant', label: 'Tra Cứu Quy Trình' },
  { id: 'library', label: 'Quy Trình Hệ Thống' },
  { id: 'admin', label: 'Tài Liệu (Admin)' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('assistant');
  const [highlightedSopId, setHighlightedSopId] = useState<string | null>(null);

  // Persistent Knowledge Base SOPs (Pre-loaded with 5 seed SOPs if empty)
  const [sops, setSops] = useState<SopDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to seed data
    }
    return INITIAL_SEED_SOPS;
  });

  const [adminId, setAdminId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_ID) || 'Admin';
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PASS) || 'adminbio';
  });

  const [areaCatalog, setAreaCatalog] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AREA_CATALOG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_AREA_CATALOG;
  });

  const handleUpdateAreaCatalog = useCallback((nextCatalog: string[]) => {
    setAreaCatalog(nextCatalog);
    try {
      localStorage.setItem(STORAGE_KEYS.AREA_CATALOG, JSON.stringify(nextCatalog));
    } catch {
      // ignore
    }
  }, []);

  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT) || DEFAULT_SYSTEM_PROMPT;
  });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Lightbox state
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    zoneLabel?: string;
    zone?: BioZone;
    caption?: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // Toast notification state
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const addToast = useCallback(
    (type: ToastNotice['type'], title: string, message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  // Sync SOPs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOPS, JSON.stringify(sops));
    } catch {
      // Ignore quota errors
    }
  }, [sops]);

  const handleOpenLightbox = (img: {
    url: string;
    title: string;
    zoneLabel?: string;
    zone?: BioZone;
    caption?: string;
  }) => {
    setLightboxData({
      isOpen: true,
      url: img.url,
      title: img.title,
      zoneLabel: img.zoneLabel,
      zone: img.zone,
      caption: img.caption,
    });
  };

  const handleSendQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

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

    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingChat(true);

    try {
      const response = await fetch('/api/biosecurity/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          activeSops: sops.filter((s) => s.active),
          customSystemInstruction: systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as ChatResponsePayload;

      // Resolve matched SOP for visual illustration card
      let matchedSop: SopDocument | undefined;
      if (data.matchedSopId) {
        matchedSop = sops.find((s) => s.id === data.matchedSopId && s.active);
      }
      if (!matchedSop && !data.isOutOfScope) {
        const localBest = findBestMatchingSop(trimmed, sops);
        if (localBest.score >= 12) {
          matchedSop = localBest.sop;
        }
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        payload: data,
        matchedSop,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Seamless local RAG fallback so field staff always get accurate SOP instructions
      const fallback = buildLocalRagFallback(trimmed, sops);
      const assistantMsg: ChatMessage = {
        id: `ai-fallback-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        payload: fallback.payload,
        matchedSop: fallback.matchedSop,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleAskAiAboutSop = (sop: SopDocument) => {
    setActiveTab('assistant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleSendQuestion(`Hướng dẫn chi tiết và thông số kỹ thuật của: ${sop.title}?`);
  };

  // Admin handlers
  const handleSaveSop = (sop: SopDocument, isEdit: boolean) => {
    if (isEdit) {
      setSops((prev) => prev.map((item) => (item.id === sop.id ? sop : item)));
      addToast(
        'success',
        'Đã cập nhật quy trình SOP',
        `Quy trình "${sop.title}" đã được cập nhật vào bộ nhớ AI.`
      );
    } else {
      setSops((prev) => [sop, ...prev]);
      addToast(
        'success',
        'Đã nạp quy trình mới cho Bot',
        `Quy trình "${sop.title}" đã sẵn sàng để AI tra cứu và giải đáp.`
      );
    }
  };

  const handleDeleteSop = (id: string) => {
    const target = sops.find((s) => s.id === id);
    setSops((prev) => prev.filter((item) => item.id !== id));
    addToast(
      'info',
      'Đã xóa quy trình',
      target ? `Đã xóa "${target.title}" khỏi Knowledge Base.` : 'Đã xóa quy trình.'
    );
  };

  const handleToggleActiveSop = (id: string) => {
    setSops((prev) =>
      prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item))
    );
  };

  const handleBulkAddSops = (importedSops: SopDocument[], replaceAll = false) => {
    if (replaceAll) {
      setSops(importedSops);
      addToast(
        'success',
        'Đã khôi phục dữ liệu Knowledge Base',
        `Đã nạp ${importedSops.length} quy trình từ file sao lưu.`
      );
    } else {
      setSops((prev) => [...importedSops, ...prev]);
      addToast(
        'success',
        'Nạp hàng loạt thành công',
        `Đã bổ sung thêm ${importedSops.length} quy trình mới vào bộ nhớ AI.`
      );
    }
  };

  const handleResetSeedData = () => {
    setSops(INITIAL_SEED_SOPS);
    addToast(
      'info',
      'Đã khôi phục 5 quy trình gốc',
      'Bộ nhớ AI đã được đặt lại về 5 quy trình An toàn sinh học trại heo tiêu chuẩn.'
    );
  };

  const handleSaveSystemPrompt = (newPrompt: string) => {
    setSystemPrompt(newPrompt);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, newPrompt);
    addToast(
      'success',
      'Đã lưu cấu hình AI Engine',
      'System Prompt bổ sung đã được áp dụng cho các câu trả lời tiếp theo.'
    );
  };

  const handleChangeCredentials = (newId: string, newPass: string) => {
    setAdminId(newId);
    setAdminPassword(newPass);
    localStorage.setItem(STORAGE_KEYS.ADMIN_ID, newId);
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, newPass);
    addToast('success', 'Đã cập nhật tài khoản Admin', 'ID và mật khẩu quản trị mới đã được lưu.');
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-[#081C34] via-[#0B4F5A] to-[#082B49] text-[#F8FAFC] overflow-x-hidden">
      {/* 1. VIBRANT AURORA MESH GRADIENT & DOT-MATRIX BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Vibrant Ocean / Teal / Cyan Base Gradient Layer */}
        <div
          className="absolute inset-0 opacity-85"
          style={{
            background:
              'radial-gradient(circle at 18% 18%, rgba(13, 148, 136, 0.45) 0%, transparent 55%), radial-gradient(circle at 82% 28%, rgba(6, 182, 212, 0.4) 0%, transparent 55%), radial-gradient(circle at 50% 85%, rgba(8, 28, 52, 0.9) 0%, #081C34 100%)',
          }}
        />

        {/* Aurora Orb 1: Mint Green (#34D399) */}
        <div
          className="animate-aurora-mint absolute -top-24 -left-20 w-[560px] h-[560px] rounded-full blur-[110px] opacity-35"
          style={{ backgroundColor: '#34D399' }}
        />

        {/* Aurora Orb 2: Aqua (#22D3EE) */}
        <div
          className="animate-aurora-aqua absolute top-1/5 -right-24 w-[600px] h-[600px] rounded-full blur-[110px] opacity-35"
          style={{ backgroundColor: '#22D3EE' }}
        />

        {/* Aurora Orb 3: Sky Blue (#38BDF8) */}
        <div
          className="animate-aurora-sky absolute -bottom-28 left-1/4 w-[640px] h-[640px] rounded-full blur-[110px] opacity-35"
          style={{ backgroundColor: '#38BDF8' }}
        />

        {/* Crisp Modern Dot-Matrix Grid Overlay (radial-gradient white opacity 0.07) */}
        <div className="absolute inset-0 bg-aurora-dot-grid" />
      </div>

      {/* 2. HEADER & CORPORATE BANNER (VIBRANT BIO-AURORA GLASSMORPHISM) */}
      <header className="sticky top-0 z-20 bg-[#081C34]/55 backdrop-blur-2xl border-b border-cyan-300/25 shadow-[0_8px_32px_0_rgba(6,182,212,0.18)] ring-1 ring-inset ring-white/10">
        {/* Top Row: Clear Frosted Glass Box with Shimmer & Gradient Text for CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION */}
        <div className="border-b border-cyan-300/20 bg-gradient-to-r from-[#081C34]/60 via-[#0D9488]/25 to-[#081C34]/60 py-3 px-4 sm:px-6">
          <div className="max-w-[1380px] mx-auto flex justify-center">
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative overflow-hidden inline-flex items-center justify-center gap-4 px-5 sm:px-8 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-cyan-300/30 shadow-[0_0_35px_rgba(34,211,238,0.2)] ring-1 ring-inset ring-white/15"
            >
              {/* Shimmer Sweep Effect across the Banner */}
              <div
                aria-hidden="true"
                className="animate-banner-shimmer pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />

              <div className="relative z-10 rounded-xl bg-gradient-to-b from-white via-slate-50 to-cyan-50 p-1.5 border border-white shadow-[0_6px_16px_rgba(6,182,212,0.35),inset_0_2px_1px_rgba(255,255,255,1)] shrink-0">
                <img
                  src={THAI_VIET_LOGO}
                  alt="Logo Công Ty Cổ Phần Thái Việt Corporation"
                  className="h-10 sm:h-12 w-auto object-contain block"
                />
              </div>

              <span className="relative z-10 text-base sm:text-xl md:text-2xl font-extrabold tracking-wider uppercase text-center bg-gradient-to-r from-white via-[#E0F2FE] to-[#A5F3FC] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(34,211,238,0.35)]">
                CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION
              </span>
            </motion.div>
          </div>
        </div>

        {/* Bottom Row: Hệ Thống An Toàn Sinh Học + Vibrant Gradient Navigation Tabs + Primary Action */}
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: System Title */}
          <motion.a
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('assistant');
            }}
            className="text-base sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(34,211,238,0.25)] whitespace-nowrap shrink-0"
          >
            Hệ Thống An Toàn Sinh Học
          </motion.a>

          {/* Zone 2: Sliding Pill Navigation Tabs */}
          <nav
            aria-label="Điều hướng chính"
            className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-cyan-300/25 shadow-[0_4px_24px_rgba(6,182,212,0.15)]"
          >
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (tab.id === 'library') {
                      setHighlightedSopId(null);
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer hover:scale-105 transition-all duration-300 ${
                    isActive
                      ? 'text-slate-950'
                      : 'text-cyan-50/85 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 rounded-xl shadow-lg shadow-cyan-400/30"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </motion.button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action ("Nạp Quy Trình SOP") */}
          <div className="hidden sm:flex items-center shrink-0">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => {
                if (activeTab !== 'admin') {
                  setActiveTab('admin');
                } else {
                  setActiveTab('assistant');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-400/30 hover:scale-105 transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeTab === 'admin' ? 'Quay Lại Tra Cứu' : 'Nạp Quy Trình SOP'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTAINER WITH POWERPOINT MORPH PAGE TRANSITION */}
      <main className="relative z-10 flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15, scale: 0.98, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, scale: 0.98, filter: 'blur(6px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === 'assistant' && (
              <AssistantView
                sops={sops}
                messages={messages}
                isLoading={isLoadingChat}
                onSendQuestion={handleSendQuestion}
                onClearHistory={() => setMessages([])}
                onOpenLightbox={handleOpenLightbox}
                onNavigateToSopLibrary={(sopId) => {
                  setHighlightedSopId(sopId || null);
                  setActiveTab('library');
                }}
              />
            )}

            {activeTab === 'library' && (
              <SopLibraryView
                sops={sops}
                areaCatalog={areaCatalog}
                highlightedSopId={highlightedSopId}
                onAskAiAboutSop={handleAskAiAboutSop}
                onOpenLightbox={handleOpenLightbox}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPortal
                sops={sops}
                areaCatalog={areaCatalog}
                onUpdateAreaCatalog={handleUpdateAreaCatalog}
                isUnlocked={isAdminUnlocked}
                adminId={adminId}
                adminPassword={adminPassword}
                systemPrompt={systemPrompt}
                onUnlock={() => setIsAdminUnlocked(true)}
                onLock={() => setIsAdminUnlocked(false)}
                onBackToMain={() => setActiveTab('assistant')}
                onChangeCredentials={handleChangeCredentials}
                onSaveSop={handleSaveSop}
                onDeleteSop={handleDeleteSop}
                onToggleActiveSop={handleToggleActiveSop}
                onBulkAddSops={handleBulkAddSops}
                onResetSeedData={handleResetSeedData}
                onSaveSystemPrompt={handleSaveSystemPrompt}
                onNotify={addToast}
                onOpenLightbox={handleOpenLightbox}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* QUIET GLASSMORPHIC FOOTER */}
      <footer className="relative z-10 border-t border-cyan-300/20 bg-[#081C34]/50 backdrop-blur-xl py-5 px-4 sm:px-6 mt-12">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-cyan-100/75">
          <div>
            CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION — Hệ Thống An Toàn Sinh Học
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              Tra Cứu Quy Trình
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              Quy Trình Hệ Thống
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              Tài Liệu (Admin)
            </button>
          </div>
        </div>
      </footer>

      {/* LIGHTBOX MODAL FOR HIGH-RES SOP IMAGES */}
      <LightboxModal
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.url}
        title={lightboxData.title}
        zoneLabel={lightboxData.zoneLabel}
        zone={lightboxData.zone}
        caption={lightboxData.caption}
        onClose={() => setLightboxData((prev) => ({ ...prev, isOpen: false }))}
      />

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
    </div>
  );
}
