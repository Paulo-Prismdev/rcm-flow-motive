import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';

/**
 * VoiceInput - A mic button that appends dictated speech to a text value.
 * 
 * Props:
 *   value       - current text value
 *   onChange    - (newValue: string) => void
 *   disabled    - optionally disable the button
 */
export default function VoiceInput({ value, onChange, disabled }) {
  const [status, setStatus] = useState('idle'); // idle | listening | error
  const recognitionRef = useRef(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = () => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-GB';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setStatus('listening');

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const separator = value && !value.endsWith(' ') && !value.endsWith('\n') ? ' ' : '';
      onChange(value + separator + transcript);
      setStatus('idle');
    };

    recognition.onerror = () => setStatus('error');
    recognition.onend = () => setStatus(s => s === 'listening' ? 'idle' : s);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setStatus('idle');
  };

  if (!isSupported) return null;

  const isListening = status === 'listening';

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      title={isListening ? 'Stop recording' : 'Dictate note (voice-to-text)'}
      className={`
        flex items-center justify-center w-9 h-9 rounded-lg transition-all flex-shrink-0
        ${isListening
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse'
          : 'glass-button text-foreground hover:text-red-500'
        }
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
    >
      {isListening ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}