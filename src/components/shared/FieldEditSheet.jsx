import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { useBackLayer, usePhoneLayout } from '@/lib/backNavigation';

// The edit box for one field. The page underneath never changes look: tapping a
// field's pencil opens this box, you change the value here, the tick saves it and
// the box closes, back to the normal view.
//   Phone / tablet: a panel at the bottom that sits just above the keyboard.
//   Desktop: a small box in the middle of the screen.
// The cross, tapping outside, Escape and the phone's back button all close it
// without saving.

// How much of the bottom of the screen the on-screen keyboard covers.
function useKeyboardInset(active) {
    const [vp, setVp] = useState({ inset: 0, height: typeof window !== 'undefined' ? window.innerHeight : 800 });
    useEffect(() => {
        if (!active || typeof window === 'undefined' || !window.visualViewport) return undefined;
        const vv = window.visualViewport;
        const update = () => setVp({
            inset: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)),
            height: Math.round(vv.height),
        });
        update();
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
    }, [active]);
    return vp;
}

export default function FieldEditSheet({ open, title, subtitle, onSave, onCancel, children, bodyRef, autoFocus = true }) {
    const phone = usePhoneLayout();
    const { inset, height } = useKeyboardInset(open && phone);
    const innerRef = useRef(null);
    const popupOpenAtTap = useRef(false);
    const cancelRef = useRef(onCancel);
    cancelRef.current = onCancel;

    // The phone's back button closes the box (and doesn't leave the claim).
    useBackLayer(open, () => cancelRef.current?.(), 'field-edit');

    // Put the cursor straight in the field so the keyboard comes up.
    useEffect(() => {
        if (!open || !autoFocus) return undefined;
        const t = setTimeout(() => {
            const root = innerRef.current;
            if (!root) return;
            const el = Array.from(root.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea'))
                .find((c) => c.offsetParent !== null && !c.readOnly && !c.disabled);
            if (el) { try { el.focus({ preventScroll: true }); } catch { el.focus(); } }
        }, 60);
        return () => clearTimeout(t);
    }, [open, autoFocus]);

    if (!open || typeof document === 'undefined') return null;

    const onKeyDown = (e) => {
        // Keys typed in a dropdown's own search box (it sits outside the box) are the dropdown's.
        if (!e.currentTarget.contains(e.target)) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel?.(); }
        else if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(e.target.type)) {
            e.preventDefault(); onSave?.();
        }
    };

    const setRefs = (el) => {
        innerRef.current = el;
        if (bodyRef) bodyRef.current = el;
    };

    const actions = (
        <div className="flex items-center gap-2 pt-3">
            <button
                type="button"
                onClick={onCancel}
                className="flex-1 h-11 rounded-xl border border-border bg-card text-sm font-semibold text-foreground flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
            >
                <X className="w-4 h-4" aria-hidden="true" /> Cancel
            </button>
            <button
                type="button"
                onClick={onSave}
                className="flex-1 h-11 rounded-xl bg-success text-on-solid text-sm font-semibold flex items-center justify-center gap-1.5 shadow-card active:scale-[0.98] transition"
            >
                <Check className="w-4 h-4" aria-hidden="true" /> Save
            </button>
        </div>
    );

    const head = (
        <div className="flex items-start gap-3 pb-3">
            <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-foreground leading-tight">{title}</div>
                {subtitle && <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>}
            </div>
            <button type="button" onClick={onCancel} aria-label="Close without saving" className="-mr-1 -mt-1 w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted active:bg-muted">
                <X className="w-5 h-5" aria-hidden="true" />
            </button>
        </div>
    );

    return createPortal(
        <div className="fm-edit-sheet fixed inset-0 z-[48]" onKeyDown={onKeyDown} role="dialog" aria-modal="true" aria-label={title}>
            <div
                className="absolute inset-0 bg-black/30"
                aria-hidden="true"
                // Tapping outside closes the box, unless the tap was just closing an open dropdown.
                onPointerDown={() => { popupOpenAtTap.current = !!document.querySelector('[data-radix-popper-content-wrapper], [role="listbox"]'); }}
                onClick={() => { if (!popupOpenAtTap.current) onCancel?.(); popupOpenAtTap.current = false; }}
            />
            {phone ? (
                <div
                    className="absolute left-0 right-0 bg-card rounded-t-2xl shadow-2xl px-4 pt-2 flex flex-col"
                    style={{
                        bottom: inset,
                        maxHeight: Math.max(220, height - 16),
                        paddingBottom: inset > 0 ? 12 : 'max(env(safe-area-inset-bottom), 12px)',
                    }}
                >
                    <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-border flex-shrink-0" aria-hidden="true" />
                    {head}
                    <div ref={setRefs} className="fm-edit-sheet-body overflow-y-auto min-h-0 -mx-1 px-1">{children}</div>
                    {actions}
                </div>
            ) : (
                <div className="absolute left-1/2 top-[18vh] -translate-x-1/2 w-[min(32rem,calc(100vw-2rem))] max-h-[70vh] bg-card rounded-2xl shadow-2xl p-5 flex flex-col">
                    {head}
                    <div ref={setRefs} className="fm-edit-sheet-body overflow-y-auto min-h-0 -mx-1 px-1">{children}</div>
                    {actions}
                </div>
            )}
        </div>,
        document.body,
    );
}
