import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-[#0B1120] text-[#F8FAFC]">
      {/* TOP CORPORATE BANNER + NAVIGATION BAR */}
      <header className="sticky top-0 z-20 bg-[#0B1120]/95 backdrop-blur-md border-b border-white/10">
        {/* Top Row: 3D Prominent Box for Logo & CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION (Centered) */}
        <div className="border-b border-white/10 bg-gradient-to-b from-[#0E172A] to-[#060A12] py-3 px-4 sm:px-6">
          <div className="max-w-[1380px] mx-auto flex justify-center">
            <div className="inline-flex items-center justify-center gap-4 px-5 sm:px-8 py-2.5 rounded-2xl bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#090E1A] border border-cyan-400/40 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.9),0_4px_18px_-2px_rgba(6,182,212,0.3),inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-3px_6px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 transition-transform duration-150">
              <div className="rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-200 p-1.5 border border-white shadow-[0_6px_14px_rgba(0,0,0,0.65),inset_0_2px_1px_rgba(255,255,255,1),inset_0_-2px_3px_rgba(148,163,184,0.7)] shrink-0">
                <img
                  src={THAI_VIET_LOGO}
                  alt="Logo Công Ty Cổ Phần Thái Việt Corporation"
                  className="h-10 sm:h-12 w-auto object-contain block"
                />
              </div>
              <span className="text-base sm:text-xl md:text-2xl font-extrabold tracking-wider text-white uppercase text-center [text-shadow:0_1px_0_#94a3b8,0_2px_0_#475569,0_5px_10px_rgba(0,0,0,0.9)]">
                CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Hệ Thống An Toàn Sinh Học + Navigation Tabs + Primary Action */}
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: System Title */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('assistant');
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-cyan-400 whitespace-nowrap shrink-0"
          >
            Hệ Thống An Toàn Sinh Học
          </a>

          {/* Zone 2: Navigation Tabs (No scrollbar) */}
          <nav className="flex flex-wrap items-center gap-5 sm:gap-7 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'assistant'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2 decoration-cyan-400 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tra Cứu Quy Trình
            </button>
            <button
              type="button"
              onClick={() => {
                setHighlightedSopId(null);
                setActiveTab('library');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'library'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2 decoration-cyan-400 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Quy Trình Hệ Thống
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'admin'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2 decoration-cyan-400 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Nạp ( Admin )
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="hidden sm:flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTab !== 'admin') {
                  setActiveTab('admin');
                } else {
                  setActiveTab('assistant');
                }
              }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-slate-950 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeTab === 'admin' ? 'Quay Lại Tra Cứu' : 'Nạp Quy Trình SOP'}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
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
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-white/10 bg-[#0B1120] py-5 px-4 sm:px-6 mt-12">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION — Hệ Thống An Toàn Sinh Học
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Tra Cứu Quy Trình
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Quy Trình Hệ Thống
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Nạp ( Admin )
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
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-xl bg-[#0F172A] border border-white/15 p-4 shadow-2xl flex items-start gap-3"
            >
              {t.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : t.type === 'warning' || t.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white">{t.title}</div>
                <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{t.message}</div>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
