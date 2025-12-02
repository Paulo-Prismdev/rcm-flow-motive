import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// Fallback adverts if no custom ones are configured
const DEFAULT_ADVERTS = [
  {
    id: 'default-1',
    image_url: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=1200&h=200&fit=crop',
    link_url: '',
    alt_text: 'ARTECH One - Your Repair Management Partner'
  },
  {
    id: 'default-2',
    image_url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&h=200&fit=crop',
    link_url: '',
    alt_text: 'Quality Repairs, Quality Service'
  }
];

export default function AdvertBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch custom adverts from the AdvertBanner entity
  const { data: customAdverts = [], refetch } = useQuery({
    queryKey: ['advertBannersPortal'],
    queryFn: async () => {
      try {
        const adverts = await base44.entities.AdvertBanner.list('sort_order');
        // Filter active ones client-side to avoid RLS issues
        return adverts.filter(a => a.is_active !== false);
      } catch (e) {
        console.error('Failed to fetch adverts:', e);
        return [];
      }
    },
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const adverts = customAdverts.length > 0 ? customAdverts : DEFAULT_ADVERTS;

  useEffect(() => {
    if (isPaused || adverts.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % adverts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, adverts.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + adverts.length) % adverts.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % adverts.length);
  };

  const currentAd = adverts[currentIndex];

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
      {/* Image Container */}
      <div 
        className={`transition-opacity duration-500 ${currentAd.link_url ? 'cursor-pointer' : ''}`}
        onClick={handleAdClick}
      >
        <img 
          src={currentAd.image_url} 
          alt={currentAd.alt_text || 'Advertisement'}
          className="w-full h-auto min-h-[120px] md:min-h-0 object-cover"
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