import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Timer({ onTimeUpdate }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => {
        const newValue = prev + 1;
        if (onTimeUpdate) {
          onTimeUpdate(newValue);
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUpdate]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="neomorph-flat px-4 py-2 flex items-center gap-2 text-gray-600">
      <Clock className="w-4 h-4 text-gold" />
      <span className="font-mono font-medium">{formatTime(seconds)}</span>
    </div>
  );
}