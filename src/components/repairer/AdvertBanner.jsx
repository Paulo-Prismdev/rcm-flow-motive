import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ADVERTS = [
  {
    id: 1,
    title: "New Parts Portal",
    description: "Order parts directly through ARTECH One - faster delivery, better prices!",
    bgColor: "from-blue-500/20 to-blue-600/10",
    textColor: "text-blue-700 dark:text-blue-300"
  },
  {
    id: 2,
    title: "Training Available",
    description: "Free estimating training sessions available - contact us to book your place.",
    bgColor: "from-green-500/20 to-green-600/10",
    textColor: "text-green-700 dark:text-green-300"
  },
  {
    id: 3,
    title: "Preferred Repairer Scheme",
    description: "Join our preferred repairer network for priority work allocation.",
    bgColor: "from-purple-500/20 to-purple-600/10",
    textColor: "text-purple-700 dark:text-purple-300"
  },
  {
    id: 4,
    title: "Quality Bonus Programme",
    description: "Earn bonus payments for exceptional repair quality scores.",
    bgColor: "from-amber-500/20 to-amber-600/10",
    textColor: "text-amber-700 dark:text-amber-300"
  }
];

export default function AdvertBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ADVERTS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + ADVERTS.length) % ADVERTS.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % ADVERTS.length);
  };

  const currentAd = ADVERTS[currentIndex];

  return (
    <div 
      className={`relative px-4 py-2 md:py-3 bg-gradient-to-r ${currentAd.bgColor} transition-all duration-500`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between gap-2">
        <button 
          onClick={goToPrevious}
          className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex-1 text-center min-w-0">
          <p className={`font-semibold text-sm md:text-base ${currentAd.textColor}`}>
            {currentAd.title}
          </p>
          <p className="text-xs md:text-sm text-foreground-muted truncate">
            {currentAd.description}
          </p>
        </div>

        <button 
          onClick={goToNext}
          className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-1.5">
        {ADVERTS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-accent w-3' 
                : 'bg-foreground-subtle/40 hover:bg-foreground-subtle/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}