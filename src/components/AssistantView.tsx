import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import {
  Send,
  Sparkles,
  RotateCcw,
  ZoomIn,
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
import { ResilientImage } from './ResilientImage';

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
    <div>
      {/* BIOSECURITY CHATBOX */}
      <section
        aria-labelledby="ai-chatbox-heading"
        className="rounded-xl bg-[#1E293B]/75 backdrop-blur-md border border-white/10 overflow-hidden"
      >
        {/* Chat Header */}
        <div className="px-5 py-4 bg-[#0F172A] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shrink-0">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 id="ai-chatbox-heading" className="text-base font-bold text-white">
                Tra Cứu Quy Trình
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Đối chiếu trực tiếp từ {activeSopCount} quy trình chuẩn trong bộ nhớ Admin</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Làm mới phiên tra cứu
              </button>
            )}
          </div>
        </div>

        {/* Conversation Feed */}
        <div className="p-5 space-y-6 min-h-[320px] max-h-[680px] overflow-y-auto bg-[#0B1120]/40 flex flex-col justify-center">
          {messages.length === 0 && !isLoading ? (
            <div className="py-14 px-4 text-center max-w-xl mx-auto space-y-4">
              <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-200 border border-white shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_1px_rgba(255,255,255,1)] mx-auto">
                <img
                  src="/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg"
                  alt="Logo Công Ty Cổ Phần Thái Việt Corporation"
                  className="h-14 sm:h-16 w-auto object-contain block"
                />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-white">
                Tôi có thể giải đáp về quy trình nào cho Bạn ?
              </h3>
            </div>
          ) : (
            <div className="space-y-6 w-full">
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-2xl rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-white shadow-sm">
                        <div className="flex items-center justify-between gap-4 text-[11px] text-cyan-100/90 font-mono mb-1">
                          <span>NHÂN SỰ TRẠI TRA CỨU</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="text-sm md:text-base font-medium leading-relaxed">{msg.question}</p>
                      </div>
                    </div>
                  );
                }

                const payload = msg.payload;
                if (!payload) return null;

                const zoneStyle = getZoneSemanticStyle(payload.zone);
                const matchedSop = msg.matchedSop;

                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="w-full max-w-4xl rounded-xl bg-[#0F172A] border border-white/15 overflow-hidden space-y-0">
                      {/* 1. Zone Classification Header */}
                      <div className="px-5 py-3.5 bg-[#0B1120] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`font-bold ${zoneStyle.textColor}`}>
                            {zoneStyle.glyph} PHÂN VÙNG ÁP DỤNG: {(matchedSop?.zoneLabel || payload.zoneLabel).toUpperCase()}
                          </span>
                          {matchedSop && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="font-mono text-slate-300">MÃ SOP: {matchedSop.code}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                          {payload.isOutOfScope ? (
                            <span className="text-amber-400 font-medium">
                              ▲ NGOÀI DỮ LIỆU CHUẨN ADMIN
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
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
                          <h3 className="text-lg font-bold text-white leading-snug">
                            {payload.summaryTitle}
                          </h3>
                        </div>

                        {/* Key Quantitative Metrics Strip */}
                        {payload.keyMetrics && payload.keyMetrics.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {payload.keyMetrics.map((metric, idx) => (
                              <div
                                key={`${metric.label}-${idx}`}
                                className="p-3 rounded-lg bg-[#1E293B]/70 border border-white/10"
                              >
                                <div className="text-[11px] text-slate-400 truncate">{metric.label}</div>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                  <span className="text-lg font-bold font-mono text-cyan-300 tabular-nums">
                                    {metric.value}
                                  </span>
                                  <span className="text-xs font-mono text-slate-400">{metric.unit}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 2. Step-by-Step Standard Procedure (Markdown) */}
                        <div className="space-y-2">
                          <div className="text-xs font-mono text-cyan-400 tracking-wide">
                            CÁC BƯỚC THỰC HIỆN CHUẨN & THÔNG SỐ KỸ THUẬT:
                          </div>
                          <div
                            className="sop-markdown rounded-lg bg-[#1E293B]/45 border border-white/10 p-4"
                            dangerouslySetInnerHTML={renderMarkdownHtml(payload.stepsMarkdown)}
                          />
                        </div>

                        {/* 3. Critical Biosecurity Warning Box */}
                        {payload.criticalWarning && (
                          <div className="rounded-lg bg-red-950/35 border border-red-500/40 p-4 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>CẢNH BÁO RỦI RO · LƯU Ý SỐNG CÒN VỀ AN TOÀN SINH HỌC</span>
                            </div>
                            <p className="text-sm text-red-100/95 leading-relaxed">
                              {payload.criticalWarning}
                            </p>
                          </div>
                        )}

                        {/* 4. Visual SOP Illustration Card (if matched SOP has image) */}
                        {matchedSop && matchedSop.imageUrl && (
                          <div className="rounded-xl bg-[#0B1120] border border-white/15 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs text-slate-300">
                                <span className="font-semibold text-white">
                                  Hình Ảnh Minh Họa Quy Trình Chuẩn
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-cyan-400">{matchedSop.code}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => onNavigateToSopLibrary(matchedSop.id)}
                                  className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  Mở trong Quy Trình Hệ Thống
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenLightbox({
                                      url: matchedSop.imageUrl,
                                      title: matchedSop.title,
                                      zoneLabel: matchedSop.zoneLabel,
                                      zone: matchedSop.zone,
                                      caption: matchedSop.summary,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  <ZoomIn className="w-3.5 h-3.5" />
                                  Phóng to (Lightbox)
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                              <div className="md:col-span-7 h-56 md:h-64">
                                <ResilientImage
                                  src={matchedSop.imageUrl}
                                  alt={matchedSop.title}
                                  zone={matchedSop.zone}
                                  containerClassName="w-full h-full relative overflow-hidden"
                                  className="w-full h-full object-cover"
                                  showExpandHint={true}
                                  onExpandClick={() =>
                                    onOpenLightbox({
                                      url: matchedSop.imageUrl,
                                      title: matchedSop.title,
                                      zoneLabel: matchedSop.zoneLabel,
                                      zone: matchedSop.zone,
                                      caption: matchedSop.summary,
                                    })
                                  }
                                />
                              </div>
                              <div className="md:col-span-5 p-4 flex flex-col justify-between bg-[#0F172A]/80">
                                <div className="space-y-2">
                                  <div className={`text-xs font-semibold ${zoneStyle.textColor}`}>
                                    {zoneStyle.glyph} {matchedSop.zoneLabel}
                                  </div>
                                  <h4 className="text-sm font-semibold text-white leading-snug">
                                    {matchedSop.title}
                                  </h4>
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                    {matchedSop.summary}
                                  </p>
                                </div>
                                <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                  <span>Nhấn vào ảnh để xem kích thước lớn</span>
                                  <span className="text-cyan-400">LIGHTBOX HD</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="w-full max-w-3xl rounded-xl bg-[#0F172A] border border-cyan-500/30 p-5 space-y-3">
                    <div className="flex items-center gap-2.5 text-xs font-mono text-cyan-400">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>ĐANG ĐỐI CHIẾU DỮ LIỆU QUY TRÌNH TRONG HỆ THỐNG...</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-4 bg-slate-800 rounded w-1/2" />
                      <div className="h-20 bg-slate-800/60 rounded w-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-[#0F172A] border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Nhập nội dung quy trình an toàn sinh học cần tra cứu..."
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-400 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputQuestion.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Tra Cứu Quy Trình</span>
          </button>
        </form>
      </section>
    </div>
  );
};
