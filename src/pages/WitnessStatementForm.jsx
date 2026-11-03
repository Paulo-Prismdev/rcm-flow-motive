import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { serverMessage } from '@/lib/publicForm';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, FileCheck2, Loader, PenLine, Trash2 } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';
const POSITIONS = ['Pedestrian', 'Driver of another vehicle', 'Passenger in another vehicle', 'Cyclist', 'Other'];
const WEATHER = ['Dry', 'Wet / raining', 'Snow or ice', 'Fog', 'Not sure'];
const LIGHT = ['Daylight', 'Dark – street lights on', 'Dark – no street lights', 'Dusk or dawn', 'Not sure'];
const ukDate = (d) => {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Public form a witness to an accident fills in and signs from a link we send them. */
export default function WitnessStatementForm() {
  const token = new URLSearchParams(window.location.search).get('token');
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [linkProblem, setLinkProblem] = useState(token ? '' : 'invalid');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [truth, setTruth] = useState(false);
  const [a, setA] = useState({
    full_name: '', address: '', postcode: '', phone: '', email: '',
    knows_parties: '', knows_parties_detail: '', position: '', position_detail: '',
    incident_date: '', incident_time: '', incident_location: '', weather: '', light: '',
    account: '', vehicles_description: '', responsibility: '',
    injuries: '', injuries_detail: '', police: '', contact_ok: '',
  });
  const set = (k, v) => setA((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await base44.functions.invoke('getWitnessStatementForm', { token });
        const d = res?.data || {};
        if (!d.valid) { setLinkProblem(d.reason === 'expired' ? 'expired' : 'invalid'); return; }
        if (d.signed) { setSubmitted(true); return; }
        setInfo(d);
        setA((p) => ({
          ...p,
          full_name: d.witness_name || '', email: d.witness_email || '', phone: d.witness_phone || '',
          incident_date: d.incident_date || '', incident_time: d.incident_time || '', incident_location: d.incident_location || '',
        }));
      } catch {
        setLinkProblem('invalid');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Signature pad
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [hasSig, setHasSig] = useState(false);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }, [info]);
  const pos = (e) => {
    const c = canvasRef.current; const r = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: (p.clientX - r.left) * (c.width / r.width), y: (p.clientY - r.top) * (c.height / r.height) };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = pos(e); };
  const move = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d'); const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p; setHasSig(true);
  };
  const end = () => { drawing.current = false; };
  const clearSig = () => {
    const c = canvasRef.current; const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); setHasSig(false);
  };

  const submit = async () => {
    setError('');
    const missing = [
      !a.full_name.trim() && 'your full name', !a.address.trim() && 'your address', !a.phone.trim() && 'a phone number',
      !a.account.trim() && 'what you saw', !a.contact_ok && 'whether we can contact you',
    ].filter(Boolean);
    if (missing.length) { setError(`Please add ${missing.join(', ')}.`); return; }
    if (!truth) { setError('Please tick the statement of truth.'); return; }
    if (!hasSig) { setError('Please sign in the box before submitting.'); return; }
    setBusy(true);
    try {
      const res = await base44.functions.invoke('submitWitnessStatement', {
        token, answers: a, truth: true, signatureDataUrl: canvasRef.current.toDataURL('image/png'),
      });
      if (res?.data?.success) setSubmitted(true);
      else setError(res?.data?.error || 'That didn’t go through. Please try again.');
    } catch (e) {
      setError(serverMessage(e, 'That didn’t go through. Please try again.'));
    }
    setBusy(false);
  };

  const shell = (children) => (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#151d44] px-4 py-4 flex items-center justify-center">
        <img src={LOGO} alt="RCM Automotive" className="h-14 w-auto object-contain" />
      </div>
      {children}
    </div>
  );
  const card = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 space-y-4';
  const input = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#151d44]/30 text-base';
  const label = 'block text-sm font-medium text-gray-700 mb-1.5';
  const Choice = ({ field, options }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => set(field, o)} aria-pressed={a[field] === o}
          className={`px-3 py-2 rounded-xl border text-sm ${a[field] === o ? 'bg-[#151d44] border-[#151d44] text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
          {o}
        </button>
      ))}
    </div>
  );

  if (loading) return shell(<div className="flex justify-center py-24"><Loader className="w-8 h-8 animate-spin text-[#151d44]" /></div>);

  if (linkProblem) {
    return shell(
      <div className="max-w-md mx-auto p-6 mt-10 bg-white rounded-2xl shadow text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">{linkProblem === 'expired' ? 'Link expired' : 'Link not valid'}</h2>
        <p className="text-sm text-gray-500">
          {linkProblem === 'expired' ? 'This link has expired.' : 'This link is not valid.'} Please contact RCM Automotive on info@rcmautomotive.co.uk for a new one.
        </p>
      </div>,
    );
  }

  if (submitted) {
    return shell(
      <div className="max-w-md mx-auto p-6 mt-10 bg-white rounded-2xl shadow text-center">
        <FileCheck2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank you</h2>
        <p className="text-gray-500 mb-2">Your witness statement has been signed and sent to RCM Automotive.</p>
        <p className="text-xs text-gray-400">You can close this page now.</p>
      </div>,
    );
  }

  return shell(
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800">Witness statement</h1>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Thank you for helping. Please tell us what you saw in your own words and sign at the end. It takes about five minutes.
        Your statement may be shared with the insurers dealing with the claim.
      </p>

      {info && (info.incident_date || info.incident_location || info.vehicle_reg) && (
        <div className="mb-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm text-gray-700">
          <p className="font-semibold text-gray-800 mb-1">The accident we're asking about</p>
          {info.incident_date && <p>Date: {ukDate(info.incident_date)}{info.incident_time ? ` at ${info.incident_time}` : ''}</p>}
          {info.incident_location && <p>Place: {info.incident_location}</p>}
          {info.vehicle_reg && <p>Our customer's vehicle: {info.vehicle_reg}{info.vehicle ? ` (${info.vehicle})` : ''}</p>}
          {info.other_vehicle_reg && <p>Other vehicle: {info.other_vehicle_reg}</p>}
        </div>
      )}

      <div className={card}>
        <h2 className="font-semibold text-gray-800">About you</h2>
        <div><label className={label} htmlFor="w-name">Full name *</label><input id="w-name" className={input} value={a.full_name} onChange={(e) => set('full_name', e.target.value)} autoComplete="name" /></div>
        <div><label className={label} htmlFor="w-addr">Address *</label><input id="w-addr" className={input} value={a.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" /></div>
        <div className="grid grid-cols-2 gap-3 m-keep-2">
          <div><label className={label} htmlFor="w-pc">Postcode</label><input id="w-pc" className={input} value={a.postcode} onChange={(e) => set('postcode', e.target.value)} autoComplete="postal-code" /></div>
          <div><label className={label} htmlFor="w-phone">Phone *</label><input id="w-phone" type="tel" className={input} value={a.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" /></div>
        </div>
        <div><label className={label} htmlFor="w-email">Email</label><input id="w-email" type="email" className={input} value={a.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></div>
        <div>
          <p className={label}>Do you know anyone involved in the accident?</p>
          <Choice field="knows_parties" options={['No', 'Yes']} />
          {a.knows_parties === 'Yes' && <input className={`${input} mt-2`} placeholder="Who, and how do you know them?" value={a.knows_parties_detail} onChange={(e) => set('knows_parties_detail', e.target.value)} />}
        </div>
        <div>
          <p className={label}>Where were you when it happened?</p>
          <Choice field="position" options={POSITIONS} />
          <input className={`${input} mt-2`} placeholder="Where exactly were you? e.g. waiting at the crossing on the north side" value={a.position_detail} onChange={(e) => set('position_detail', e.target.value)} />
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-800">The accident</h2>
        <div className="grid grid-cols-2 gap-3 m-keep-2">
          <div><label className={label} htmlFor="w-date">Date</label><input id="w-date" type="date" className={input} value={a.incident_date} onChange={(e) => set('incident_date', e.target.value)} /></div>
          <div><label className={label} htmlFor="w-time">Time (roughly)</label><input id="w-time" type="time" className={input} value={a.incident_time} onChange={(e) => set('incident_time', e.target.value)} /></div>
        </div>
        <div><label className={label} htmlFor="w-loc">Where did it happen?</label><input id="w-loc" className={input} value={a.incident_location} onChange={(e) => set('incident_location', e.target.value)} /></div>
        <div><p className={label}>Weather and road</p><Choice field="weather" options={WEATHER} /></div>
        <div><p className={label}>Light</p><Choice field="light" options={LIGHT} /></div>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-800">What you saw</h2>
        <div>
          <label className={label} htmlFor="w-account">In your own words, describe what you saw happen *</label>
          <textarea id="w-account" rows={7} className={input} value={a.account} onChange={(e) => set('account', e.target.value)}
            placeholder="Which way each vehicle was going, what each did, and what happened when they collided." />
        </div>
        <div><label className={label} htmlFor="w-veh">The vehicles involved (colour, make, anything you remember)</label><textarea id="w-veh" rows={2} className={input} value={a.vehicles_description} onChange={(e) => set('vehicles_description', e.target.value)} /></div>
        <div><label className={label} htmlFor="w-resp">In your view, who was responsible, and why?</label><textarea id="w-resp" rows={3} className={input} value={a.responsibility} onChange={(e) => set('responsibility', e.target.value)} /></div>
        <div>
          <p className={label}>Did you see anyone injured?</p>
          <Choice field="injuries" options={['No', 'Yes', 'Not sure']} />
          {a.injuries === 'Yes' && <input className={`${input} mt-2`} placeholder="Who, and what did you see?" value={a.injuries_detail} onChange={(e) => set('injuries_detail', e.target.value)} />}
        </div>
        <div><p className={label}>Did the police attend?</p><Choice field="police" options={['No', 'Yes', 'Not sure']} /></div>
        <div><p className={label}>Are you happy for the insurers or solicitors dealing with the claim to contact you? *</p><Choice field="contact_ok" options={['Yes', 'No']} /></div>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-gray-800">Statement of truth</h2>
        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input type="checkbox" className="mt-1 w-5 h-5" checked={truth} onChange={(e) => setTruth(e.target.checked)} />
          <span>I believe that the facts stated in this witness statement are true. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.</span>
        </label>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2"><PenLine className="w-4 h-4" /> Sign below *</span>
            <button type="button" onClick={clearSig} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
            <canvas ref={canvasRef} width={560} height={150} className="w-full block cursor-crosshair" aria-label="Signature box"
              onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
              onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
          </div>
          <p className={`text-xs mt-1 text-center ${hasSig ? 'text-green-600' : 'text-gray-500'}`}>
            {hasSig ? <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Signature captured</span> : 'Draw your signature with your finger or mouse'}
          </p>
        </div>
      </div>

      {error && <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <Button onClick={submit} disabled={busy} className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
        {busy ? <><Loader className="w-5 h-5 animate-spin" /> Sending…</> : <><FileCheck2 className="w-5 h-5" /> Sign and send my statement</>}
      </Button>
    </div>,
  );
}
