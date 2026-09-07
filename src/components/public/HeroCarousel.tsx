import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { AdvertisementBanner, BusinessProfile } from '../../types';

interface HeroCarouselProps {
  banners: AdvertisementBanner[];
  businessProfile: BusinessProfile;
  isLoading?: boolean;
}

const FALLBACK_BANNER_URL = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80';

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ banners, businessProfile, isLoading }) => {
  // Only use active banners
  const activeBanners = banners
    .filter((b) => b.isActive && b.imageUrl)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoSlideTimer = useRef<NodeJS.Timeout | null>(null);

  // Fallback banner structure if no banners exist
  const displayBanners = activeBanners.length > 0
    ? activeBanners
    : [
        {
          id: 'fallback-banner',
          businessId: businessProfile.id || 'ayra-fashion',
          imageUrl: FALLBACK_BANNER_URL,
          isActive: true,
          displayOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

  const totalBanners = displayBanners.length;

  // Auto-sliding interval of 4.5 seconds
  const startAutoSlide = () => {
    stopAutoSlide();
    if (totalBanners > 1 && !isLoading) {
      autoSlideTimer.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalBanners);
      }, 4500);
    }
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
      autoSlideTimer.current = null;
    }
  };

  useEffect(() => {
    startAutoSlide();
    return () => stopAutoSlide();
  }, [currentIndex, totalBanners, isLoading]);

  const handlePrev = () => {
    stopAutoSlide();
    setCurrentIndex((prev) => (prev - 1 + totalBanners) % totalBanners);
    startAutoSlide();
  };

  const handleNext = () => {
    stopAutoSlide();
    setCurrentIndex((prev) => (prev + 1) % totalBanners);
    startAutoSlide();
  };

  const handleDotClick = (idx: number) => {
    stopAutoSlide();
    setCurrentIndex(idx);
    startAutoSlide();
  };

  // Touch Swipe Support
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLoading) return;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isLoading) return;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (isLoading) {
    return (
      <section id="hero-carousel-section" className="w-full relative">
        <div className="relative w-full aspect-[16/9] rounded-2xl sm:rounded-3xl border border-[#D4AF37]/20 shadow-2xl overflow-hidden bg-zinc-950/80 animate-pulse flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900/30 via-zinc-950/40 to-zinc-900/30" />
          <div className="flex flex-col items-center space-y-3 z-10">
            <div className="w-11 h-11 rounded-full border border-[#D4AF37]/30 bg-zinc-900/80 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-[#D4AF37] animate-spin" />
            </div>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-sans font-bold">
              AYRA FASHION Experience Loading...
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="hero-carousel-section"
      className="w-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative w-full aspect-[16/9] rounded-2xl sm:rounded-3xl border border-[#D4AF37]/40 shadow-2xl overflow-hidden bg-black select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={displayBanners[currentIndex].id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={displayBanners[currentIndex].imageUrl}
              alt={`${businessProfile.businessName} Advertisement Banner ${currentIndex + 1}`}
              className="w-full h-full object-cover object-center pointer-events-none"
              referrerPolicy="no-referrer"
            />
            {/* Soft Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* Featured Tag */}
        <div className="absolute top-3 right-3 sm:top-5 sm:right-5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase pointer-events-none z-10">
          Featured
        </div>

        {/* Desktop Arrow Navigation */}
        {totalBanners > 1 && (
          <>
            {/* Left Arrow */}
            <button
              onClick={handlePrev}
              className={`absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 border border-[#D4AF37]/30 hover:border-[#D4AF37] text-white hover:text-[#D4AF37] flex items-center justify-center transition-all duration-300 z-10 md:opacity-0 group-hover:opacity-100 ${
                isHovered ? 'md:opacity-100' : ''
              }`}
              title="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Right Arrow */}
            <button
              onClick={handleNext}
              className={`absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 border border-[#D4AF37]/30 hover:border-[#D4AF37] text-white hover:text-[#D4AF37] flex items-center justify-center transition-all duration-300 z-10 md:opacity-0 group-hover:opacity-100 ${
                isHovered ? 'md:opacity-100' : ''
              }`}
              title="Next slide"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Indicator Dots */}
        {totalBanners > 1 && (
          <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex items-center space-x-2 z-10">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                className={`transition-all duration-300 rounded-full h-1.5 sm:h-2 ${
                  currentIndex === idx
                    ? 'w-6 sm:w-8 bg-[#D4AF37] border border-[#D4AF37]'
                    : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
