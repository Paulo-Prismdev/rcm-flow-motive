import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, Loader, AlertTriangle } from 'lucide-react';
import { serverMessage } from '@/lib/publicForm';
import { REPAIRER_DETAILS_SECTIONS, REPAIRER_DETAILS_FIELDS } from '@/components/repairer/repairerDetailsFields';

// Public: a repairer checks and updates the details we hold for them, from a signed
// link staff send from the repairer directory. What we already hold is filled in.
// Their answers go to staff to review before anything changes on our system.

const inputCls = 'w-full px-4 py-3 rounded-xl border border-border !bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base sm:text-sm';
const labelCls = 'block text-sm font-medium text-foreground mb-1.5';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ def, value, onChange, error }) {
  const id = `f-${def.key}`;
  let control;
  if (def.options) {
    const picked = def.multi ? (Array.isArray(value) ? value : []) : null;
    control = (
      <div className="flex flex-wrap gap-2" role={def.multi ? 'group' : 'radiogroup'} aria-labelledby={`${id}-l`}>
        {def.options.map((o) => {
          const on = def.multi ? picked.includes(o.value) : value === o.value;
          const toggle = () => {
            if (!def.multi) onChange(on ? '' : o.value);
            else onChange(on ? picked.filter((v) => v !== o.value) : [...picked, o.value]);
          };
          return (
            <button
              key={o.value}
              type="button"
              role={def.multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              onClick={toggle}
              className={`h-11 px-4 rounded-xl border text-sm font-medium transition-colors ${on ? 'bg-[#131d47] text-white border-[#131d47]' : 'bg-white border-border text-foreground hover:bg-muted'}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  } else if (def.long) {
    control = <textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} className={`${inputCls} resize-y`} />;
  } else {
    control = (
      <input
        id={id}
        type={def.type || 'text'}
        inputMode={def.inputMode}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(def.upper ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={def.placeholder}
        className={inputCls}
        aria-invalid={!!error}
      />
    );
  }
  return (
    <div>
      <label id={`${id}-l`} htmlFor={def.options ? undefined : id} className={labelCls}>
        {def.label}{def.required && <span className="text-danger-fg"> *</span>}
      </label>
      {control}
      {def.hint && !error && <p className="text-xs text-muted-foreground mt-1">{def.hint}</p>}
      {error && <p className="text-xs text-danger-fg mt-1">{error}</p>}
    </div>
  );
}

export default function RepairerDetailsForm() {
  const token = new URLSearchParams(window.location.search).get('token');
  const [state, setState] = useState('loading'); // loading | invalid | form | done
  const [linkMessage, setLinkMessage] = useState('');
  const [details, setDetails] = useState({});
  const [pending, setPending] = useState(null);
  const [forName, setForName] = useState('');
  const [by, setBy] = useState({ name: '', role: '', email: '' });
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    base44.functions.invoke('getRepairerDetailsForm', { token })
      .then((res) => {
        if (!res.data?.success) throw new Error();
        setDetails(res.data.details || {});
        setPending(res.data.pending || null);
        setForName(res.data.for_name || res.data.details?.name || '');
        setState('form');
      })
      .catch((e) => { setLinkMessage(serverMessage(e, '')); setState('invalid'); });
  }, [token]);

  const set = (key, v) => {
    setDetails((d) => ({ ...d, [key]: v }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    for (const f of REPAIRER_DETAILS_FIELDS) {
      const v = String(details[f.key] || '').trim();
      if (f.required && !v) errs[f.key] = 'Please fill this in';
      else if (f.type === 'email' && v && !EMAIL.test(v)) errs[f.key] = 'Please check this email address';
    }
    if (!by.name.trim()) errs._by = 'Please tell us your name';
    if (by.email.trim() && !EMAIL.test(by.email.trim())) errs._byEmail = 'Please check this email address';
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      setError('Some details need checking — they are marked in red.');
      const first = Object.keys(errs)[0];
      document.getElementById(first.startsWith('_') ? 'by-name' : `f-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!confirmed) { setError('Please tick to confirm the details are correct.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('submitRepairerDetails', {
        token,
        details,
        notes,
        confirmed: true,
        completed_by_name: by.name,
        completed_by_role: by.role,
        completed_by_email: by.email,
      });
      if (!res.data?.success) throw new Error(res.data?.error);
      setState('done');
      window.scrollTo(0, 0);
    } catch (e) {
      setError(serverMessage(e, e?.message || 'Sorry, that did not send. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children) => (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center">{children}</div>
    </div>
  );

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground"><Loader className="w-8 h-8 animate-spin" /><p className="text-sm">Loading…</p></div>
      </div>
    );
  }
  if (state === 'invalid') {
    return shell(<>
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-foreground mb-2">This link can't be used</h1>
      <p className="text-sm text-muted-foreground">{linkMessage || 'This link is not valid or has expired. Please contact RCM Automotive for a new one.'}</p>
    </>);
  }
  if (state === 'done') {
    return shell(<>
      <div className="w-16 h-16 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-success-fg" /></div>
      <h1 className="text-xl font-bold text-foreground mb-2">Thank you</h1>
      <p className="text-sm text-muted-foreground">Your details have been sent to RCM Automotive. We'll update our system and be in touch if we have any questions.</p>
    </>);
  }

  return (
    <div className="min-h-screen bg-muted pb-16">
      <div className="w-full bg-[#131d47] py-6 px-4 mb-8">
        <div className="flex items-center justify-center">
          <img src="/rcm-logo.png" alt="RCM Automotive" className="max-h-16 w-auto object-contain" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Your repairer details</h1>
          <p className="text-sm text-muted-foreground mt-1">Please check everything below and fill in anything missing. Anything we already hold is filled in for you.</p>
        </div>

        {forName && (
          <div className="rounded-2xl border-2 border-[#131d47] bg-white p-4 text-sm text-foreground" role="note">
            <p>This form is for <strong>{forName}</strong>.</p>
            <p className="text-muted-foreground mt-1">If that isn't your business, please don't fill it in. Contact RCM Automotive and we'll send you your own link.</p>
          </div>
        )}

        {pending && (
          <div className="rounded-2xl border border-info/30 bg-info-bg p-4 text-sm text-info-fg">
            You sent your details on {new Date(pending.submitted_at).toLocaleDateString('en-GB')} and we haven't finished reviewing them yet — what you sent is shown below. Sending again replaces it.
          </div>
        )}

        {REPAIRER_DETAILS_SECTIONS.map((section) => (
          <section key={section.title} className="bg-card rounded-2xl border border-border p-5 sm:p-6" aria-label={section.title}>
            <h2 className="text-lg font-semibold text-foreground mb-4">{section.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.fields.filter((f) => !f.showIf || f.showIf(details)).map((f) => (
                <div key={f.key} className={f.long || f.options ? 'sm:col-span-2' : ''}>
                  <Field def={f} value={details[f.key] ?? (f.multi ? [] : '')} onChange={(v) => set(f.key, v)} error={errors[f.key]} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="bg-card rounded-2xl border border-border p-5 sm:p-6 space-y-4" aria-label="About you">
          <h2 className="text-lg font-semibold text-foreground">Who's completing this?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="by-name" className={labelCls}>Your name<span className="text-danger-fg"> *</span></label>
              <input id="by-name" value={by.name} onChange={(e) => { setBy((b) => ({ ...b, name: e.target.value })); setErrors((x) => ({ ...x, _by: undefined })); }} className={inputCls} autoComplete="name" />
              {errors._by && <p className="text-xs text-danger-fg mt-1">{errors._by}</p>}
            </div>
            <div>
              <label htmlFor="by-role" className={labelCls}>Your role</label>
              <input id="by-role" value={by.role} onChange={(e) => setBy((b) => ({ ...b, role: e.target.value }))} className={inputCls} placeholder="e.g. Bodyshop manager" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="by-email" className={labelCls}>Your email</label>
              <input id="by-email" type="email" value={by.email} onChange={(e) => setBy((b) => ({ ...b, email: e.target.value }))} className={inputCls} autoComplete="email" />
              {errors._byEmail && <p className="text-xs text-danger-fg mt-1">{errors._byEmail}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className={labelCls}>Anything else we should know?</label>
              <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-y`} />
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 w-5 h-5 rounded border-border cursor-pointer" />
            <span className="text-sm text-foreground">I confirm these details are correct and RCM Automotive can use them to manage repairs with us.</span>
          </label>
        </section>

        {error && <div className="p-3 bg-danger-bg border border-danger/30 rounded-xl text-sm text-danger-fg" role="alert">{error}</div>}

        <Button onClick={submit} disabled={submitting} className="w-full bg-[#131d47] hover:bg-[#1a2660] text-white h-12 text-base">
          {submitting ? <><Loader className="w-4 h-4 animate-spin mr-2" /> Sending…</> : 'Send my details'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">RCM Automotive — Repair Management System</p>
      </div>
    </div>
  );
}
