import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * CustomSelect — a React-rendered dropdown that bypasses native OS select behaviour.
 * Uses position:fixed for the list so it escapes all scroll containers.
 */
export default function CustomSelect({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const [listStyle, setListStyle] = useState({});
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? value ?? '';

  // Position the fixed list under the trigger button
  const openDropdown = () => {
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
  };

  // Close on outside mousedown
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        listRef.current && !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
        onClick={open ? () => setOpen(false) : openDropdown}
        className={`neomorph-inset w-full px-3 py-2 text-sm rounded-lg flex items-center justify-between text-left ${className}`}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={listRef}
          style={listStyle}
          className="bg-card border border-border rounded-lg shadow-lg overflow-hidden"
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
        </div>
      )}
    </div>
  );
}