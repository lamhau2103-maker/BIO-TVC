import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  MessageSquarePlus,
  BookOpen,
  ZoomIn,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { BioZone, SopDocument } from '../types/biosecurity';
import { getZoneSemanticStyle } from '../utils/ragMatcher';
import { ResilientImage } from './ResilientImage';

interface SopLibraryViewProps {
  sops: SopDocument[];
  areaCatalog: string[];
  highlightedSopId?: string | null;
  onAskAiAboutSop: (sop: SopDocument) => void;
  onOpenLightbox: (img: {
    url: string;
    title: string;
    zoneLabel?: string;
    zone?: BioZone;
    caption?: string;
  }) => void;
}

const DEFAULT_BASE_AREAS = [
  'Vùng Đỏ · Ngoại Vi & Trạm Rửa Xe',
  'Vùng Vàng · Nhà Tắm Sát Trùng & Cách Ly',
  'Vùng Vàng · Phòng Khử Khuẩn Vật Tư',
  'Vùng Đỏ - Vàng · Cầu Trung Chuyển Xuất Nhập Heo',
  'Vùng Xanh · Khu Sản Xuất & Chuồng Nuôi',
];

export const SopLibraryView: React.FC<SopLibraryViewProps> = ({
  sops,
  areaCatalog,
  highlightedSopId,
  onAskAiAboutSop,
  onOpenLightbox,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [selectedSopDetail, setSelectedSopDetail] = useState<SopDocument | null>(() => {
    if (highlightedSopId) {
      return sops.find((s) => s.id === highlightedSopId) || null;
    }
    return null;
  });

  const activeSops = useMemo(() => sops.filter((s) => s.active), [sops]);

  // Extract custom Khu Vực added in the Tài Liệu (Admin) tab or attached to SOPs
  const customAddedAreas = useMemo(() => {
    const set = new Set<string>();
    for (const area of areaCatalog) {
      const trimmed = area.trim();
      if (trimmed && !DEFAULT_BASE_AREAS.includes(trimmed)) {
        set.add(trimmed);
      }
    }
    for (const sop of activeSops) {
      const parts = (sop.zoneLabel || '')
        .split(' | ')
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of parts) {
        if (!DEFAULT_BASE_AREAS.includes(p)) {
          set.add(p);
        }
      }
    }
    return Array.from(set);
  }, [areaCatalog, activeSops]);

  const filteredSops = useMemo(() => {
    return activeSops.filter((sop) => {
      let matchesZone = false;
      if (zoneFilter === 'ALL') {
        matchesZone = true;
      } else if (
        zoneFilter === 'RED' ||
        zoneFilter === 'YELLOW' ||
        zoneFilter === 'RED_YELLOW' ||
        zoneFilter === 'GREEN' ||
        zoneFilter === 'GENERAL'
      ) {
        matchesZone =
          sop.zone === zoneFilter ||
          (zoneFilter === 'RED' && sop.zone === 'RED_YELLOW') ||
          (zoneFilter === 'YELLOW' && sop.zone === 'RED_YELLOW');
      } else if (zoneFilter.startsWith('AREA:')) {
        const targetArea = zoneFilter.slice(5).toLowerCase();
        const sopAreas = (sop.zoneLabel || '')
          .split(' | ')
          .map((s) => s.trim().toLowerCase());
        matchesZone =
          sopAreas.includes(targetArea) ||
          (sop.zoneLabel || '').toLowerCase().includes(targetArea);
      }

      if (!matchesZone) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        sop.title.toLowerCase().includes(q) ||
        sop.code.toLowerCase().includes(q) ||
        sop.summary.toLowerCase().includes(q) ||
        sop.content.toLowerCase().includes(q) ||
        (sop.zoneLabel || '').toLowerCase().includes(q) ||
        sop.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [activeSops, zoneFilter, searchQuery]);

  const renderMarkdownHtml = (mdText: string) => {
    const rawHtml = marked.parse(mdText, { async: false }) as string;
    return { __html: rawHtml };
  };

  const baseFilterTabs = [
    { id: 'ALL', label: 'Tất cả phân vùng' },
    { id: 'RED', label: '● Vùng Đỏ (Rủi ro cao)' },
    { id: 'YELLOW', label: '▲ Vùng Vàng (Rủi ro)' },
    { id: 'RED_YELLOW', label: '◆ Đỏ - Vàng (Trung chuyển)' },
    { id: 'GREEN', label: '■ Vùng Xanh (An toàn)' },
    { id: 'GENERAL', label: '◈ Quy định chung' },
  ];

  const allFilterTabs = [
    ...baseFilterTabs,
    ...customAddedAreas.map((customArea) => ({
      id: `AREA:${customArea}`,
      label: `◈ ${customArea}`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Frosted Glass Header & Search/Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 hover:border-cyan-300/40 shadow-[0_12px_40px_0_rgba(6,182,212,0.18)] ring-1 ring-inset ring-white/10 p-6 space-y-4 transition-colors"
      >
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-85 pointer-events-none"
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-100/80 mb-1">
              <span className="font-mono text-emerald-300">
                QUY TRÌNH HỆ THỐNG (VISUAL SOP CARDS)
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Hiển thị {filteredSops.length} / {activeSops.length} quy trình đang kích hoạt
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
              Danh Mục Quy Trình Chuẩn An Toàn Sinh Học (SOP)
            </h1>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-cyan-200/75 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã SOP, khu vực, từ khóa..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-cyan-300/30 focus:border-emerald-300 focus:shadow-[0_0_20px_rgba(52,211,153,0.3)] focus:outline-none text-sm text-[#F8FAFC] placeholder-cyan-100/65 transition-all"
            />
          </div>
        </div>

        {/* Zone & Custom Added Khu Vực Sliding Pill Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-teal-300/20">
          <span className="text-xs text-cyan-100/80 mr-1">Phân vùng ATSH:</span>
          {allFilterTabs.map((tab) => {
            const isActive = zoneFilter === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setZoneFilter(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-slate-950 font-bold'
                    : 'bg-white/[0.06] text-cyan-100/85 hover:text-[#F8FAFC] border border-cyan-300/25'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeZoneFilterIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 rounded-xl shadow-lg shadow-cyan-400/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Staggered SOP Grid Cards with Shared Element Morphing */}
      {filteredSops.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-12 text-center space-y-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]"
        >
          <p className="text-base font-semibold text-[#F8FAFC]">
            Không tìm thấy quy trình SOP nào khớp với bộ lọc hiện tại
          </p>
          <p className="text-xs text-[#94A3B8]">
            Thử xóa từ khóa tìm kiếm hoặc chuyển bộ lọc sang &ldquo;Tất cả phân vùng&rdquo;.
          </p>
          <motion.button
            type="button"
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setSearchQuery('');
              setZoneFilter('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            Đặt lại bộ lọc
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          key={`${zoneFilter}-${searchQuery}`}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
        >
          {filteredSops.map((sop) => {
            const zoneStyle = getZoneSemanticStyle(sop.zone);
            return (
              <motion.article
                key={sop.id}
                layoutId={`card-container-${sop.id}`}
                variants={{
                  hidden: { opacity: 0, y: 18, scale: 0.97 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 340, damping: 28 },
                  },
                }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex flex-col justify-between rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 hover:border-emerald-400/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ring-1 ring-inset ring-white/5 transition-colors duration-200 overflow-hidden"
              >
                <div>
                  {/* Top Visual Image */}
                  <motion.div
                    layoutId={`card-image-${sop.id}`}
                    className="h-48 w-full relative overflow-hidden bg-slate-950/80"
                  >
                    <ResilientImage
                      src={sop.imageUrl}
                      alt={sop.title}
                      zone={sop.zone}
                      containerClassName="w-full h-full relative"
                      className="w-full h-full object-cover"
                      showExpandHint={true}
                      onExpandClick={() =>
                        onOpenLightbox({
                          url: sop.imageUrl,
                          title: sop.title,
                          zoneLabel: sop.zoneLabel,
                          zone: sop.zone,
                          caption: sop.summary,
                        })
                      }
                    />
                  </motion.div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-semibold ${zoneStyle.badgeClass}`}
                      >
                        {zoneStyle.glyph} {sop.zoneLabel || zoneStyle.shortTag}
                      </span>
                      <span className="font-mono text-[#94A3B8]">{sop.code}</span>
                    </div>

                    <motion.h2
                      layoutId={`card-title-${sop.id}`}
                      className="text-base font-bold text-[#F8FAFC] leading-snug line-clamp-2"
                    >
                      {sop.title}
                    </motion.h2>

                    <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-3">
                      {sop.summary}
                    </p>

                    {/* Key Metrics Mini Row */}
                    {sop.keyMetrics && sop.keyMetrics.length > 0 && (
                      <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                        {sop.keyMetrics.slice(0, 2).map((m, i) => (
                          <div
                            key={`${m.label}-${i}`}
                            className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
                          >
                            <div className="text-[11px] text-[#94A3B8] truncate">{m.label}</div>
                            <div className="font-mono font-semibold text-emerald-300 tabular-nums mt-0.5">
                              {m.value}{' '}
                              <span className="text-[#94A3B8] font-normal">{m.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Clean tags line */}
                    <div className="pt-1 text-[11px] text-[#94A3B8] truncate">
                      <span className="text-slate-500">Từ khóa: </span>
                      {sop.tags.join(' · ')}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3.5 bg-white/[0.03] border-t border-white/10 flex items-center justify-between gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedSopDetail(sop)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#F8FAFC] border border-white/10 hover:border-emerald-400/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    Xem chi tiết
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onAskAiAboutSop(sop)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-cyan-300 text-xs font-bold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    Hỏi AI về quy trình này
                  </motion.button>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      {/* SHARED ELEMENT MORPHING SOP DETAIL MODAL (PowerPoint Morph Transition) */}
      <AnimatePresence>
        {selectedSopDetail && (
          <motion.div
            key="sop-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
            onClick={() => setSelectedSopDetail(null)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              layoutId={`card-container-${selectedSopDetail.id}`}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="w-full max-w-4xl max-h-[88vh] bg-slate-900/85 backdrop-blur-2xl border border-emerald-400/35 rounded-2xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-white/[0.04] border-b border-white/10 flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg font-bold ${
                        getZoneSemanticStyle(selectedSopDetail.zone).badgeClass
                      }`}
                    >
                      {getZoneSemanticStyle(selectedSopDetail.zone).glyph}{' '}
                      {selectedSopDetail.zoneLabel}
                    </span>
                    <span className="font-mono text-emerald-400">{selectedSopDetail.code}</span>
                  </div>
                  <motion.h2
                    layoutId={`card-title-${selectedSopDetail.id}`}
                    className="text-base md:text-lg font-bold text-[#F8FAFC] truncate"
                  >
                    {selectedSopDetail.title}
                  </motion.h2>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSopDetail(null)}
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#F8FAFC] border border-white/10 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Image + Metrics Split */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                  <motion.div
                    layoutId={`card-image-${selectedSopDetail.id}`}
                    className="md:col-span-6 h-56 rounded-xl overflow-hidden border border-white/10 bg-slate-950"
                  >
                    <ResilientImage
                      src={selectedSopDetail.imageUrl}
                      alt={selectedSopDetail.title}
                      zone={selectedSopDetail.zone}
                      containerClassName="w-full h-full relative"
                      className="w-full h-full object-cover"
                      showExpandHint={true}
                      onExpandClick={() =>
                        onOpenLightbox({
                          url: selectedSopDetail.imageUrl,
                          title: selectedSopDetail.title,
                          zoneLabel: selectedSopDetail.zoneLabel,
                          zone: selectedSopDetail.zone,
                          caption: selectedSopDetail.summary,
                        })
                      }
                    />
                  </motion.div>
                  <div className="md:col-span-6 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-emerald-400">
                        TÓM TẮT QUY TRÌNH CHUẨN:
                      </div>
                      <p className="text-xs md:text-sm text-[#94A3B8] leading-relaxed">
                        {selectedSopDetail.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {selectedSopDetail.keyMetrics.map((m, idx) => (
                        <div
                          key={`${m.label}-${idx}`}
                          className="p-3 rounded-xl bg-white/[0.04] border border-white/10 ring-1 ring-inset ring-white/5"
                        >
                          <div className="text-[11px] text-[#94A3B8]">{m.label}</div>
                          <div className="text-base font-bold font-mono text-emerald-300 tabular-nums mt-0.5">
                            {m.value}{' '}
                            <span className="text-xs text-[#94A3B8] font-normal">{m.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Critical Warning */}
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-1 shadow-[0_0_20px_rgba(244,63,94,0.12)]">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>CẢNH BÁO RỦI RO SỐNG CÒN</span>
                  </div>
                  <p className="text-sm text-rose-100 leading-relaxed">
                    {selectedSopDetail.criticalWarning}
                  </p>
                </div>

                {/* Full SOP Markdown Content */}
                <div className="space-y-2">
                  <div className="text-xs font-mono text-emerald-400">
                    NỘI DUNG CHI TIẾT QUY TRÌNH ĐÃ NẠP CHO AI:
                  </div>
                  <div
                    className="sop-markdown rounded-xl bg-white/[0.03] border border-white/10 p-5"
                    dangerouslySetInnerHTML={renderMarkdownHtml(selectedSopDetail.content)}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-white/[0.03] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Từ khóa nhận diện: {selectedSopDetail.tags.join(' · ')}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      onOpenLightbox({
                        url: selectedSopDetail.imageUrl,
                        title: selectedSopDetail.title,
                        zoneLabel: selectedSopDetail.zoneLabel,
                        zone: selectedSopDetail.zone,
                        caption: selectedSopDetail.summary,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#F8FAFC] border border-white/10 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                    Phóng to ảnh SOP
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const target = selectedSopDetail;
                      setSelectedSopDetail(null);
                      onAskAiAboutSop(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-cyan-300 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    Hỏi Trợ Lý AI về quy trình này
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
