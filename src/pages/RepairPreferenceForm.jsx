import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getPublicFormToken } from '@/functions/getPublicFormToken';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Loader, PenLine, Trash2, FileCheck2 } from 'lucide-react';

export default function RepairPreferenceForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const repair_preference_token = urlParams.get('token');

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(!!repair_preference_token);
  const [linkValid, setLinkValid] = useState(true);
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formToken, setFormToken] = useState('');

  // Signature canvas
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    if (!repair_preference_token) { setLinkValid(false); setLoading(false); return; }
    getPublicFormToken({}).then(res => setFormToken(res.data?.token || '')).catch(() => {});
    // Fetch claim details so the client can confirm the vehicle is theirs
    base44.entities.Claim.filter({ repair_preference_token })
      .then(res => {
        if (res && res.length > 0) {
          setClaim(res[0]);
          if (res[0].repair_preference_signed) setSubmitted(true);
        } else {
          setLinkValid(false);
        }
      })
      .catch(() => setLinkValid(false))
      .finally(() => setLoading(false));
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
        _form_secret: formToken,
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
      setError(e?.message || 'Submission failed. Please try again.');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!linkValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid Link</h2>
          <p className="text-gray-500 text-sm">This repair preference link is invalid or has expired. Please contact us to request a new link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <FileCheck2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-4">Your Statement of Repair Preference has been signed and saved to your claim file. Our team has been notified.</p>
          <p className="text-xs text-gray-400">You can now close this page.</p>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#151d44] px-4 py-4 flex items-center justify-center">
        <img src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg" alt="RCM Automotive" className="h-14 w-auto object-contain" />
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Statement of Repair Preference</h1>
          <p className="text-sm text-gray-500 mt-1">Please review the statement below, enter your name, and sign to confirm your repair preference.</p>
        </div>

        {/* Vehicle confirmation */}
        {claim && (
          <div className="mb-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Vehicle</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Make:</span> <span className="font-medium">{claim.vehicle_make || claim.make_model || '—'}</span></div>
              <div><span className="text-gray-500">Model:</span> <span className="font-medium">{claim.vehicle_model || '—'}</span></div>
              <div><span className="text-gray-500">Registration:</span> <span className="font-medium">{(claim.reg || '').toUpperCase()}</span></div>
              <div><span className="text-gray-500">Claim:</span> <span className="font-medium">{claim.job_number || '—'}</span></div>
            </div>
          </div>
        )}

        {/* Statement text */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            In the event that the repair costs for my vehicle approach or exceed its market value, I wish to exercise my legal right to request that the insurer considers authorising repairs up to 100% of the current market value of my vehicle, rather than deeming it a total loss at anything less.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            I understand that while this is my preference, any repairs remain subject to the insurer's approval and authorisation.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            I am making this statement proactively to ensure my wishes are clear from the outset of the claims process.
          </p>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm font-medium text-gray-700">Declaration</p>
            <p className="text-sm text-gray-600 mt-1">This statement represents my preferences regarding the repair of my vehicle.</p>
          </div>
        </div>

        {/* Name + Signature */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Full Name *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputCls} placeholder="Enter your full name" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-600 mb-0 flex items-center gap-2"><PenLine className="w-4 h-4" /> Sign below *</label>
              <button onClick={clearSig} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
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
            {!hasSig && <p className="text-xs text-gray-400 mt-1 text-center">Draw your signature with your finger or mouse</p>}
            {hasSig && <p className="text-xs text-green-600 mt-1 text-center flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Signature captured</p>}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 h-12 rounded-xl">
          {isSubmitting ? <><Loader className="w-5 h-5 animate-spin" /> Submitting...</> : <><FileCheck2 className="w-5 h-5" /> Sign & Submit</>}
        </Button>
      </div>
    </div>
  );
}