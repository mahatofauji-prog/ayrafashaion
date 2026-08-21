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
      <span className={`font-brand-logo uppercase select-none ${className}`}>
        <span className="text-[#E51A1A] font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{firstPart}</span>
        <span className={`text-[#D4AF37] font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${spaceClass}`}>{secondPart}</span>
      </span>
    );
  }

  return (
    <span className={`font-brand-logo uppercase text-[#E51A1A] font-black select-none ${className}`}>
      {cleanName}
    </span>
  );
};
