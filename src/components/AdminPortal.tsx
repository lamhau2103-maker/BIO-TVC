import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlusCircle,
  Save,
  Trash2,
  Edit3,
  Upload,
  RotateCcw,
  FileUp,
  AlertTriangle,
  Sparkles,
  Loader2,
  FileText,
  Sliders,
  MapPin,
} from 'lucide-react';
import { SopDocument, SpeciesType, ZoneType } from '../types/biosecurity';
import {
  invokeRpc,
  getZoneTypeBadge,
} from '../lib/supabase';
import {
  BulkImportItem,
  isValidPositiveNumberMax2Decimals,
  parseBulkImportFile,
  SAMPLE_TXT_TEMPLATE,
} from '../utils/ragMatcher';

interface AdminPortalProps {
  token: string;
  gaSops: SopDocument[];
  heoSops: SopDocument[];
  systemPrompt: string;
  onSaveSystemPrompt: (newPrompt: string) => void;
  onRefreshData: () => Promise<void>;
  onNotify: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
  onSessionInvalid: () => void;
}

const ZONE_OPTIONS: {
  value: ZoneType;
  label: string;
  activeClass: string;
  inactiveClass: string;
  dotColor: string;
}[] = [
  {
    value: 'xanh',
    label: 'Vùng Xanh (an toàn)',
    activeClass:
      'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50',
    inactiveClass:
      'bg-white/[0.04] border-white/15 text-cyan-100/75 hover:border-emerald-400/40 hover:text-emerald-200',
    dotColor: 'bg-emerald-400',
  },
  {
    value: 'vang',
    label: 'Vùng Vàng (rủi ro)',
    activeClass:
      'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50',
    inactiveClass:
      'bg-white/[0.04] border-white/15 text-cyan-100/75 hover:border-amber-400/40 hover:text-amber-200',
    dotColor: 'bg-amber-400',
  },
  {
    value: 'do',
    label: 'Vùng Đỏ (nguy hiểm)',
    activeClass:
      'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-400/50',
    inactiveClass:
      'bg-white/[0.04] border-white/15 text-cyan-100/75 hover:border-rose-400/40 hover:text-rose-200',
    dotColor: 'bg-rose-400',
  },
];

