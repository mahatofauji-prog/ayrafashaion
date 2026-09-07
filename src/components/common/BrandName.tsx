import React from 'react';

interface BrandNameProps {
  name?: string;
  className?: string;
  spaceClass?: string;
}

export const BrandName: React.FC<BrandNameProps> = ({
  name = 'AYRA FASHION',
  className = '',
  spaceClass = 'ml-1.5 sm:ml-2',
}) => {
  const cleanName = (name || 'AYRA FASHION').trim();
  const parts = cleanName.split(/\s+/);

  if (parts.length >= 2) {
    const firstPart = parts[0];
    const secondPart = parts.slice(1).join(' ');

    return (
      <span className={`font-brand-logo uppercase select-none ${className} inline-flex items-center whitespace-nowrap`}>
        <span className="text-[#E51A1A] font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{firstPart}</span>
        <span className={`text-[#B8860B] font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${spaceClass}`}>{secondPart}</span>
        <span className="relative inline-flex items-center justify-center text-[5px] sm:text-[6.5px] font-bold font-sans w-[12px] h-[12px] sm:w-[15px] sm:h-[15px] rounded-full border border-[#D4AF37] text-[#D4AF37] ml-1 bg-black/60 align-middle bottom-[0.35em] tracking-normal leading-none shrink-0 mr-1.5 sm:mr-0">
          TM
        </span>
      </span>
    );
  }

  return (
    <span className={`font-brand-logo uppercase text-[#E51A1A] font-black select-none ${className} inline-flex items-center whitespace-nowrap`}>
      {cleanName}
      <span className="relative inline-flex items-center justify-center text-[5px] sm:text-[6.5px] font-bold font-sans w-[12px] h-[12px] sm:w-[15px] sm:h-[15px] rounded-full border border-[#D4AF37] text-[#D4AF37] ml-1 bg-black/60 align-middle bottom-[0.35em] tracking-normal leading-none shrink-0 mr-1.5 sm:mr-0">
        TM
      </span>
    </span>
  );
};
