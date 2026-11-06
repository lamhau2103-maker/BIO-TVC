import React, { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { BioZone } from '../types/biosecurity';
import { ResilientImage } from './ResilientImage';

interface LightboxModalProps {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  zoneLabel?: string;
  zone?: BioZone;
  caption?: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  imageUrl,
  title,
  zoneLabel,
  zone = 'GENERAL',
  caption,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const zoneTextColor =
    zone === 'RED'
      ? 'text-red-400'
      : zone === 'YELLOW' || zone === 'RED_YELLOW'
      ? 'text-amber-400'
      : zone === 'GREEN'
      ? 'text-emerald-400'
      : 'text-cyan-400';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full max-w-5xl bg-[#0F172A] border border-white/15 rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10 bg-[#0B1120]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className={`font-medium ${zoneTextColor}`}>
                {zoneLabel || 'Hình Ảnh Minh Họa Quy Trình Chuẩn'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">HỆ THỐNG AN TOÀN SINH HỌC</span>
            </div>
            <h3 className="text-sm md:text-base font-semibold text-slate-100 truncate">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Đóng (ESC)
          </button>
        </div>

        <div className="bg-[#070B14] max-h-[75vh] flex items-center justify-center overflow-hidden">
          <ResilientImage
            src={imageUrl}
            alt={title}
            zone={zone}
            containerClassName="w-full h-full max-h-[75vh] flex items-center justify-center"
            className="w-full max-h-[72vh] object-contain"
          />
        </div>

        {caption && (
          <div className="px-5 py-3 bg-[#0B1120] border-t border-white/10 text-xs text-slate-300 leading-relaxed">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};
