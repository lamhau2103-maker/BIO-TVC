import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
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

  // Extract custom Khu Vực added in the Nạp (Admin) tab or attached to SOPs
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

  return (
    <div className="space-y-6">
      {/* Header & Search/Filter Controls */}
      <div className="rounded-xl bg-[#1E293B]/75 backdrop-blur-md border border-white/10 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="font-mono text-cyan-400">QUY TRÌNH HỆ THỐNG (VISUAL SOP CARDS)</span>
              <span aria-hidden="true">·</span>
              <span>Hiển thị {filteredSops.length} / {activeSops.length} quy trình đang kích hoạt</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Danh Mục Quy Trình Chuẩn An Toàn Sinh Học (SOP)
            </h1>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã SOP, khu vực, từ khóa..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Zone & Custom Added Khu Vực Filter Segmented Control */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
          <span className="text-xs text-slate-400 mr-2">Phân vùng ATSH:</span>
          {(
            [
              { id: 'ALL', label: 'Tất cả phân vùng' },
              { id: 'RED', label: '● Vùng Đỏ (Ngoại vi / Rửa xe)' },
              { id: 'YELLOW', label: '▲ Vùng Vàng (Vùng đệm / Khử khuẩn)' },
              { id: 'RED_YELLOW', label: '◆ Đỏ - Vàng (Cầu trung chuyển)' },
              { id: 'GREEN', label: '■ Vùng Xanh (Chuồng nuôi)' },
              { id: 'GENERAL', label: '◈ Quy định chung' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setZoneFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                zoneFilter === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-[#0F172A] text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Dynamically render any new Khu Vực added in the Nạp (Admin) tab */}
          {customAddedAreas.map((customArea) => {
            const filterKey = `AREA:${customArea}`;
            return (
              <button
                key={filterKey}
                type="button"
                onClick={() => setZoneFilter(filterKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  zoneFilter === filterKey
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'bg-[#0F172A] text-cyan-300 hover:text-white border border-cyan-500/35'
                }`}
              >
                ◈ {customArea}
              </button>
            );
          })}
        </div>
      </div>

      {/* SOP Grid Cards */}
      {filteredSops.length === 0 ? (
        <div className="rounded-xl bg-[#1E293B]/60 border border-white/10 p-12 text-center space-y-3">
          <p className="text-base font-semibold text-white">
            Không tìm thấy quy trình SOP nào khớp với bộ lọc hiện tại
          </p>
          <p className="text-xs text-slate-400">
            Thử xóa từ khóa tìm kiếm hoặc chuyển bộ lọc sang &ldquo;Tất cả phân vùng&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setZoneFilter('ALL');
            }}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredSops.map((sop) => {
            const zoneStyle = getZoneSemanticStyle(sop.zone);
            return (
              <article
                key={sop.id}
                className="flex flex-col justify-between rounded-xl bg-[#1E293B]/75 backdrop-blur-md border border-white/10 hover:border-cyan-500/40 transition-colors overflow-hidden"
              >
                <div>
                  {/* Top Visual Image */}
                  <div className="h-48 w-full relative overflow-hidden bg-[#0F172A]">
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
                  </div>

                  {/* Card Content (Lead with clean unboxed metadata & primary title) */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-semibold ${zoneStyle.textColor}`}>
                        {zoneStyle.glyph} {sop.zoneLabel || zoneStyle.shortTag}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="font-mono text-slate-400">{sop.code}</span>
                    </div>

                    <h2 className="text-base font-bold text-white leading-snug line-clamp-2">
                      {sop.title}
                    </h2>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {sop.summary}
                    </p>

                    {/* Key Metrics Mini Row */}
                    {sop.keyMetrics && sop.keyMetrics.length > 0 && (
                      <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                        {sop.keyMetrics.slice(0, 2).map((m, i) => (
                          <div key={`${m.label}-${i}`} className="text-xs">
                            <div className="text-[11px] text-slate-400 truncate">{m.label}</div>
                            <div className="font-mono font-semibold text-cyan-300 tabular-nums">
                              {m.value} <span className="text-slate-400 font-normal">{m.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Clean unboxed tags line */}
                    <div className="pt-2 text-[11px] text-slate-400 truncate">
                      <span className="text-slate-500">Từ khóa: </span>
                      {sop.tags.join(' · ')}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3.5 bg-[#0F172A] border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSopDetail(sop)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    Xem chi tiết
                  </button>

                  <button
                    type="button"
                    onClick={() => onAskAiAboutSop(sop)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-slate-950 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    Hỏi AI về quy trình này
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* SOP Full Detail Modal */}
      {selectedSopDetail && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
          onClick={() => setSelectedSopDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-4xl max-h-[88vh] bg-[#0F172A] border border-white/15 rounded-xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0B1120] border-b border-white/10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className={`font-bold ${getZoneSemanticStyle(selectedSopDetail.zone).textColor}`}>
                    {getZoneSemanticStyle(selectedSopDetail.zone).glyph}{' '}
                    {selectedSopDetail.zoneLabel}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="font-mono text-cyan-400">{selectedSopDetail.code}</span>
                </div>
                <h2 className="text-base md:text-lg font-bold text-white truncate">
                  {selectedSopDetail.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSopDetail(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Image + Metrics Split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                <div className="md:col-span-6 h-56 rounded-lg overflow-hidden border border-white/10 bg-[#0B1120]">
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
                </div>
                <div className="md:col-span-6 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-cyan-400">TÓM TẮT QUY TRÌNH CHUẨN:</div>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                      {selectedSopDetail.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {selectedSopDetail.keyMetrics.map((m, idx) => (
                      <div
                        key={`${m.label}-${idx}`}
                        className="p-2.5 rounded-lg bg-[#1E293B] border border-white/10"
                      >
                        <div className="text-[11px] text-slate-400">{m.label}</div>
                        <div className="text-base font-bold font-mono text-cyan-300 tabular-nums mt-0.5">
                          {m.value} <span className="text-xs text-slate-400 font-normal">{m.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Critical Warning */}
              <div className="rounded-lg bg-red-950/35 border border-red-500/40 p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>CẢNH BÁO RỦI RO SỐNG CÒN</span>
                </div>
                <p className="text-sm text-red-100 leading-relaxed">
                  {selectedSopDetail.criticalWarning}
                </p>
              </div>

              {/* Full SOP Markdown Content */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-cyan-400">
                  NỘI DUNG CHI TIẾT QUY TRÌNH ĐÃ NẠP CHO AI:
                </div>
                <div
                  className="sop-markdown rounded-lg bg-[#1E293B]/50 border border-white/10 p-5"
                  dangerouslySetInnerHTML={renderMarkdownHtml(selectedSopDetail.content)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-[#0B1120] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Từ khóa nhận diện: {selectedSopDetail.tags.join(' · ')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onOpenLightbox({
                      url: selectedSopDetail.imageUrl,
                      title: selectedSopDetail.title,
                      zoneLabel: selectedSopDetail.zoneLabel,
                      zone: selectedSopDetail.zone,
                      caption: selectedSopDetail.summary,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  Phóng to ảnh SOP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedSopDetail;
                    setSelectedSopDetail(null);
                    onAskAiAboutSop(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-slate-950 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  Hỏi Trợ Lý AI về quy trình này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
