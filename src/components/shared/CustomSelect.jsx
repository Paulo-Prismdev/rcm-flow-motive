import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const [listStyle, setListStyle] = useState({});
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const justOpenedRef = useRef(false);

  const selectedLabel = options.find(o => o.value === value)?.label ?? value ?? '';

  const openDropdown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setListStyle({
        position: 'fixed',
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    }
    setOpen(true);
    justOpenedRef.current = true;
    setTimeout(() => { justOpenedRef.current = false; }, 100);
  }, []);

  // Close on outside mousedown — but ignore events within 100ms of opening
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (justOpenedRef.current) return;
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        listRef.current && !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={open ? () => setOpen(false) : openDropdown}
        className={`neomorph-inset w-full px-3 py-2 text-sm rounded-lg flex items-center justify-between text-left ${className}`}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={listRef}
          style={listStyle}
          className="bg-card border border-border rounded-lg shadow-lg overflow-auto max-h-60"
        >
          {options.map(opt => (
            <div
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt.value); }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${opt.value === value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}