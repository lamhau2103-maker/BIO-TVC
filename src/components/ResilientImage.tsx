import React, { useState } from 'react';
import { ShieldAlert, ZoomIn } from 'lucide-react';
import { BioZone } from '../types/biosecurity';

interface ResilientImageProps {
  src: string;
  alt: string;
  zone?: BioZone;
  className?: string;
  containerClassName?: string;
  onExpandClick?: () => void;
  showExpandHint?: boolean;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  zone = 'GENERAL',
  className = 'w-full h-full object-cover',
  containerClassName = 'relative overflow-hidden bg-[#0F172A]',
  onExpandClick,
  showExpandHint = false,
}) => {
  const [hasError, setHasError] = useState(false);

  const fallbackAccent =
    zone === 'RED'
      ? 'from-red-950/80 via-[#0F172A] to-[#0B1120] border-red-500/20'
      : zone === 'YELLOW' || zone === 'RED_YELLOW'
      ? 'from-amber-950/80 via-[#0F172A] to-[#0B1120] border-amber-500/20'
      : zone === 'GREEN'
      ? 'from-emerald-950/80 via-[#0F172A] to-[#0B1120] border-emerald-500/20'
      : 'from-cyan-950/80 via-[#0F172A] to-[#0B1120] border-cyan-500/20';

  if (hasError || !src) {
    return (
      <div
        className={`${containerClassName} bg-gradient-to-br ${fallbackAccent} flex flex-col items-center justify-center p-6 text-center`}
      >
        <ShieldAlert className="w-8 h-8 text-cyan-400/70 mb-2 shrink-0" />
        <p className="text-xs font-medium text-slate-300 max-w-xs line-clamp-2">{alt}</p>
        <span className="text-[11px] font-mono text-slate-500 mt-1">HỆ THỐNG AN TOÀN SINH HỌC</span>
      </div>
    );
  }

  return (
    <div
      className={`${containerClassName} group ${onExpandClick ? 'cursor-pointer' : ''}`}
      onClick={onExpandClick}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${className} transition-transform duration-200 group-hover:scale-[1.02]`}
      />
      {showExpandHint && onExpandClick && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-end justify-between p-3.5">
          <span className="text-xs font-medium text-slate-100 truncate pr-2">{alt}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-white/15 text-xs font-medium text-cyan-300 whitespace-nowrap shrink-0">
            <ZoomIn className="w-3.5 h-3.5" />
            Phóng to ảnh
          </span>
        </div>
      )}
    </div>
  );
};
