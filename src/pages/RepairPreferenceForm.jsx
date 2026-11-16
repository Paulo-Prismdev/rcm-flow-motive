import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { serverMessage } from '@/lib/publicForm';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Loader, PenLine, Trash2, FileCheck2 } from 'lucide-react';

export default function RepairPreferenceForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const repair_preference_token = urlParams.get('token');

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(!!repair_preference_token);
  const [linkValid, setLinkValid] = useState(true);
  const [linkExpired, setLinkExpired] = useState(false);
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Signature canvas
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    if (!repair_preference_token) { setLinkValid(false); setLoading(false); return; }
    (async () => {
      try {
        // Fetch claim details via the public (auth-free) backend function,
        // gated by the per-claim token — same as the submit path.
        const res = await base44.functions.invoke('getRepairPreferenceClaim', { repair_preference_token });
        const data = res?.data;
        if (data?.valid) {
          setClaim(data);
          if (data.signed) setSubmitted(true);
        } else {
          setLinkExpired(data?.reason === 'expired');
          setLinkValid(false);
        }
      } catch {
        setLinkValid(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [repair_preference_token]);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  };
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSig(true);
  };
  const endDraw = () => { isDrawing.current = false; };
  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!clientName.trim()) { setError('Please enter your full name.'); return; }
    if (!hasSig) { setError('Please sign the form before submitting.'); return; }
    setIsSubmitting(true);
    try {
      const signatureDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
      const result = await base44.functions.invoke('submitRepairPreferenceForm', {
        repair_preference_token,
        clientName: clientName.trim(),
        signatureDataUrl,
      });
      if (result.data?.success) {
        setSubmitted(true);
      } else {
        setError(result.data?.error || 'Submission failed. Please try again.');
      }
    } catch (e) {
      setError(serverMessage(e, 'Submission failed. Please try again.'));
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Loader className="w-8 h-8 text-warning-fg animate-spin" />
      </div>
    );
  }

  if (!linkValid) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-danger-bg flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-danger-fg" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{linkExpired ? 'Link expired' : 'Invalid link'}</h2>
          <p className="text-muted-foreground text-sm">
            {linkExpired
              ? 'This link has expired. Please contact RCM Automotive for a new one.'
              : 'This link is not valid. Please contact RCM Automotive for a new one.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4">
            <FileCheck2 className="w-8 h-8 text-success-fg" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Thank You!</h2>
          <p className="text-muted-foreground mb-4">Your Statement of Repair Preference has been signed and saved to your claim file. Our team has been notified.</p>
          <p className="text-xs text-muted-foreground">You can now close this page.</p>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm';

  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-[#151d44] px-4 py-4 flex items-center justify-center">
        <img src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg" alt="RCM Automotive" className="h-14 w-auto object-contain" />
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Statement of Repair Preference</h1>
          <p className="text-sm text-muted-foreground mt-1">Please review the statement below, enter your name, and sign to confirm your repair preference.</p>
        </div>

        {/* Vehicle confirmation */}
        {claim && (
          <div className="mb-4 p-4 bg-card rounded-2xl shadow-card border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Your Vehicle</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Make:</span> <span className="font-semibold text-foreground">{claim.vehicle_make || claim.make_model || '—'}</span></div>
              <div><span className="text-muted-foreground">Model:</span> <span className="font-semibold text-foreground">{claim.vehicle_model || '—'}</span></div>
              <div><span className="text-muted-foreground">Registration:</span> <span className="font-semibold text-foreground">{(claim.reg || '').toUpperCase()}</span></div>
            </div>
          </div>
        )}

        {/* Statement text */}
        <div className="bg-card rounded-2xl shadow-card border border-border p-6 mb-4 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            In the event that the repair costs for my vehicle approach or exceed its market value, I wish to exercise my legal right to request that the insurer considers authorising repairs up to 100% of the current market value of my vehicle, rather than deeming it a total loss at anything less.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            I understand that while this is my preference, any repairs remain subject to the insurer's approval and authorisation.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            I am making this statement proactively to ensure my wishes are clear from the outset of the claims process.
          </p>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">Declaration</p>
            <p className="text-sm text-muted-foreground mt-1">This statement represents my preferences regarding the repair of my vehicle.</p>
          </div>
        </div>

        {/* Name + Signature */}
        <div className="bg-card rounded-2xl shadow-card border border-border p-6 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Full Name *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputCls} placeholder="Enter your full name" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground mb-0 flex items-center gap-2"><PenLine className="w-4 h-4" /> Sign below *</label>
              <button onClick={clearSig} className="text-xs text-muted-foreground hover:text-danger-fg flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-card" style={{ touchAction: 'none' }}>
              <canvas
                ref={canvasRef}
                width={560}
                height={150}
                className="w-full block cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            {!hasSig && <p className="text-xs text-muted-foreground mt-1 text-center">Draw your signature with your finger or mouse</p>}
            {hasSig && <p className="text-xs text-success-fg mt-1 text-center flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Signature captured</p>}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger-bg border border-danger/30 rounded-xl text-sm text-danger-fg">{error}</div>
        )}

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-success hover:bg-success text-on-solid flex items-center justify-center gap-2 h-12 rounded-xl">
          {isSubmitting ? <><Loader className="w-5 h-5 animate-spin" /> Submitting...</> : <><FileCheck2 className="w-5 h-5" /> Sign & Submit</>}
        </Button>
      </div>
    </div>
  );
}