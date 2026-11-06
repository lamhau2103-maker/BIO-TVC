import React, { useState, useRef } from 'react';
import {
  Lock,
  Unlock,
  PlusCircle,
  Save,
  Trash2,
  Edit3,
  Upload,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  RotateCcw,
  KeyRound,
  Cpu,
  FileUp,
  Eye,
  X,
} from 'lucide-react';
import {
  BioZone,
  SopDocument,
  SopKeyMetric,
} from '../types/biosecurity';
import {
  IMG_TRUCK_WASH,
  PRESET_BIO_IMAGES,
  DEFAULT_SYSTEM_PROMPT,
} from '../data/seedSops';
import {
  getZoneDisplayLabel,
  getZoneSemanticStyle,
  parseBulkImportFile,
} from '../utils/ragMatcher';
import { ResilientImage } from './ResilientImage';

interface AdminPortalProps {
  sops: SopDocument[];
  areaCatalog: string[];
  onUpdateAreaCatalog: (nextCatalog: string[]) => void;
  isUnlocked: boolean;
  adminId: string;
  adminPassword: string;
  systemPrompt: string;
  onUnlock: () => void;
  onLock: () => void;
  onBackToMain: () => void;
  onChangeCredentials: (newId: string, newPass: string) => void;
  onSaveSop: (sop: SopDocument, isEdit: boolean) => void;
  onDeleteSop: (id: string) => void;
  onToggleActiveSop: (id: string) => void;
  onBulkAddSops: (importedSops: SopDocument[], replaceAll?: boolean) => void;
  onResetSeedData: () => void;
  onSaveSystemPrompt: (prompt: string) => void;
  onNotify: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
  onOpenLightbox: (img: {
    url: string;
    title: string;
    zoneLabel?: string;
    zone?: BioZone;
    caption?: string;
  }) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  sops,
  areaCatalog,
  onUpdateAreaCatalog,
  isUnlocked,
  adminId,
  adminPassword,
  systemPrompt,
  onUnlock,
  onLock,
  onBackToMain,
  onChangeCredentials,
  onSaveSop,
  onDeleteSop,
  onToggleActiveSop,
  onBulkAddSops,
  onResetSeedData,
  onSaveSystemPrompt,
  onNotify,
  onOpenLightbox,
}) => {
  // Login overlay state (ID: Admin, Password: adminbio)
  const [idInput, setIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newIdInput, setNewIdInput] = useState(adminId);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showCredentialsChange, setShowCredentialsChange] = useState(false);

  // SOP Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('SOP-RED-006');
  const [title, setTitle] = useState('');
  const [zone, setZone] = useState<BioZone>('RED');
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['Vùng Đỏ · Ngoại Vi & Trạm Rửa Xe']);
  const [newAreaInput, setNewAreaInput] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState(IMG_TRUCK_WASH);
  const [summary, setSummary] = useState('');
  const [criticalWarning, setCriticalWarning] = useState('');
  const [content, setContent] = useState('');
  const [metrics, setMetrics] = useState<SopKeyMetric[]>([
    { label: 'Thời gian sát trùng', value: '≥ 30', unit: 'phút' },
    { label: 'Nồng độ pha thuốc', value: '1:100', unit: 'tỷ lệ' },
  ]);
  const [showPresetGallery, setShowPresetGallery] = useState(false);

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // AI System Prompt state
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(systemPrompt);

  // File refs
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const restoreJsonInputRef = useRef<HTMLInputElement>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idInput.trim() === adminId && passwordInput === adminPassword) {
      setLoginError('');
      setIdInput('');
      setPasswordInput('');
      onUnlock();
      onNotify(
        'success',
        'Đăng nhập Quản trị thành công',
        'Anh/Chị đã mở khóa Cổng Admin Quản lý Tri thức An toàn sinh học.'
      );
    } else {
      setLoginError('Bạn nhập sai tài khoản hoặc mật khẩu.');
    }
  };

  const inferZoneFromAreaText = (areaText: string): BioZone => {
    const lower = areaText.toLowerCase();
    if (lower.includes('đỏ') && lower.includes('vàng')) return 'RED_YELLOW';
    if (lower.includes('đỏ') || lower.includes('rửa xe') || lower.includes('ngoại vi')) return 'RED';
    if (lower.includes('vàng') || lower.includes('nhà tắm') || lower.includes('vật tư') || lower.includes('cách ly'))
      return 'YELLOW';
    if (lower.includes('xanh') || lower.includes('sản xuất') || lower.includes('chuồng')) return 'GREEN';
    return 'GENERAL';
  };

  const handleAddArea = () => {
    const trimmed = newAreaInput.trim();
    if (!trimmed) return;
    setSelectedAreas((prev) => {
      const next = prev.includes(trimmed) ? prev : [...prev, trimmed];
      setZone(inferZoneFromAreaText(next.join(' · ')));
      return next;
    });
    if (!areaCatalog.includes(trimmed)) {
      onUpdateAreaCatalog([...areaCatalog, trimmed]);
      onNotify(
        'success',
        'Đã thêm Khu Vực mới',
        `Khu vực "${trimmed}" đã được thêm và cập nhật vào bộ lọc Quy Trình Hệ Thống.`
      );
    }
    setNewAreaInput('');
  };

  const handleRemoveSelectedArea = (areaToRemove: string) => {
    setSelectedAreas((prev) => {
      const next = prev.filter((item) => item !== areaToRemove);
      if (next.length > 0) {
        setZone(inferZoneFromAreaText(next.join(' · ')));
      }
      return next;
    });
  };

  const handleToggleCatalogArea = (areaName: string) => {
    setSelectedAreas((prev) => {
      const exists = prev.includes(areaName);
      const next = exists ? prev.filter((item) => item !== areaName) : [...prev, areaName];
      if (next.length > 0) {
        setZone(inferZoneFromAreaText(next.join(' · ')));
      }
      return next;
    });
  };

  const handleDeleteFromCatalog = (areaName: string) => {
    onUpdateAreaCatalog(areaCatalog.filter((item) => item !== areaName));
    setSelectedAreas((prev) => prev.filter((item) => item !== areaName));
  };

  const resetForm = () => {
    setEditingId(null);
    setCode(`SOP-BIO-${String(sops.length + 1).padStart(3, '0')}`);
    setTitle('');
    setZone('RED');
    setSelectedAreas(['Vùng Đỏ · Ngoại Vi & Trạm Rửa Xe']);
    setNewAreaInput('');
    setTagsInput('');
    setImageUrl(IMG_TRUCK_WASH);
    setSummary('');
    setCriticalWarning('');
    setContent('');
    setMetrics([
      { label: 'Thời gian sát trùng', value: '≥ 30', unit: 'phút' },
      { label: 'Nồng độ pha thuốc', value: '1:100', unit: 'tỷ lệ' },
    ]);
  };

  const handleEditClick = (sop: SopDocument) => {
    setEditingId(sop.id);
    setCode(sop.code);
    setTitle(sop.title);
    setZone(sop.zone);
    const areas = (sop.zoneLabel || getZoneDisplayLabel(sop.zone))
      .split(' | ')
      .map((s) => s.trim())
      .filter(Boolean);
    setSelectedAreas(areas.length > 0 ? areas : [getZoneDisplayLabel(sop.zone)]);
    setNewAreaInput('');
    setTagsInput(sop.tags.join(', '));
    setImageUrl(sop.imageUrl);
    setSummary(sop.summary);
    setCriticalWarning(sop.criticalWarning);
    setContent(sop.content);
    setMetrics(
      sop.keyMetrics.length > 0
        ? sop.keyMetrics
        : [{ label: 'Thời gian tiếp xúc', value: '≥ 30', unit: 'phút' }]
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      onNotify('warning', 'Ảnh quá lớn', 'Vui lòng chọn file ảnh dưới 4MB để tối ưu bộ nhớ.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        onNotify('success', 'Đã tải ảnh minh họa', `Đã chuyển đổi "${file.name}" sang Base64.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      onNotify(
        'error',
        'Thiếu thông tin bắt buộc',
        'Vui lòng nhập đầy đủ Tên quy trình và Nội dung chi tiết quy trình.'
      );
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const finalAreas = [...selectedAreas];
    if (newAreaInput.trim() && !finalAreas.includes(newAreaInput.trim())) {
      finalAreas.push(newAreaInput.trim());
    }
    const updatedCatalog = [...areaCatalog];
    let catalogChanged = false;
    for (const a of finalAreas) {
      if (a && !updatedCatalog.includes(a)) {
        updatedCatalog.push(a);
        catalogChanged = true;
      }
    }
    if (catalogChanged) {
      onUpdateAreaCatalog(updatedCatalog);
    }

    const finalZoneLabel =
      finalAreas.length > 0 ? finalAreas.join(' | ') : getZoneDisplayLabel(zone);
    const finalZone = inferZoneFromAreaText(finalZoneLabel);

    const newSop: SopDocument = {
      id: editingId || `sop-${Date.now()}`,
      code: code.trim() || `SOP-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      zone: finalZone,
      zoneLabel: finalZoneLabel,
      tags: parsedTags.length > 0 ? parsedTags : ['atsh', 'quy trình trại heo'],
      imageUrl: imageUrl.trim() || IMG_TRUCK_WASH,
      summary:
        summary.trim() ||
        content
          .replace(/[#*`-]/g, '')
          .trim()
          .slice(0, 165) + '...',
      criticalWarning:
        criticalWarning.trim() ||
        'Tuân thủ nghiêm ngặt quy trình phân vùng 1 chiều và định lượng thuốc sát trùng.',
      content: content.trim(),
      keyMetrics: metrics.filter((m) => m.label.trim() && m.value.trim()),
      active: true,
      updatedAt: new Date().toISOString(),
    };

    onSaveSop(newSop, Boolean(editingId));
    resetForm();
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>, replaceAll = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const imported = parseBulkImportFile(file.name, text);
        if (imported.length === 0) {
          onNotify(
            'error',
            'Không tìm thấy quy trình hợp lệ',
            'File tải lên không chứa cấu trúc quy trình hợp lệ.'
          );
          return;
        }
        onBulkAddSops(imported, replaceAll);
      } catch (err) {
        onNotify(
          'error',
          'Lỗi đọc file',
          err instanceof Error ? err.message : 'Định dạng file không hợp lệ.'
        );
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(sops, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `he-thong-atsh-knowledge-base-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify(
      'success',
      'Đã sao lưu Knowledge Base (.JSON)',
      `Đã tải xuống ${sops.length} quy trình chuẩn từ bộ nhớ hệ thống.`
    );
  };

  const handleMetricChange = (index: number, field: keyof SopKeyMetric, val: string) => {
    setMetrics((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: val } : m)));
  };

  return (
    <div className="relative min-h-[680px]">
      {/* SECURITY BLUR OVERLAY WHEN LOCKED */}
      {!isUnlocked && (
        <div className="fixed inset-0 z-30 bg-[#0B1120]/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-[#1E293B] border border-white/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-mono text-cyan-400">ĐĂNG NHẬP QUẢN TRỊ VIÊN</div>
                <h2 className="text-lg font-bold text-white">Cổng Quản Trị & Nạp Dữ Liệu</h2>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Vui lòng nhập <strong>ID Admin</strong> và <strong>Mật khẩu</strong> để truy cập khu vực quản lý và nạp dữ liệu quy trình An toàn sinh học.
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-id-input"
                  className="block text-xs font-medium text-slate-200"
                >
                  ID Quản trị:
                </label>
                <input
                  id="admin-id-input"
                  type="text"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  placeholder="Nhập tài khoản quản trị..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-sm text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-medium text-slate-200"
                >
                  Mật khẩu Quản trị:
                </label>
                <input
                  id="admin-password-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-sm text-white font-mono"
                />
              </div>

              {loginError && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/40 text-xs text-red-200">
                  {loginError}
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all cursor-pointer"
                >
                  Đăng Nhập Cổng Admin
                </button>
                <button
                  type="button"
                  onClick={onBackToMain}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 border border-white/15 text-slate-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Trở về giao diện chính
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN DASHBOARD CONTENT */}
      <div className="space-y-8">
        {/* Top Admin Status Bar */}
        <div className="rounded-xl bg-[#1E293B]/75 backdrop-blur-md border border-white/10 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="font-mono text-emerald-400">● QUẢN TRỊ DỮ LIỆU AN TOÀN SINH HỌC</span>
              <span aria-hidden="true">·</span>
              <span>
                Đang nạp {sops.filter((s) => s.active).length} / {sops.length} quy trình vào hệ thống
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Quản Trị & Huấn Luyện Dữ Liệu Quy Trình Cho Bot Học
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCredentialsChange((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-xs font-medium text-slate-200 border border-white/10 cursor-pointer whitespace-nowrap shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Đổi ID / Mật khẩu
            </button>
            <button
              type="button"
              onClick={onLock}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-xs font-semibold text-red-300 border border-red-500/30 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Unlock className="w-3.5 h-3.5" />
              Đăng Xuất Admin
            </button>
          </div>
        </div>

        {/* Optional Change Credentials Drawer */}
        {showCredentialsChange && (
          <div className="rounded-xl bg-[#0F172A] border border-cyan-500/30 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Cập nhật tài khoản Quản trị viên:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newIdInput}
                onChange={(e) => setNewIdInput(e.target.value)}
                placeholder="ID Admin mới..."
                className="px-3 py-1.5 rounded-lg bg-[#0B1120] border border-white/15 text-xs text-white font-mono"
              />
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Mật khẩu mới..."
                className="px-3 py-1.5 rounded-lg bg-[#0B1120] border border-white/15 text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newIdInput.trim() || newPasswordInput.trim().length < 4) {
                    onNotify(
                      'warning',
                      'Thông tin chưa hợp lệ',
                      'Vui lòng nhập ID và mật khẩu mới ít nhất 4 ký tự.'
                    );
                    return;
                  }
                  onChangeCredentials(newIdInput.trim(), newPasswordInput.trim());
                  setNewPasswordInput('');
                  setShowCredentialsChange(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        )}

        {/* GRID: 1. ADD/TRAIN SOP FORM (LEFT 7 COLS) & 2. BULK IMPORT + AI ENGINE SETTINGS (RIGHT 5 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 1. Form Nạp Quy Trình Mới (Add/Train SOP Item) */}
          <form
            onSubmit={handleSaveForm}
            className="lg:col-span-7 rounded-xl bg-[#1E293B]/75 backdrop-blur-md border border-white/10 p-6 space-y-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5 text-cyan-400 shrink-0" />
                <h2 className="text-base font-bold text-white">
                  {editingId
                    ? 'Đang Chỉnh Sửa Quy Trình'
                    : '1. Nạp Quy Trình Mới Cho Bot Học (Add / Train SOP)'}
                </h2>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-200">
                Tên quy trình / Chủ đề ATSH *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Quy trình kiểm tra & sát trùng xe vận chuyển cám..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-sm text-white"
              />
            </div>

            {/* Khu Vực (Add / Thêm Khu Vực) Section */}
            <div className="p-4 rounded-xl bg-[#0F172A] border border-white/10 space-y-3.5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-cyan-300">
                  Khu Vực (Nhập tên khu vực và nhấn Thêm) *
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={newAreaInput}
                    onChange={(e) => setNewAreaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddArea();
                      }
                    }}
                    placeholder="Nhập tên Khu Vực mới (VD: Khu Cách Ly, Trạm Rửa Xe, Chuồng Đẻ, Nhà Tắm...)..."
                    className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#0B1120] border border-cyan-500/40 focus:border-cyan-400 focus:outline-none text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddArea}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Thêm Khu Vực (Add)</span>
                  </button>
                </div>
              </div>

              {/* Selected Areas for current SOP */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400">
                  Khu Vực đang áp dụng cho quy trình này ({selectedAreas.length}):
                </div>
                {selectedAreas.length === 0 ? (
                  <div className="text-xs text-amber-400 py-1">
                    Chưa có Khu Vực nào được chọn. Hãy nhập và nhấn &ldquo;Thêm Khu Vực (Add)&rdquo; hoặc bấm chọn từ danh mục bên dưới.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedAreas.map((area) => (
                      <div
                        key={area}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-xs font-medium text-cyan-200"
                      >
                        <span>{area}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedArea(area)}
                          className="text-cyan-300 hover:text-red-400 transition-colors cursor-pointer"
                          title="Gỡ Khu Vực này khỏi quy trình"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved Area Catalog Quick-Add */}
              {areaCatalog.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <div className="text-[11px] text-slate-400">
                    Danh mục Khu Vực đã lưu (Nhấn để chọn / bỏ chọn nhanh — tự động đồng bộ sang Quy Trình Hệ Thống):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {areaCatalog.map((areaItem) => {
                      const isPicked = selectedAreas.includes(areaItem);
                      return (
                        <div
                          key={areaItem}
                          className={`inline-flex items-center rounded-lg border text-xs transition-colors ${
                            isPicked
                              ? 'bg-[#1E293B] border-cyan-500/50 text-cyan-300'
                              : 'bg-[#0B1120] border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleCatalogArea(areaItem)}
                            className="px-2.5 py-1 cursor-pointer text-left"
                          >
                            {isPicked ? '✓ ' : '+ '}
                            {areaItem}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFromCatalog(areaItem)}
                            className="px-1.5 py-1 text-slate-500 hover:text-red-400 border-l border-white/10 cursor-pointer"
                            title="Xóa khỏi danh mục lưu"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-xs font-medium text-slate-200">
                  Từ khóa nhận diện (Tags cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="VD: xe cám, bồn cám, phun sương, sát trùng cổng, vùng đỏ"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-sm text-white"
                />
              </div>
            </div>

            {/* Image Selection / Upload / Preset Picker */}
            <div className="space-y-2.5 p-4 rounded-xl bg-[#0F172A] border border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-200">
                  Hình ảnh minh họa quy trình (URL, Upload Base64 hoặc Chọn ảnh mẫu ATSH):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPresetGallery((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-semibold text-cyan-300 border border-cyan-500/30 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {showPresetGallery ? 'Ẩn bộ ảnh mẫu ATSH' : 'Chọn ảnh mẫu ATSH (6 ảnh)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => imageFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload ảnh (Base64)
                  </button>
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Dán link hình ảnh hoặc chọn từ thư viện mẫu..."
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-slate-200 font-mono"
                />
                <div className="w-20 h-12 rounded-lg overflow-hidden border border-white/15 shrink-0 bg-[#0B1120]">
                  <ResilientImage
                    src={imageUrl}
                    alt="Preview"
                    zone={zone}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Preset Images Drawer */}
              {showPresetGallery && (
                <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_BIO_IMAGES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setImageUrl(preset.url);
                        setShowPresetGallery(false);
                      }}
                      className={`group text-left rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        imageUrl === preset.url
                          ? 'border-cyan-400 ring-1 ring-cyan-400'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="h-20 w-full overflow-hidden bg-[#0B1120]">
                        <img
                          src={preset.url}
                          alt={preset.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2 bg-[#0B1120]">
                        <div className="text-[11px] font-medium text-slate-200 line-clamp-1">
                          {preset.title}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Key Metrics Editor */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-200">
                Thông số kỹ thuật định lượng chính (Hiển thị bảng số liệu nhanh):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0B1120] border border-white/10 grid grid-cols-12 gap-1.5"
                  >
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => handleMetricChange(idx, 'label', e.target.value)}
                      placeholder="Tên thông số (VD: Áp lực)"
                      className="col-span-6 px-2 py-1 rounded bg-[#1E293B] text-xs text-white"
                    />
                    <input
                      type="text"
                      value={m.value}
                      onChange={(e) => handleMetricChange(idx, 'value', e.target.value)}
                      placeholder="150–200"
                      className="col-span-3 px-2 py-1 rounded bg-[#1E293B] text-xs text-cyan-300 font-mono"
                    />
                    <input
                      type="text"
                      value={m.unit}
                      onChange={(e) => handleMetricChange(idx, 'unit', e.target.value)}
                      placeholder="bar"
                      className="col-span-3 px-2 py-1 rounded bg-[#1E293B] text-xs text-slate-300 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Critical Warning */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  Tóm tắt ngắn quy trình
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Tóm tắt 1-2 câu hiển thị trên thẻ Thư viện SOP..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-red-300">
                  Cảnh báo rủi ro (Lưu ý sống còn)
                </label>
                <textarea
                  rows={2}
                  value={criticalWarning}
                  onChange={(e) => setCriticalWarning(e.target.value)}
                  placeholder="VD: Tuyệt đối không cho xe vào trại khi chưa khô hoàn toàn..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B1120] border border-red-500/30 focus:border-red-400 focus:outline-none text-xs text-white"
                />
              </div>
            </div>

            {/* Detailed Content for AI RAG */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-200">
                Nội dung chi tiết quy trình (Dữ liệu chuẩn để Bot học - Hỗ trợ Markdown) *
              </label>
              <textarea
                rows={7}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dán toàn bộ các bước thực hiện, thông số kỹ thuật (thời gian, nhiệt độ, nồng độ pha thuốc, khoảng cách an toàn), tiêu chí kiểm tra Đạt / Không đạt..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-sm text-white font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingId ? 'Cập Nhật Quy Trình SOP' : 'Lưu & Nạp Vào Bộ Nhớ AI'}</span>
              </button>
            </div>
          </form>

          {/* RIGHT COLUMN: 2. BULK IMPORT/EXPORT & 4. AI ENGINE SETTINGS */}
          <div className="lg:col-span-5 space-y-6">
            {/* 2. Nạp Nhanh Từ File (Bulk Import/Export) */}
            <div className="rounded-xl bg-[#1E293B]/75 backdrop-blur-md border border-white/10 p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                <FileUp className="w-5 h-5 text-cyan-400 shrink-0" />
                <h2 className="text-base font-bold text-white">
                  2. Nạp Nhanh Từ File & Sao Lưu (Bulk Import / Export)
                </h2>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Hỗ trợ tải lên file <code className="text-cyan-300 font-mono">.TXT</code> (phân tách các quy trình bằng dòng <code className="font-mono">---</code>), <code className="text-cyan-300 font-mono">.CSV</code> hoặc <code className="text-cyan-300 font-mono">.JSON</code> để nạp hàng loạt quy trình vào Knowledge Base.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0F172A] hover:bg-cyan-500/15 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Nạp thêm từ .TXT / .CSV / .JSON</span>
                </button>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".txt,.csv,.json"
                  onChange={(e) => handleBulkUpload(e, false)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 border border-white/15 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Export Sao Lưu (.JSON)</span>
                </button>
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => restoreJsonInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-300 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Khôi phục toàn bộ từ bản sao lưu (.JSON)
                </button>
                <input
                  ref={restoreJsonInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => handleBulkUpload(e, true)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={onResetSeedData}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Khôi phục 5 quy trình mẫu mặc định
                </button>
              </div>
            </div>

            {/* 4. Cấu Hình AI (AI Engine Settings) */}
            <div className="rounded-xl bg-[#1E293B]/75 backdrop-blur-md border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
                  <h2 className="text-base font-bold text-white">
                    4. Cấu Hình Bộ Máy AI (AI Engine Settings)
                  </h2>
                </div>
                <span className="text-xs font-mono text-emerald-400">● GEMINI-3.8-FLASH</span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0F172A] border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Đã kết nối tự động với môi trường Server-Side AI Studio</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hệ thống sử dụng cơ chế RAG đối chiếu trực tiếp toàn bộ quy trình đang Active trong bảng bên dưới làm ngữ cảnh chuẩn (Context) khi giải đáp.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-200">
                    System Prompt bổ sung (Giọng điệu & Quy tắc xưng hô):
                  </label>
                  <button
                    type="button"
                    onClick={() => setDraftSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                    className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    Đặt lại mặc định
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={draftSystemPrompt}
                  onChange={(e) => setDraftSystemPrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1120] border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-white leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={() => onSaveSystemPrompt(draftSystemPrompt)}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-cyan-300 transition-colors cursor-pointer"
              >
                Lưu Cấu Hình System Prompt
              </button>
            </div>
          </div>
        </div>

        {/* 3. DANH SÁCH DỮ LIỆU ĐÃ NẠP (CRUD TABLE) */}
        <div className="rounded-xl bg-[#1E293B]/75 backdrop-blur-md border border-white/10 overflow-hidden">
          <div className="px-6 py-4 bg-[#0F172A] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                3. Danh Sách Quy Trình Đã Nạp Trong Bộ Nhớ AI ({sops.length} Quy trình)
              </h2>
              <p className="text-xs text-slate-400">
                Bật/Tắt trạng thái Active để cho phép hoặc tạm ngưng Bot sử dụng quy trình đó khi trả lời nhân viên.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#0B1120]/60 text-[11px] font-mono text-slate-400">
                  <th className="py-3 px-4">HÌNH ẢNH</th>
                  <th className="py-3 px-4">MÃ & TÊN QUY TRÌNH SOP</th>
                  <th className="py-3 px-4">KHU VỰC</th>
                  <th className="py-3 px-4">TỪ KHÓA NHẬN DIỆN</th>
                  <th className="py-3 px-4">TRẠNG THÁI AI HỌC</th>
                  <th className="py-3 px-4 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {sops.map((sop) => {
                  const zoneStyle = getZoneSemanticStyle(sop.zone);
                  return (
                    <tr
                      key={sop.id}
                      className={`hover:bg-[#0F172A]/60 transition-colors ${
                        !sop.active ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 w-24">
                        <div className="w-20 h-12 rounded-lg overflow-hidden border border-white/15 bg-[#0B1120] relative">
                          <ResilientImage
                            src={sop.imageUrl}
                            alt={sop.title}
                            zone={sop.zone}
                            containerClassName="w-full h-full cursor-pointer"
                            className="w-full h-full object-cover"
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
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="font-mono text-xs text-cyan-400">{sop.code}</div>
                        <div className="font-semibold text-white line-clamp-1">{sop.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {sop.summary}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold ${zoneStyle.textColor}`}>
                          {zoneStyle.glyph} {sop.zoneLabel || zoneStyle.shortTag}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-xs text-slate-300 line-clamp-2">
                          {sop.tags.join(' · ')}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleActiveSop(sop.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                            sop.active
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-white/10'
                          }`}
                        >
                          <span>{sop.active ? '● ACTIVE (Đang học)' : '○ TẠM TẮT'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenLightbox({
                                url: sop.imageUrl,
                                title: sop.title,
                                zoneLabel: sop.zoneLabel,
                                zone: sop.zone,
                                caption: sop.summary,
                              })
                            }
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 cursor-pointer"
                            title="Xem ảnh minh họa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClick(sop)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-medium text-cyan-300 border border-cyan-500/30 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Sửa
                          </button>

                          {confirmDeleteId === sop.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteSop(sop.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(sop.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-xs font-medium text-red-300 border border-red-500/30 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
