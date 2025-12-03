import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function AdvertBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch custom adverts from the AdvertBanner entity
  const { data: adverts = [], isLoading } = useQuery({
    queryKey: ['advertBannersPortal'],
    queryFn: async () => {
      const fetchedAdverts = await base44.entities.AdvertBanner.list('sort_order');
      return fetchedAdverts.filter(a => a.is_active !== false);
    },
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (isPaused || adverts.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % adverts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, adverts.length]);

  const currentAd = adverts[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + adverts.length) % adverts.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % adverts.length);
  };

  // Don't render anything while loading or if no adverts
  if (isLoading || adverts.length === 0 || !currentAd) {
    return null;
  }

  const handleAdClick = () => {
    if (currentAd.link_url) {
      window.open(currentAd.link_url, '_blank');
    }
  };

  return (
    <div 
      className="relative w-full neomorph overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Image Container - Desktop */}
      <div 
        className={`hidden md:block transition-opacity duration-500 ${currentAd.link_url ? 'cursor-pointer' : ''}`}
        onClick={handleAdClick}
      >
        <img 
          src={currentAd.image_url} 
          alt={currentAd.alt_text || 'Advertisement'}
          className="w-full h-auto object-cover"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Image Container - Mobile */}
      <div 
        className={`md:hidden transition-opacity duration-500 ${currentAd.link_url ? 'cursor-pointer' : ''}`}
        onClick={handleAdClick}
      >
        <img 
          src={currentAd.mobile_image_url || currentAd.image_url} 
          alt={currentAd.alt_text || 'Advertisement'}
          className="w-full h-auto min-h-[120px] object-cover"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Navigation Arrows */}
      {adverts.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors z-10"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors z-10"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Dots indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {adverts.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white w-4' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}