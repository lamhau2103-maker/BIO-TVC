import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  BioZone,
  ChatMessage,
  SopDocument,
} from '../types/biosecurity';
import { getZoneSemanticStyle } from '../utils/ragMatcher';

interface AssistantViewProps {
  sops: SopDocument[];
  messages: ChatMessage[];
  isLoading: boolean;
  onSendQuestion: (question: string) => void;
  onClearHistory: () => void;
  onOpenLightbox: (img: {
    url: string;
    title: string;
    zoneLabel?: string;
    zone?: BioZone;
    caption?: string;
  }) => void;
  onNavigateToSopLibrary: (sopId?: string) => void;
}

// 14 Pure-CSS Floating Bio-Particles inside the Chat Frame
const BIO_PARTICLES = [
  { id: 1, top: '12%', left: '8%', size: 5, color: 'bg-teal-300/60', duration: '9s', delay: '0s' },
  { id: 2, top: '24%', left: '19%', size: 4, color: 'bg-white/50', duration: '11s', delay: '1.2s' },
  { id: 3, top: '68%', left: '11%', size: 6, color: 'bg-emerald-300/55', duration: '13s', delay: '2.4s' },
  { id: 4, top: '82%', left: '25%', size: 4, color: 'bg-cyan-300/60', duration: '10s', delay: '0.7s' },
  { id: 5, top: '18%', left: '36%', size: 5, color: 'bg-white/45', duration: '12s', delay: '3.1s' },
  { id: 6, top: '46%', left: '28%', size: 3.5, color: 'bg-teal-200/55', duration: '8.5s', delay: '1.8s' },
  { id: 7, top: '14%', left: '66%', size: 5.5, color: 'bg-emerald-300/60', duration: '11.5s', delay: '0.4s' },
  { id: 8, top: '34%', left: '78%', size: 4, color: 'bg-white/50', duration: '9.5s', delay: '2.7s' },
  { id: 9, top: '58%', left: '72%', size: 6, color: 'bg-cyan-300/55', duration: '12.5s', delay: '1.5s' },
  { id: 10, top: '76%', left: '84%', size: 4.5, color: 'bg-teal-300/60', duration: '10.5s', delay: '3.6s' },
  { id: 11, top: '22%', left: '91%', size: 4, color: 'bg-white/45', duration: '13.5s', delay: '0.9s' },
  { id: 12, top: '62%', left: '89%', size: 5, color: 'bg-emerald-200/55', duration: '9.8s', delay: '2.1s' },
  { id: 13, top: '85%', left: '61%', size: 4, color: 'bg-cyan-200/50', duration: '11.2s', delay: '1.1s' },
  { id: 14, top: '40%', left: '14%', size: 4.5, color: 'bg-teal-300/50', duration: '10.8s', delay: '2.9s' },
];

