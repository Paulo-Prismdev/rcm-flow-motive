import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, Loader, AlertTriangle, Car } from 'lucide-react';

export default function BodyshopUpdateForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [formToken, setFormToken] = useState('');
  const [claim, setClaim] = useState(null);
  const [description, setDescription] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [ecd, setEcd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [linkValid, setLinkValid] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLinkValid(false);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const tokenRes = await base44.functions.invoke('getPublicFormToken', {});
        const ft = tokenRes.data?.token || '';
        setFormToken(ft);

        const res = await base44.functions.invoke('getBodyshopUpdateForm', {
          _form_secret: ft,
          token
        });
        if (res.data?.success) {
          setClaim(res.data.claim);
          setEcd(res.data.claim.ecd || '');
        } else {
          setLinkValid(false);
        }
      } catch {
        setLinkValid(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please provide an update description.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await base44.functions.invoke('submitBodyshopUpdate', {
        _form_secret: formToken,
        token,
        description,
        next_steps: nextSteps,
        ecd
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

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white !bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';
  const labelCls = 'block text-sm font-medium text-gray-600 mb-1.5';

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Invalid link ──
  if (!linkValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Invalid</h1>
          <p className="text-sm text-gray-500">
            This update link is invalid or has expired. Please contact us if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Update Received</h1>
          <p className="text-sm text-gray-500">
            Thank you — your update has been logged and our team has been notified. No further action is required.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full-width header */}
      <div className="w-full bg-[#131d47] py-6 px-4 mb-8">
        <div className="flex items-center justify-center">
          <img
            src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg"
            alt="RCM Automotive"
            className="max-h-16 w-auto object-contain"
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Repair Update Form</h1>
          <p className="text-sm text-gray-500 mt-1">Please provide an update on the repair status</p>
        </div>

        {/* Claim info card */}
        {claim && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <Car className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Claim Details</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Registration</p>
                <p className="font-medium text-gray-900">{claim.reg || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vehicle</p>
                <p className="font-medium text-gray-900">{claim.make_model || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Client</p>
                <p className="font-medium text-gray-900">{claim.client_name || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className={labelCls}>Update Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide a detailed update on the current repair status..."
              className={`${inputCls} h-32 resize-y`}
            />
          </div>

          <div>
            <label className={labelCls}>
              Estimated Completion Date {ecd ? '(update if changed)' : '(please enter)'}
            </label>
            <input
              type="date"
              value={ecd}
              onChange={(e) => setEcd(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Next Steps (optional)</label>
            <Textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="What needs to happen next? (e.g., awaiting parts, expected completion date...)"
              className={`${inputCls} h-24 resize-y`}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#131d47] hover:bg-[#1a2660] text-white h-12"
          >
            {isSubmitting ? (
              <><Loader className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
            ) : (
              'Submit Update'
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          RCM Flow-motive — Repair Management System
        </p>
      </div>
    </div>
  );
}