export const AdminPortal: React.FC<AdminPortalProps> = ({
  token,
  gaSops,
  heoSops,
  systemPrompt,
  onSaveSystemPrompt,
  onRefreshData,
  onNotify,
  onSessionInvalid,
}) => {
  // Section 1 Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSpecies, setEditingSpecies] = useState<SpeciesType | null>(null);
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [zoneType, setZoneType] = useState<ZoneType | ''>('');
  const [disinfectMinInput, setDisinfectMinInput] = useState('');
  const [dilutionPartA, setDilutionPartA] = useState('1');
  const [dilutionPartB, setDilutionPartB] = useState('');
  const [content, setContent] = useState('');
  const [warning, setWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    area?: string;
    zoneType?: string;
    disinfectMin?: string;
    dilution?: string;
    content?: string;
  }>({});

  // Section 3: AI System Prompt state
  const [promptDraft, setPromptDraft] = useState(systemPrompt);

  useEffect(() => {
    setPromptDraft(systemPrompt);
  }, [systemPrompt]);

  // Section 4: Table filter & delete modal
  const [tableSpeciesFilter, setTableSpeciesFilter] = useState<'ALL' | 'ga' | 'heo'>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: string; title: string } | null>(null);

  // Bulk file upload ref
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [bulkSpeciesTarget, setBulkSpeciesTarget] = useState<SpeciesType>('heo');

  // Unique areas for datalist suggestions per species
  const gaAreas = useMemo(() => {
    const set = new Set<string>();
    gaSops.forEach((s) => {
      if (s.area && s.area.trim()) set.add(s.area.trim());
    });
    return Array.from(set);
  }, [gaSops]);

  const heoAreas = useMemo(() => {
    const set = new Set<string>();
    heoSops.forEach((s) => {
      if (s.area && s.area.trim()) set.add(s.area.trim());
    });
    return Array.from(set);
  }, [heoSops]);

  const areaSuggestions = useMemo(() => {
    if (editingSpecies === 'ga') return gaAreas;
    if (editingSpecies === 'heo') return heoAreas;
    return Array.from(new Set([...gaAreas, ...heoAreas]));
  }, [editingSpecies, gaAreas, heoAreas]);

  const resetForm = () => {
    setEditingId(null);
    setEditingSpecies(null);
    setTitle('');
    setArea('');
    setZoneType('');
    setDisinfectMinInput('');
    setDilutionPartA('1');
    setDilutionPartB('');
    setContent('');
    setWarning('');
    setFieldErrors({});
  };

  const handleEditClick = (sop: SopDocument) => {
    setEditingId(sop.id);
    setEditingSpecies(sop.species);
    setTitle(sop.title || '');
    setArea(sop.area || '');
    setZoneType(sop.zone_type || '');
    setDisinfectMinInput(
      sop.disinfect_min !== null && sop.disinfect_min !== undefined
        ? String(sop.disinfect_min)
        : ''
    );
    if (sop.dilution && sop.dilution.includes(':')) {
      const [a, b] = sop.dilution.split(':');
      setDilutionPartA(a ? a.trim() : '1');
      setDilutionPartB(b ? b.trim() : '');
    } else {
      setDilutionPartA('1');
      setDilutionPartB('');
    }
    setContent(sop.content || '');
    setWarning(sop.warning || '');
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validate form and return parsed values
  const validateForm = (): {
    valid: boolean;
    disinfectMin: number | null;
    dilution: string | null;
  } => {
    const errors: {
      title?: string;
      area?: string;
      zoneType?: string;
      disinfectMin?: string;
      dilution?: string;
      content?: string;
    } = {};

    if (!title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề quy trình / chủ đề ATSH.';
    }
    if (!area.trim()) {
      errors.area = 'Vui lòng nhập khu vực áp dụng.';
    }
    if (!zoneType) {
      errors.zoneType = 'Vui lòng chọn vùng áp dụng (Vùng Xanh, Vùng Vàng hoặc Vùng Đỏ).';
    }
    if (!content.trim()) {
      errors.content = 'Vui lòng nhập nội dung quy trình.';
    }

    let parsedDisinfectMin: number | null = null;
    const dMinTrim = disinfectMinInput.trim();
    if (dMinTrim !== '') {
      const check = isValidPositiveNumberMax2Decimals(dMinTrim);
      if (!check.valid) {
        errors.disinfectMin = 'Thời gian sát trùng phải là số lớn hơn 0 (tối đa 2 chữ số thập phân).';
      } else {
        parsedDisinfectMin = check.value;
      }
    }

    let parsedDilution: string | null = null;
    const partBTrim = dilutionPartB.trim();
    const partATrim = dilutionPartA.trim();
    if (partBTrim !== '') {
      const checkA = isValidPositiveNumberMax2Decimals(partATrim);
      const checkB = isValidPositiveNumberMax2Decimals(partBTrim);
      if (!checkA.valid || !checkB.valid) {
        errors.dilution = 'Nồng độ pha thuốc phải có dạng A:B (các số lớn hơn 0, tối đa 2 chữ số thập phân).';
      } else {
        parsedDilution = `${checkA.value}:${checkB.value}`;
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErr =
        errors.title ||
        errors.area ||
        errors.zoneType ||
        errors.disinfectMin ||
        errors.dilution ||
        errors.content;
      if (firstErr) {
        onNotify('error', 'Thông tin chưa hợp lệ', firstErr);
      }
      return { valid: false, disinfectMin: null, dilution: null };
    }

    return { valid: true, disinfectMin: parsedDisinfectMin, dilution: parsedDilution };
  };

  // Save SOP for GA or HEO
  const handleSaveSop = async (targetSpecies: SpeciesType) => {
    const { valid, disinfectMin, dilution } = validateForm();
    if (!valid || !zoneType) return;

    const speciesLabel = targetSpecies === 'ga' ? 'Gà' : 'Heo';
    setIsSubmitting(true);

    const { error } = await invokeRpc(
      'save_sop',
      {
        p_token: token,
        p_id: editingId || null,
        p_species: targetSpecies,
        p_title: title.trim(),
        p_area: area.trim(),
        p_zone_type: zoneType,
        p_disinfect_min: disinfectMin,
        p_dilution: dilution,
        p_content: content.trim(),
        p_warning: warning.trim() ? warning.trim() : null,
      },
      onSessionInvalid
    );

    setIsSubmitting(false);

    if (error) {
      onNotify('error', `Lỗi lưu quy trình ${speciesLabel}`, error);
      return;
    }

    onNotify(
      'success',
      editingId ? `Đã cập nhật quy trình ${speciesLabel}` : `Đã nạp quy trình ${speciesLabel}`,
      `Quy trình "${title.trim()}" đã được lưu thành công vào hệ thống ${speciesLabel}.`
    );

    resetForm();
    await onRefreshData();
  };

  // Delete SOP
  const handleDeleteSop = async (id: string) => {
    setIsSubmitting(true);
    const { error } = await invokeRpc(
      'delete_sop',
      {
        p_token: token,
        p_id: id,
      },
      onSessionInvalid
    );
    setIsSubmitting(false);

    if (error) {
      onNotify('error', 'Lỗi xóa quy trình', error);
      return;
    }

    onNotify('info', 'Đã xóa quy trình', 'Quy trình đã được gỡ khỏi hệ thống.');
    setConfirmDeleteId(null);
    if (editingId === id) resetForm();
    await onRefreshData();
  };

  // Download Sample .TXT File
  const handleDownloadSampleTxt = () => {
    const blob = new Blob([SAMPLE_TXT_TEMPLATE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'file-mau-nap-quy-trinh-atsh.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Execute bulk_add_sops RPC
  const executeBulkAddRpc = async (
    targetSpecies: SpeciesType,
    items: BulkImportItem[],
    totalRawCount: number,
    replace: boolean
  ) => {
    const speciesText = targetSpecies === 'ga' ? 'Gà' : 'Heo';
    setIsSubmitting(true);

    const { data, error } = await invokeRpc<number>(
      'bulk_add_sops',
      {
        p_token: token,
        p_species: targetSpecies,
        p_items: items,
        p_replace: replace,
      },
      onSessionInvalid
    );

    setIsSubmitting(false);

    if (error) {
      onNotify('error', `Lỗi nạp dữ liệu ${speciesText}`, error);
      return;
    }

    const insertedCount = typeof data === 'number' ? data : 0;
    const skippedCount = Math.max(0, totalRawCount - insertedCount);

    if (skippedCount > 0) {
      onNotify(
        'warning',
        `Kết quả nạp quy trình ${speciesText}`,
        `Đã nạp ${insertedCount}/${totalRawCount} quy trình, ${skippedCount} bị bỏ qua do thiếu hoặc sai dữ liệu`
      );
    } else {
      onNotify(
        'success',
        replace ? `Đã khôi phục dữ liệu ${speciesText}` : `Nạp hàng loạt thành công (${speciesText})`,
        `Đã nạp ${insertedCount}/${totalRawCount} quy trình cho phân hệ ${speciesText}.`
      );
    }

    await onRefreshData();
  };

  // Handle Bulk Upload (.TXT / .CSV / .JSON)
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result || '');
        const { items, totalRawCount } = parseBulkImportFile(file.name, text);

        if (totalRawCount === 0 || items.length === 0) {
          onNotify('error', 'Không tìm thấy dữ liệu', 'File không chứa quy trình hợp lệ.');
          return;
        }

        await executeBulkAddRpc(bulkSpeciesTarget, items, totalRawCount, false);
      } catch (err) {
        onNotify('error', 'Lỗi đọc file', err instanceof Error ? err.message : 'File không hợp lệ');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Combined SOPs list for table
  const allSops = [
    ...gaSops.map((s) => ({ ...s, species: 'ga' as SpeciesType })),
    ...heoSops.map((s) => ({ ...s, species: 'heo' as SpeciesType })),
  ];

  const displayedSops = allSops.filter((s) => {
    if (tableSpeciesFilter === 'ALL') return true;
    return s.species === tableSpeciesFilter;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 p-5 shadow-[0_8px_32px_0_rgba(6,182,212,0.18)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-100/80 mb-1">
            <span className="font-mono text-emerald-300 font-bold">● CỔNG NẠP TÀI LIỆU QUY TRÌNH (SUPABASE)</span>
            <span aria-hidden="true">·</span>
            <span>
              Tổng số: {gaSops.length} quy trình Gà | {heoSops.length} quy trình Heo
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Nạp & Huấn Luyện Dữ Liệu Quy Trình An Toàn Sinh Học
          </h1>
        </div>

        <button
          type="button"
          onClick={onRefreshData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-cyan-200 border border-cyan-300/30 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Main Grid: Mục 1 (Left 7 cols) & Mục 2 + Mục 3 (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* MỤC 1: NẠP QUY TRÌNH MỚI */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] space-y-5">
          <div className="flex items-center justify-between gap-2 border-b border-teal-300/20 pb-3.5">
            <div className="flex items-center gap-2.5">
              <PlusCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-base font-bold text-white">
                {editingId ? 'Đang Chỉnh Sửa Quy Trình' : '1. Nạp Quy Trình Mới'}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-cyan-200 hover:text-white cursor-pointer"
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          {/* a) Tiêu đề quy trình / Chủ đề ATSH * */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cyan-100">
              Tiêu đề quy trình / Chủ đề ATSH *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="VD: Quy trình sát trùng chuồng úm, kiểm soát phương tiện..."
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white/10 border focus:outline-none text-sm text-white placeholder-cyan-100/50 transition-all ${
                fieldErrors.title
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                  : 'border-cyan-300/30 focus:border-emerald-300'
              }`}
            />
            {fieldErrors.title && (
              <p className="text-xs text-amber-300">{fieldErrors.title}</p>
            )}
          </div>

          {/* b) & c) Khối Khu vực & Phân vùng áp dụng */}
          <div className="p-4 rounded-xl bg-white/[0.04] border border-teal-300/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                Khu vực & Phân vùng áp dụng
              </span>
              <span className="text-[11px] text-cyan-100/70">
                Chọn 1 khu vực + 1 vùng cho mỗi quy trình
              </span>
            </div>

            {/* b) Khu vực * */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-cyan-100">
                Khu vực *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-cyan-300/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  list="atsh-species-areas-datalist"
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value);
                    if (fieldErrors.area) setFieldErrors((prev) => ({ ...prev, area: undefined }));
                  }}
                  placeholder="Ví dụ: Trạm rửa xe, Nhà tắm sát trùng..."
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/10 border focus:outline-none text-sm text-white placeholder-cyan-100/50 transition-all ${
                    fieldErrors.area
                      ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                      : 'border-cyan-300/30 focus:border-emerald-300'
                  }`}
                />
                <datalist id="atsh-species-areas-datalist">
                  {areaSuggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
              {fieldErrors.area && (
                <p className="text-xs text-amber-300">{fieldErrors.area}</p>
              )}
            </div>

            {/* c) Vùng * */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-cyan-100">
                Vùng *
              </label>
              <div
                className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1 rounded-xl ${
                  fieldErrors.zoneType ? 'ring-1 ring-amber-400' : ''
                }`}
              >
                {ZONE_OPTIONS.map((opt) => {
                  const isSelected = zoneType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setZoneType(opt.value);
                        if (fieldErrors.zoneType) {
                          setFieldErrors((prev) => ({ ...prev, zoneType: undefined }));
                        }
                      }}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected ? opt.activeClass : opt.inactiveClass
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${opt.dotColor} ${
                          isSelected ? 'ring-2 ring-white/60' : 'opacity-75'
                        }`}
                      />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.zoneType && (
                <p className="text-xs text-amber-300">{fieldErrors.zoneType}</p>
              )}
            </div>
          </div>

          {/* d) Khối Thông số kỹ thuật định lượng (không bắt buộc) */}
          <div className="p-4 rounded-xl bg-white/[0.04] border border-teal-300/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-cyan-200 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-cyan-300" />
                <span>Thông số kỹ thuật định lượng (không bắt buộc)</span>
              </label>
              <span className="text-[11px] text-cyan-100/65">
                Để trống nếu quy trình không có thông số
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Hàng 1: Thời gian sát trùng | ≥ [ô số] | phút */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="sm:col-span-5 text-xs font-semibold text-cyan-100">
                  Thời gian sát trùng
                </div>
                <div className="sm:col-span-5 flex items-center gap-2">
                  <span className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-cyan-300/25 text-xs font-mono font-bold text-emerald-300 select-none">
                    ≥
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={disinfectMinInput}
                    onChange={(e) => {
                      setDisinfectMinInput(e.target.value);
                      if (fieldErrors.disinfectMin) {
                        setFieldErrors((prev) => ({ ...prev, disinfectMin: undefined }));
                      }
                    }}
                    placeholder="VD: 30"
                    className={`w-full px-3 py-1.5 rounded-lg bg-white/10 border focus:outline-none text-sm font-mono text-white placeholder-cyan-100/40 ${
                      fieldErrors.disinfectMin
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'border-cyan-300/30 focus:border-emerald-300'
                    }`}
                  />
                </div>
                <div className="sm:col-span-2 text-xs font-mono text-cyan-200/80 sm:text-right">
                  phút
                </div>
              </div>
              {fieldErrors.disinfectMin && (
                <p className="text-xs text-amber-300">{fieldErrors.disinfectMin}</p>
              )}

              {/* Hàng 2: Nồng độ pha thuốc | [1] : [100] | tỷ lệ */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="sm:col-span-5 text-xs font-semibold text-cyan-100">
                  Nồng độ pha thuốc
                </div>
                <div className="sm:col-span-5 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dilutionPartA}
                    onChange={(e) => {
                      setDilutionPartA(e.target.value);
                      if (fieldErrors.dilution) {
                        setFieldErrors((prev) => ({ ...prev, dilution: undefined }));
                      }
                    }}
                    placeholder="1"
                    className={`w-16 text-center px-2.5 py-1.5 rounded-lg bg-white/10 border focus:outline-none text-sm font-mono text-white placeholder-cyan-100/40 ${
                      fieldErrors.dilution
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'border-cyan-300/30 focus:border-emerald-300'
                    }`}
                  />
                  <span className="text-sm font-mono font-bold text-cyan-200 select-none">:</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dilutionPartB}
                    onChange={(e) => {
                      setDilutionPartB(e.target.value);
                      if (fieldErrors.dilution) {
                        setFieldErrors((prev) => ({ ...prev, dilution: undefined }));
                      }
                    }}
                    placeholder="100"
                    className={`w-full px-3 py-1.5 rounded-lg bg-white/10 border focus:outline-none text-sm font-mono text-white placeholder-cyan-100/40 ${
                      fieldErrors.dilution
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'border-cyan-300/30 focus:border-emerald-300'
                    }`}
                  />
                </div>
                <div className="sm:col-span-2 text-xs font-mono text-cyan-200/80 sm:text-right">
                  tỷ lệ
                </div>
              </div>
              {fieldErrors.dilution && (
                <p className="text-xs text-amber-300">{fieldErrors.dilution}</p>
              )}
            </div>
          </div>

          {/* e) Nội dung quy trình * */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cyan-100">
              Nội dung quy trình *
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: undefined }));
              }}
              placeholder="Dán toàn bộ các bước thao tác chuẩn, nhiệt độ, thời gian tiếp xúc, tiêu chí kiểm tra..."
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white/10 border focus:outline-none text-sm text-white font-sans leading-relaxed placeholder-cyan-100/50 transition-all ${
                fieldErrors.content
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                  : 'border-cyan-300/30 focus:border-emerald-300'
              }`}
            />
            {fieldErrors.content && (
              <p className="text-xs text-amber-300">{fieldErrors.content}</p>
            )}
          </div>

          {/* f) Lưu ý cảnh báo (không bắt buộc) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Lưu ý cảnh báo (không bắt buộc)</span>
            </label>
            <textarea
              rows={3}
              value={warning}
              onChange={(e) => setWarning(e.target.value)}
              placeholder="Nhập cảnh báo quan trọng hoặc điểm kiểm soát tới hạn (nếu có)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 focus:border-amber-300 focus:outline-none text-sm text-white font-sans leading-relaxed placeholder-amber-100/45"
            />
          </div>

          {/* g) 2 Nút Lưu riêng cho Gà và Heo */}
          <div className="pt-3 border-t border-teal-300/20 flex flex-col sm:flex-row items-center justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-cyan-100 cursor-pointer"
              >
                Hủy
              </button>
            )}

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              onClick={() => handleSaveSop('ga')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-md shadow-amber-400/25 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Nạp Quy Trình Gà</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              onClick={() => handleSaveSop('heo')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-md shadow-cyan-400/25 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Nạp Quy Trình Heo</span>
            </motion.button>
          </div>
        </div>

        {/* Cột Phải: Mục 2 (Nạp nhanh từ file & Sao lưu) + Mục 3 (Cấu hình bộ máy AI) */}
        <div className="lg:col-span-5 space-y-6">
          {/* MỤC 2: NẠP NHANH TỪ FILE */}
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-teal-300/20 pb-3">
              <div className="flex items-center gap-2.5">
                <FileUp className="w-5 h-5 text-cyan-300 shrink-0" />
                <h2 className="text-base font-bold text-white">
                  2. Nạp Nhanh Từ File
                </h2>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleTxt}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-xs font-semibold text-cyan-200 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>File mẫu (.TXT)</span>
              </button>
            </div>

            <p className="text-xs text-cyan-100/75 leading-relaxed">
              Hỗ trợ file <code className="text-cyan-200 font-mono">.TXT</code> (phân cách bằng dòng <code className="font-mono">---</code>), <code className="text-cyan-200 font-mono">.CSV</code> (<code className="font-mono">title,area,zone,disinfect_min,dilution,content,warning</code>) hoặc <code className="text-cyan-200 font-mono">.JSON</code>.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                onClick={() => {
                  setBulkSpeciesTarget('ga');
                  bulkFileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-xs font-bold text-amber-200 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Nạp thêm vào Gà</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                onClick={() => {
                  setBulkSpeciesTarget('heo');
                  bulkFileInputRef.current?.click();
                }}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-xs font-bold text-emerald-200 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Nạp thêm vào Heo</span>
              </motion.button>

              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".txt,.csv,.json"
                onChange={handleBulkUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* MỤC 3: CẤU HÌNH BỘ MÁY AI */}
          <div className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] space-y-4">
            <div className="flex items-center justify-between border-b border-teal-300/20 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                <h2 className="text-base font-bold text-white">
                  3. Cấu Hình Bộ Máy AI
                </h2>
              </div>
            </div>

            <p className="text-xs text-cyan-100/75 leading-relaxed">
              Hướng dẫn bổ sung cho Trợ lý ATSH khi giải đáp quy trình (áp dụng kèm theo quy tắc RAG bắt buộc của hệ thống).
            </p>

            <textarea
              rows={4}
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              placeholder="Nhập chỉ dẫn văn phong hoặc lưu ý trình bày cho AI..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-cyan-300/30 focus:border-emerald-300 focus:outline-none text-xs text-white leading-relaxed placeholder-cyan-100/45"
            />

            <div className="flex justify-end">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSaveSystemPrompt(promptDraft)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-bold text-xs shadow cursor-pointer"
              >
                Lưu Cấu Hình AI
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* MỤC 4: DANH SÁCH QUY TRÌNH ĐÃ NẠP */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-teal-300/25 overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.35)]">
        <div className="px-6 py-4 bg-white/[0.03] border-b border-teal-300/20 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">
              4. Danh Sách Quy Trình Trong Hệ Thống ({allSops.length} Quy trình)
            </h2>
            <p className="text-xs text-cyan-100/75">
              Đồng bộ trực tiếp từ Supabase · Nhấn Sửa để cập nhật hoặc Xóa để gỡ khỏi hệ thống.
            </p>
          </div>

          {/* Species Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-cyan-300/25">
            <button
              type="button"
              onClick={() => setTableSpeciesFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tableSpeciesFilter === 'ALL'
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow'
                  : 'text-cyan-100 hover:text-white'
              }`}
            >
              Tất Cả ({allSops.length})
            </button>
            <button
              type="button"
              onClick={() => setTableSpeciesFilter('ga')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tableSpeciesFilter === 'ga'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-cyan-100 hover:text-white'
              }`}
            >
              Trại Gà ({gaSops.length})
            </button>
            <button
              type="button"
              onClick={() => setTableSpeciesFilter('heo')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tableSpeciesFilter === 'heo'
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'text-cyan-100 hover:text-white'
              }`}
            >
              Trại Heo ({heoSops.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-teal-300/20 bg-slate-950/60 text-[11px] font-mono text-cyan-100/80">
                <th className="py-3 px-4">LOÀI</th>
                <th className="py-3 px-4">TÊN QUY TRÌNH SOP</th>
                <th className="py-3 px-4">KHU VỰC</th>
                <th className="py-3 px-4">VÙNG</th>
                <th className="py-3 px-4">SÁT TRÙNG</th>
                <th className="py-3 px-4">NỒNG ĐỘ PHA</th>
                <th className="py-3 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-300/15 text-sm">
              {displayedSops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-cyan-200/60">
                    Không có quy trình nào trong danh mục này. Hãy nạp quy trình mới bên trên.
                  </td>
                </tr>
              ) : (
                displayedSops.map((sop) => {
                  const zoneBadge = getZoneTypeBadge(sop.zone_type);
                  const hasDisinfect =
                    sop.disinfect_min !== null &&
                    sop.disinfect_min !== undefined &&
                    Number(sop.disinfect_min) > 0;
                  const hasDilution = Boolean(sop.dilution && sop.dilution.trim() !== '');

                  return (
                    <tr key={sop.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            sop.species === 'ga'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/35'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                          }`}
                        >
                          {sop.species === 'ga' ? '🐔 TRẠI GÀ' : '🐷 TRẠI HEO'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-white">{sop.title}</div>
                        <div className="text-xs text-cyan-100/70 line-clamp-1 mt-0.5">
                          {sop.content.replace(/[#*`-]/g, '').slice(0, 100)}
                          {sop.content.length > 100 ? '...' : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-cyan-100 whitespace-nowrap">
                        {sop.area || '-'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${zoneBadge.colorClass}`}
                        >
                          <span>{zoneBadge.glyph}</span>
                          <span>{zoneBadge.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-emerald-300 whitespace-nowrap">
                        {hasDisinfect ? `≥ ${sop.disinfect_min} phút` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-cyan-200 whitespace-nowrap">
                        {hasDilution ? sop.dilution : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditClick(sop)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-semibold text-cyan-300 border border-cyan-400/30 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId({ id: sop.id, title: sop.title })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-xs font-semibold text-rose-300 border border-rose-500/30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-300">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-white">Xác nhận xóa quy trình</h3>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed">
                Anh/Chị có chắc chắn muốn xóa quy trình{' '}
                <strong className="text-white">&ldquo;{confirmDeleteId.title}&rdquo;</strong> khỏi Supabase?
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSop(confirmDeleteId.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer"
                >
                  Xóa Vĩnh Viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