export const AssistantView: React.FC<AssistantViewProps> = ({
  sops,
  messages,
  isLoading,
  onSendQuestion,
  onClearHistory,
  onOpenLightbox,
  onNavigateToSopLibrary,
}) => {
  const [inputQuestion, setInputQuestion] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSopCount = sops.filter((s) => s.active).length;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputQuestion.trim();
    if (!trimmed || isLoading) return;
    onSendQuestion(trimmed);
    setInputQuestion('');
  };

  const renderMarkdownHtml = (mdText: string) => {
    const rawHtml = marked.parse(mdText, { async: false }) as string;
    return { __html: rawHtml };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* VIBRANT BIO-AURORA GLASSMORPHISM CHATBOX */}
      <section
        aria-labelledby="ai-chatbox-heading"
        className="relative rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 hover:border-cyan-300/40 shadow-[0_12px_45px_0_rgba(6,182,212,0.18)] ring-1 ring-inset ring-white/10 transition-colors duration-300 overflow-hidden"
      >
        {/* Top Edge Luminous Gradient Line */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-90 shadow-[0_0_20px_rgba(103,232,249,0.85)] z-20 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-2/3 h-12 bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent blur-xl pointer-events-none z-10"
        />

        {/* Chat Header */}
        <div className="relative z-10 px-6 py-4 bg-white/[0.05] backdrop-blur-xl border-b border-teal-300/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-400/30 shrink-0">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 id="ai-chatbox-heading" className="text-base font-bold text-[#F8FAFC]">
                Tra Cứu Quy Trình
              </h2>
              <div className="flex items-center gap-2 text-xs text-cyan-100/80">
                <span>Đối chiếu trực tiếp từ {activeSopCount} quy trình chuẩn trong bộ nhớ Admin</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClearHistory}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-[#F8FAFC] border border-cyan-300/30 hover:border-emerald-300/50 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-300" />
                Làm mới phiên tra cứu
              </motion.button>
            )}
          </div>
        </div>

        {/* Conversation Feed with Floating Bio-Particles */}
        <div className="relative p-6 space-y-6 min-h-[400px] max-h-[680px] overflow-y-auto bg-gradient-to-b from-[#081C34]/35 via-[#0D9488]/10 to-[#081C34]/45 flex flex-col justify-center">
          {/* 14 Pure-CSS Floating Bio-Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
            {BIO_PARTICLES.map((p) => (
              <span
                key={p.id}
                className={`animate-bio-particle absolute rounded-full ${p.color} shadow-[0_0_10px_rgba(52,211,153,0.65)]`}
                style={{
                  top: p.top,
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 w-full">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && !isLoading ? (
                <motion.div
                  key="empty-chat-greeting"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="py-14 px-4 text-center max-w-2xl mx-auto flex flex-col items-center justify-center space-y-7"
                >
                  {/* 4. VISUAL FOCAL POINT: 3D LOGO ENERGY CORE WITH 3 CONCENTRIC BIO-SHIELD RINGS */}
                  <div className="relative flex items-center justify-center w-44 h-44 sm:w-48 sm:h-48 mx-auto">
                    {/* Ring 3 (Outermost): Slow 4s Radar Wave Ping with opacity-20 teal/emerald */}
                    <div
                      aria-hidden="true"
                      className="animate-radar-ping-4s absolute inset-0 rounded-full bg-teal-400/20 border-2 border-emerald-300/35 pointer-events-none"
                    />

                    {/* Subtle secondary ambient halo behind the rings */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-3 rounded-full bg-gradient-to-tr from-emerald-400/20 via-teal-300/15 to-cyan-400/20 blur-xl pointer-events-none"
                    />

                    {/* Ring 2 (Middle): Dashed Circular Ring rotating slowly clockwise (20s) */}
                    <div
                      aria-hidden="true"
                      className="animate-spin-20s absolute inset-2 sm:inset-2.5 rounded-full border-2 border-dashed border-cyan-300/30 pointer-events-none"
                    />

                    {/* Floating Center Logo Container (4s gentle up-and-down float) */}
                    <div className="animate-float relative z-10 flex items-center justify-center">
                      {/* Ring 1 (Hugging the Logo): Glowing Cyan-Emerald border hugging the logo corners */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-white via-slate-50 to-cyan-50 border-2 border-cyan-300/80 ring-2 ring-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.45),0_10px_25px_rgba(6,182,212,0.3)]">
                        <img
                          src="/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg"
                          alt="Logo Công Ty Cổ Phần Thái Việt Corporation"
                          className="h-14 sm:h-16 w-auto object-contain block"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Luminous Greeting Text (Strictly NO Quick Suggestion Cards) */}
                  <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-white tracking-wide drop-shadow-[0_2px_10px_rgba(34,211,238,0.3)]">
                    Tôi có thể giải đáp về quy trình nào cho Bạn ?
                  </h3>
                </motion.div>
              ) : (
                <motion.div
                  key="active-chat-feed"
                  className="space-y-6 w-full"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05 },
                    },
                  }}
                >
                  {messages.map((msg) => {
                    if (msg.role === 'user') {
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                          className="flex justify-end"
                        >
                          <div className="max-w-2xl rounded-2xl bg-gradient-to-r from-emerald-500/35 via-teal-500/30 to-cyan-500/35 backdrop-blur-xl border border-cyan-300/40 px-5 py-3.5 text-[#F8FAFC] shadow-[0_8px_32px_0_rgba(6,182,212,0.25)] ring-1 ring-inset ring-white/15">
                            <div className="flex items-center justify-between gap-4 text-[11px] text-cyan-100 font-mono mb-1">
                              <span>NHÂN SỰ TRẠI TRA CỨU</span>
                              <span>{msg.timestamp}</span>
                            </div>
                            <p className="text-sm md:text-base font-medium leading-relaxed">
                              {msg.question}
                            </p>
                          </div>
                        </motion.div>
                      );
                    }

                    const payload = msg.payload;
                    if (!payload) return null;

                    const zoneStyle = getZoneSemanticStyle(payload.zone);
                    const matchedSop = msg.matchedSop;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                        className="flex justify-start"
                      >
                        <div className="w-full max-w-4xl rounded-2xl bg-slate-900/55 backdrop-blur-2xl border border-teal-300/25 hover:border-cyan-300/45 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/10 overflow-hidden transition-colors">
                          {/* 1. Zone Classification Header */}
                          <div className="px-5 py-3.5 bg-white/[0.04] border-b border-teal-300/20 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2.5 text-xs">
                              <span className={`px-3 py-1 rounded-lg font-bold ${zoneStyle.badgeClass}`}>
                                {zoneStyle.glyph} PHÂN VÙNG ÁP DỤNG:{' '}
                                {(matchedSop?.zoneLabel || payload.zoneLabel).toUpperCase()}
                              </span>
                              {matchedSop && (
                                <span className="font-mono text-cyan-200/80">
                                  MÃ SOP: {matchedSop.code}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-cyan-100/80 font-mono">
                              {payload.isOutOfScope ? (
                                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/35 text-amber-200 font-medium">
                                  ▲ NGOÀI DỮ LIỆU CHUẨN ADMIN
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 font-medium flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  ĐÃ ĐỐI CHIẾU KNOWLEDGE BASE
                                </span>
                              )}
                              <span aria-hidden="true">·</span>
                              <span>{msg.timestamp}</span>
                            </div>
                          </div>

                          <div className="p-5 space-y-5">
                            {/* Title */}
                            <div>
                              <h3 className="text-lg font-bold text-[#F8FAFC] leading-snug">
                                {payload.summaryTitle}
                              </h3>
                            </div>

                            {/* Key Quantitative Metrics Strip */}
                            {payload.keyMetrics && payload.keyMetrics.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {payload.keyMetrics.map((metric, idx) => (
                                  <motion.div
                                    key={`${metric.label}-${idx}`}
                                    whileHover={{ y: -3, scale: 1.01 }}
                                    className="p-3 rounded-xl bg-white/[0.06] backdrop-blur-md border border-teal-300/20 hover:border-cyan-300/45 ring-1 ring-inset ring-white/5 transition-colors"
                                  >
                                    <div className="text-[11px] text-cyan-100/75 truncate">
                                      {metric.label}
                                    </div>
                                    <div className="mt-1 flex items-baseline gap-1.5">
                                      <span className="text-lg font-bold font-mono text-emerald-300 tabular-nums">
                                        {metric.value}
                                      </span>
                                      <span className="text-xs font-mono text-cyan-100/70">
                                        {metric.unit}
                                      </span>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}

                            {/* 2. Step-by-Step Standard Procedure (Markdown) */}
                            <div className="space-y-2">
                              <div className="text-xs font-mono text-emerald-300 tracking-wide">
                                CÁC BƯỚC THỰC HIỆN CHUẨN & THÔNG SỐ KỸ THUẬT:
                              </div>
                              <div
                                className="sop-markdown rounded-xl bg-white/[0.04] backdrop-blur-md border border-teal-300/20 p-4"
                                dangerouslySetInnerHTML={renderMarkdownHtml(payload.stepsMarkdown)}
                              />
                            </div>

                            {/* 3. Critical Biosecurity Warning Box */}
                            {payload.criticalWarning && (
                              <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 p-4 space-y-1.5 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                                <div className="flex items-center gap-2 text-xs font-bold text-rose-200">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <span>CẢNH BÁO RỦI RO · LƯU Ý SỐNG CÒN VỀ AN TOÀN SINH HỌC</span>
                                </div>
                                <p className="text-sm text-rose-100/95 leading-relaxed">
                                  {payload.criticalWarning}
                                </p>
                              </div>
                            )}

                            {/* 4. Text-only Reference Link (No images per user requirement) */}
                            {matchedSop && (
                              <div className="pt-3 border-t border-teal-300/20 flex flex-wrap items-center justify-between gap-3 text-xs text-cyan-100/80">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-semibold text-[#F8FAFC] shrink-0">
                                    Quy trình đối chiếu:
                                  </span>
                                  <span className="font-mono text-emerald-300 shrink-0">
                                    [{matchedSop.code}]
                                  </span>
                                  <span className="text-[#F8FAFC] truncate">{matchedSop.title}</span>
                                </div>
                                <motion.button
                                  type="button"
                                  whileHover={{ y: -1, scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => onNavigateToSopLibrary(matchedSop.id)}
                                  className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-cyan-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  Xem toàn văn trong Quy Trình Hệ Thống
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="w-full max-w-3xl rounded-2xl bg-slate-900/50 backdrop-blur-2xl border border-emerald-300/35 p-5 space-y-3 shadow-[0_8px_32px_0_rgba(6,182,212,0.2)]">
                        <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-300">
                          <Sparkles className="w-4 h-4 animate-spin" />
                          <span>ĐANG ĐỐI CHIẾU DỮ LIỆU QUY TRÌNH TRONG HỆ THỐNG...</span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-white/[0.08] rounded w-3/4 animate-pulse" />
                          <div className="h-4 bg-white/[0.08] rounded w-1/2 animate-pulse" />
                          <div className="h-20 bg-white/[0.05] rounded w-full animate-pulse" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* 5. PROMINENT GLASSMORPHIC CHAT INPUT BAR */}
        <form
          onSubmit={handleSubmit}
          className="relative z-10 p-4 bg-white/[0.05] backdrop-blur-xl border-t border-teal-300/25 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1 rounded-xl bg-white/10 backdrop-blur-md border border-cyan-300/30 focus-within:border-emerald-300 focus-within:shadow-[0_0_25px_rgba(52,211,153,0.35)] transition-all duration-300">
            <input
              ref={inputRef}
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Nhập nội dung quy trình an toàn sinh học cần tra cứu..."
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-transparent focus:outline-none text-sm text-[#F8FAFC] placeholder-cyan-100/65 disabled:opacity-60"
            />
          </div>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            disabled={isLoading || !inputQuestion.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-400/30 hover:scale-105 transition-all duration-300 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Tra Cứu Quy Trình</span>
          </motion.button>
        </form>
      </section>
    </motion.div>
  );
};
