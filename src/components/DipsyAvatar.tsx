import { useState } from 'react';

interface DipsyAvatarProps {
  src: string;
  alt?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DipsyAvatar({
  src,
  alt = 'Ilustrasi tokoh DIPSI berwarna hijau dengan antena lurus yang ceria',
  className = '',
  size = 'md',
}: DipsyAvatarProps) {
  const [failed, setFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-12 rounded-2xl',
    md: 'w-24 h-24 rounded-3xl',
    lg: 'w-44 h-44 sm:w-52 sm:h-52 rounded-[2rem]',
  }[size];

  if (failed || !src) {
    return (
      <div
        className={`${sizeClasses} bg-gradient-to-b from-sky-100 to-emerald-100 border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
        role="img"
        aria-label={alt}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full p-2" aria-hidden="true">
          <rect x="57" y="8" width="6" height="24" rx="3" fill="#65A30D" />
          <circle cx="32" cy="54" r="10" fill="#84CC16" />
          <circle cx="88" cy="54" r="10" fill="#84CC16" />
          <circle cx="60" cy="60" r="32" fill="#84CC16" />
          <ellipse cx="60" cy="64" rx="22" ry="18" fill="#FDE68A" />
          <circle cx="51" cy="60" r="3.2" fill="#14261C" />
          <circle cx="69" cy="60" r="3.2" fill="#14261C" />
          <path
            d="M52 70 Q60 77 68 70"
            fill="none"
            stroke="#14261C"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <rect x="46" y="92" width="28" height="16" rx="4" fill="#0F766E" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} bg-emerald-50 border border-emerald-200/80 overflow-hidden shrink-0 shadow-sm ${className}`}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
