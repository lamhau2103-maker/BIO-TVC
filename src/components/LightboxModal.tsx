import React, { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BioZone } from '../types/biosecurity';
import { getZoneSemanticStyle } from '../utils/ragMatcher';
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

  const zoneStyle = getZoneSemanticStyle(zone);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-[#060B14]/85 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.94, y: 12, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="relative w-full max-w-5xl bg-slate-900/60 backdrop-blur-2xl border border-white/15 rounded-2xl overflow-hidden shadow-[0_8px_40px_0_rgba(0,0,0,0.65)] ring-1 ring-inset ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10 bg-[#060B14]/70">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${zoneStyle.badgeClass}`}
                  >
                    <span>{zoneStyle.glyph}</span>
                    <span>{zoneLabel || 'Hình Ảnh Minh Họa Quy Trình Chuẩn'}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[#94A3B8]">HỆ THỐNG AN TOÀN SINH HỌC</span>
                </div>
                <h3 className="text-sm md:text-base font-semibold text-[#F8FAFC] truncate">
                  {title}
                </h3>
              </div>
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#F8FAFC] border border-white/10 hover:border-emerald-400/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Đóng (ESC)
              </motion.button>
            </div>

            <div className="bg-[#060B14]/90 max-h-[75vh] flex items-center justify-center overflow-hidden">
              <ResilientImage
                src={imageUrl}
                alt={title}
                zone={zone}
                containerClassName="w-full h-full max-h-[75vh] flex items-center justify-center"
                className="w-full max-h-[72vh] object-contain"
              />
            </div>

            {caption && (
              <div className="px-5 py-3.5 bg-[#060B14]/80 border-t border-white/10 text-xs text-[#94A3B8] leading-relaxed">
                {caption}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
