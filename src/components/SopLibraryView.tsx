import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  MessageSquarePlus,
  BookOpen,
  X,
  CheckCircle2,
  Layers,
  Sparkles,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { SopDocument, SpeciesType, ZoneType } from '../types/biosecurity';
import { getZoneTypeBadge } from '../lib/supabase';

interface SopLibraryViewProps {
  species: SpeciesType;
  sops: SopDocument[];
  highlightedSopId?: string | null;
  onAskAiAboutSop: (sop: SopDocument) => void;
  onNavigateToUpload?: () => void;
  canUpload?: boolean;
}

const ZONE_ORDER: { type: ZoneType; title: string; subtitle: string }[] = [
  { type: 'do', title: 'Vùng Đỏ (nguy hiểm)', subtitle: 'Khu vực ngoại vi & kiểm soát rủi ro dịch tễ cao' },
  { type: 'vang', title: 'Vùng Vàng (rủi ro)', subtitle: 'Vùng đệm sát trùng & trung chuyển cách ly' },
  { type: 'xanh', title: 'Vùng Xanh (an toàn)', subtitle: 'Khu vực sản xuất & chuồng nuôi an toàn tuyệt đối' },
];

export const SopLibraryView: React.FC<SopLibraryViewProps> = ({
  species,
  sops,
  highlightedSopId,
  onAskAiAboutSop,
  onNavigateToUpload,
  canUpload = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'ALL' | ZoneType>('ALL');
  const [selectedSopDetail, setSelectedSopDetail] = useState<SopDocument | null>(() => {
    if (highlightedSopId) {
      return sops.find((s) => s.id === highlightedSopId) || null;
    }
    return null;
  });

  const speciesName = species === 'ga' ? 'GÀ' : 'HEO';
  const speciesLower = species === 'ga' ? 'gà' : 'heo';

  const filterTabs: { id: 'ALL' | ZoneType; label: string }[] = [
    { id: 'ALL', label: 'Tất cả phân vùng' },
    { id: 'do', label: '● Vùng Đỏ (nguy hiểm)' },
    { id: 'vang', label: '▲ Vùng Vàng (rủi ro)' },
    { id: 'xanh', label: '■ Vùng Xanh (an toàn)' },
  ];

  const filteredSops = useMemo(() => {
    return sops.filter((sop) => {
      if (zoneFilter !== 'ALL' && sop.zone_type !== zoneFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        sop.title.toLowerCase().includes(q) ||
        (sop.area && sop.area.toLowerCase().includes(q)) ||
        sop.content.toLowerCase().includes(q) ||
        (sop.warning && sop.warning.toLowerCase().includes(q))
      );
    });
  }, [sops, zoneFilter, searchQuery]);

  // Group by Zone (do -> vang -> xanh), then by Area
  const groupedByZoneAndArea = useMemo(() => {
    return ZONE_ORDER.map((zoneMeta) => {
      const sopsInZone = filteredSops.filter((s) => s.zone_type === zoneMeta.type);
      const areaMap = new Map<string, SopDocument[]>();

      for (const sop of sopsInZone) {
        const areaName = (sop.area || 'Khu vực chung').trim();
        const existing = areaMap.get(areaName) || [];
        existing.push(sop);
        areaMap.set(areaName, existing);
      }

      const areaGroups = Array.from(areaMap.entries()).map(([areaName, items]) => ({
        areaName,
        items,
      }));

      return {
        ...zoneMeta,
        totalCount: sopsInZone.length,
        areaGroups,
      };
    }).filter((group) => group.totalCount > 0);
  }, [filteredSops]);

  const renderMarkdownHtml = (mdText: string) => {
    const rawHtml = marked.parse(mdText, { async: false }) as string;
    return { __html: rawHtml };
  };

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
              <span className="font-mono text-emerald-300 font-bold">
                QUY TRÌNH HỆ THỐNG TRẠI {speciesName}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Hiển thị {filteredSops.length} / {sops.length} quy trình {speciesLower}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
              Danh Mục Quy Trình Chuẩn An Toàn Sinh Học ({speciesName})
            </h1>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-cyan-200/75 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Tìm quy trình ${speciesLower}, khu vực...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-cyan-300/30 focus:border-emerald-300 focus:shadow-[0_0_20px_rgba(52,211,153,0.3)] focus:outline-none text-sm text-[#F8FAFC] placeholder-cyan-100/65 transition-all"
            />
          </div>
        </div>

        {/* Zone Filter Sliding Pill Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-teal-300/20">
          <span className="text-xs text-cyan-100/80 mr-1">Phân vùng {speciesName}:</span>
          {filterTabs.map((tab) => {
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

      {/* Grouped SOPs by Zone -> Area */}
      {sops.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/20 p-12 text-center space-y-4 shadow-[0_8px_32px_0_rgba(6,182,212,0.15)]"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.25)]">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">
              Chưa có quy trình an toàn sinh học nào cho {speciesName}
            </h3>
            <p className="text-xs text-cyan-100/75 leading-relaxed">
              Hệ thống hiện tại chưa có dữ liệu quy trình chuẩn cho đàn {speciesLower}.
              {canUpload
                ? ' Anh/Chị có thể nạp quy trình mới ngay tại tab Tài Liệu.'
                : ' Vui lòng liên hệ Phó admin hoặc Admin để nạp quy trình vào hệ thống.'}
            </p>
          </div>
          {canUpload && onNavigateToUpload && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={onNavigateToUpload}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-400/30 cursor-pointer"
            >
              Nạp Quy Trình {speciesName} Ngay
            </motion.button>
          )}
        </motion.div>
      ) : filteredSops.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-12 text-center space-y-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]"
        >
          <p className="text-base font-semibold text-[#F8FAFC]">
            Không tìm thấy quy trình nào khớp với bộ lọc hiện tại
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
        <div className="space-y-8">
          {groupedByZoneAndArea.map((zoneGroup) => {
            const zoneBadge = getZoneTypeBadge(zoneGroup.type);
            return (
              <section
                key={zoneGroup.type}
                className="rounded-2xl bg-slate-900/35 backdrop-blur-2xl border border-teal-300/20 p-5 sm:p-6 space-y-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"
              >
                {/* Zone Group Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-300/20 pb-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${zoneBadge.colorClass}`}>
                      {zoneBadge.glyph} {zoneGroup.title}
                    </span>
                    <span className="text-xs text-cyan-100/75 hidden sm:inline">
                      {zoneGroup.subtitle}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-cyan-200/80">
                    {zoneGroup.totalCount} quy trình
                  </span>
                </div>

                {/* Area Sub-groups within this Zone */}
                <div className="space-y-6">
                  {zoneGroup.areaGroups.map((areaGroup) => (
                    <div key={areaGroup.areaName} className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-cyan-100">
                        <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>Khu vực: {areaGroup.areaName}</span>
                        <span className="text-xs font-normal text-cyan-200/70">
                          ({areaGroup.items.length} quy trình)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                        {areaGroup.items.map((sop) => {
                          const badge = getZoneTypeBadge(sop.zone_type);
                          const hasDisinfect =
                            sop.disinfect_min !== null &&
                            sop.disinfect_min !== undefined &&
                            Number(sop.disinfect_min) > 0;
                          const hasDilution = Boolean(sop.dilution && sop.dilution.trim() !== '');

                          return (
                            <motion.article
                              key={sop.id}
                              whileHover={{ y: -4, scale: 1.01 }}
                              className="flex flex-col justify-between rounded-2xl bg-slate-900/50 backdrop-blur-2xl border border-teal-300/20 hover:border-cyan-300/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] ring-1 ring-inset ring-white/5 transition-colors duration-200 overflow-hidden"
                            >
                              <div className="p-5 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className={`px-2.5 py-1 rounded-lg font-semibold border ${badge.colorClass}`}>
                                    {badge.glyph} {badge.fullLabel}
                                  </span>
                                  <span className="font-mono text-cyan-200 text-[11px] px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-cyan-300/25">
                                    {sop.area}
                                  </span>
                                </div>

                                <h3 className="text-base font-bold text-[#F8FAFC] leading-snug line-clamp-2">
                                  {sop.title}
                                </h3>

                                {(hasDisinfect || hasDilution) && (
                                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                                    {hasDisinfect && (
                                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-emerald-400/30 text-emerald-300">
                                        Sát trùng: ≥ {sop.disinfect_min} phút
                                      </span>
                                    )}
                                    {hasDilution && (
                                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-cyan-400/30 text-cyan-200">
                                        Nồng độ: {sop.dilution}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <p className="text-xs text-cyan-100/75 leading-relaxed line-clamp-3">
                                  {sop.content.replace(/[#*`-]/g, '').slice(0, 140)}
                                  {sop.content.length > 140 ? '...' : ''}
                                </p>
                              </div>

                              {/* Card Actions */}
                              <div className="px-5 py-3.5 bg-white/[0.03] border-t border-teal-300/20 flex items-center justify-between gap-2">
                                <motion.button
                                  type="button"
                                  whileHover={{ y: -2, scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => setSelectedSopDetail(sop)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#F8FAFC] border border-cyan-300/25 hover:border-emerald-400/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                                  Xem chi tiết
                                </motion.button>

                                <motion.button
                                  type="button"
                                  whileHover={{ y: -2, scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => onAskAiAboutSop(sop)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-xs font-bold text-slate-950 shadow-md shadow-cyan-400/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  <MessageSquarePlus className="w-3.5 h-3.5" />
                                  Hỏi AI về quy trình
                                </motion.button>
                              </div>
                            </motion.article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
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
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="w-full max-w-3xl max-h-[88vh] bg-slate-900/95 backdrop-blur-2xl border border-teal-300/35 rounded-2xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-white/[0.04] border-b border-teal-300/20 flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-lg font-bold bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">
                      QUY TRÌNH TRẠI {speciesName}
                    </span>
                  </div>
                  <h2 className="text-base md:text-lg font-bold text-[#F8FAFC]">
                    {selectedSopDetail.title}
                  </h2>
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
              <div className="p-6 overflow-y-auto space-y-5">
                {/* 1. Khu vực và Vùng */}
                <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-teal-300/20">
                  <div className="flex items-center gap-2 text-xs text-cyan-100">
                    <MapPin className="w-4 h-4 text-emerald-300" />
                    <span className="text-cyan-200/80">Khu vực:</span>
                    <span className="font-bold text-white">{selectedSopDetail.area}</span>
                  </div>
                  <span aria-hidden="true" className="text-cyan-500/40">|</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-cyan-200/80">Phân vùng:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg font-semibold border ${
                        getZoneTypeBadge(selectedSopDetail.zone_type).colorClass
                      }`}
                    >
                      {getZoneTypeBadge(selectedSopDetail.zone_type).glyph}{' '}
                      {getZoneTypeBadge(selectedSopDetail.zone_type).fullLabel}
                    </span>
                  </div>
                </div>

                {/* 2. Thông số kỹ thuật định lượng chính (chỉ hiển thị khi có ít nhất 1 thông số) */}
                {((selectedSopDetail.disinfect_min !== null &&
                  selectedSopDetail.disinfect_min !== undefined &&
                  Number(selectedSopDetail.disinfect_min) > 0) ||
                  Boolean(selectedSopDetail.dilution && selectedSopDetail.dilution.trim() !== '')) && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-mono text-emerald-300 font-semibold tracking-wide">
                      Thông số kỹ thuật định lượng chính (Hiển thị bảng số liệu nhanh):
                    </div>
                    <div className="space-y-2">
                      {selectedSopDetail.disinfect_min !== null &&
                        selectedSopDetail.disinfect_min !== undefined &&
                        Number(selectedSopDetail.disinfect_min) > 0 && (
                          <div className="grid grid-cols-12 items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/70 border border-teal-300/25">
                            <span className="col-span-5 text-xs sm:text-sm font-semibold text-cyan-100">
                              Thời gian sát trùng
                            </span>
                            <span className="col-span-4 text-sm sm:text-base font-mono font-bold text-emerald-300 text-center">
                              ≥ {selectedSopDetail.disinfect_min}
                            </span>
                            <span className="col-span-3 text-xs sm:text-sm font-mono text-cyan-200/80 text-right">
                              phút
                            </span>
                          </div>
                        )}

                      {Boolean(selectedSopDetail.dilution && selectedSopDetail.dilution.trim() !== '') && (
                        <div className="grid grid-cols-12 items-center gap-3 px-4 py-3 rounded-xl bg-slate-950/70 border border-teal-300/25">
                          <span className="col-span-5 text-xs sm:text-sm font-semibold text-cyan-100">
                            Nồng độ pha thuốc
                          </span>
                          <span className="col-span-4 text-sm sm:text-base font-mono font-bold text-emerald-300 text-center">
                            {selectedSopDetail.dilution}
                          </span>
                          <span className="col-span-3 text-xs sm:text-sm font-mono text-cyan-200/80 text-right">
                            tỷ lệ
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Nội dung quy trình (Markdown) */}
                <div className="space-y-2">
                  <div className="text-xs font-mono text-emerald-300 font-semibold tracking-wide">
                    Tóm tắt ngắn quy trình:
                  </div>
                  <div
                    className="sop-markdown rounded-xl bg-white/[0.03] border border-teal-300/20 p-5 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={renderMarkdownHtml(selectedSopDetail.content)}
                  />
                </div>

                {/* 4. Lưu ý cảnh báo (chỉ hiển thị khi có warning) */}
                {selectedSopDetail.warning && selectedSopDetail.warning.trim() !== '' && (
                  <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 p-4 space-y-1.5 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-200 uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-300" />
                      <span>Lưu ý cảnh báo</span>
                    </div>
                    <p className="text-sm text-rose-100/95 leading-relaxed whitespace-pre-line">
                      {selectedSopDetail.warning}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-white/[0.03] border-t border-teal-300/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-cyan-100/75">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Dữ liệu lưu trữ bảo mật trên Supabase</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const target = selectedSopDetail;
                      setSelectedSopDetail(null);
                      onAskAiAboutSop(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Tra cứu AI về quy trình này
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
