import React, { useState, useEffect } from 'react';
import { submitBackorderedPart } from '@/functions/submitBackorderedPart';
import { getPublicFormToken } from '@/functions/getPublicFormToken';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Plus, Trash2, Package } from 'lucide-react';

const companyLogo = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

const emptyPart = () => ({
  part_description: '',
  part_number: '',
  supplier_name: '',
  expected_arrival_date: '',
  additional_notes: '',
});

export default function BackorderForm() {
  const [claimId, setClaimId] = useState('');
  const [claimInfo, setClaimInfo] = useState(null);
  const [loadingClaim, setLoadingClaim] = useState(true);
  const [claimError, setClaimError] = useState('');
  const [formToken, setFormToken] = useState('');

  const [submitterName, setSubmitterName] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [parts, setParts] = useState([emptyPart()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('claim');
    if (!id) {
      setClaimError('No claim reference found in this link. Please contact us for a valid link.');
      setLoadingClaim(false);
      return;
    }
    setClaimId(id);
    setClaimInfo({ id });
    getPublicFormToken({}).then(res => setFormToken(res.data?.token || '')).catch(() => {});
    setLoadingClaim(false);
  }, []);

  const updatePart = (index, field, value) => {
    setParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const addPart = () => setParts(prev => [...prev, emptyPart()]);
  const removePart = (index) => setParts(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const validParts = parts.filter(p => p.part_description.trim());
    if (!validParts.length) {
      setError('Please enter at least one part description.');
      setSubmitting(false);
      return;
    }

    try {
      await submitBackorderedPart({
        _form_secret: formToken,
        claim_id: claimId,
        submitted_by_name: submitterName,
        submitted_by_phone: submitterPhone,
        parts: validParts,
      });
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingClaim) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#151d44' }}>
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (claimError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#151d44' }}>
        <div className="text-center">
          <img src={companyLogo} alt="RCM Automotive" className="h-16 w-auto object-contain mx-auto mb-6" />
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-6 text-red-300 max-w-md">
            {claimError}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-8 px-4" style={{ background: '#151d44' }}>
      <div className="mb-8 flex flex-col items-center">
        <img src={companyLogo} alt="RCM Automotive" className="h-20 w-auto object-contain mb-4" />
        <h1 className="text-2xl font-bold text-white">Backordered Parts Notification</h1>
        <p className="text-white/60 text-sm mt-1">Please complete the form below to notify us of any backordered parts</p>
      </div>

      <div className="w-full max-w-2xl bg-white/10 backdrop-blur rounded-2xl border border-white/15 shadow-xl p-6 md:p-8">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-400" />
            <h2 className="text-2xl font-bold text-white">Thank You!</h2>
            <p className="text-white/70 max-w-sm">
              Your backordered parts information has been received. We'll track these and follow up accordingly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Your details */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-bold">1</span>
                Your Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Bodyshop Name *</label>
                  <Input
                   value={submitterName}
                   onChange={(e) => setSubmitterName(e.target.value)}
                   placeholder="Bodyshop name"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Phone Number</label>
                  <Input
                    value={submitterPhone}
                    onChange={(e) => setSubmitterPhone(e.target.value)}
                    placeholder="e.g. 07700 900000"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>
            </div>

            {/* Parts list */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-bold">2</span>
                Backordered Parts
              </h3>

              <div className="space-y-4">
                {parts.map((part, index) => (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4 relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                        <Package className="w-4 h-4" />
                        Part {index + 1}
                      </div>
                      {parts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePart(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-white/70 mb-1">Part Description *</label>
                        <Input
                          value={part.part_description}
                          onChange={(e) => updatePart(index, 'part_description', e.target.value)}
                          placeholder="e.g. Front bumper, Headlight LH..."
                          required={index === 0}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">Part Number (if known)</label>
                        <Input
                          value={part.part_number}
                          onChange={(e) => updatePart(index, 'part_number', e.target.value)}
                          placeholder="OEM part number"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">Supplier</label>
                        <Input
                          value={part.supplier_name}
                          onChange={(e) => updatePart(index, 'supplier_name', e.target.value)}
                          placeholder="Supplier name"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/70 mb-1">Expected Arrival Date</label>
                        <Input
                          type="date"
                          value={part.expected_arrival_date}
                          onChange={(e) => updatePart(index, 'expected_arrival_date', e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-white/70 mb-1">Additional Notes</label>
                        <Textarea
                          value={part.additional_notes}
                          onChange={(e) => updatePart(index, 'additional_notes', e.target.value)}
                          placeholder="Any extra info..."
                          rows={2}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addPart}
                className="mt-3 flex items-center gap-2 text-sm text-white/60 hover:text-white/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add another part
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || !submitterName.trim()}
              className="w-full h-12 bg-[#D4AF37] hover:bg-[#C19B2B] text-black font-semibold text-base"
            >
              {submitting ? 'Submitting...' : 'Submit Backorder Notification'}
            </Button>
          </form>
        )}
      </div>

      <p className="text-white/30 text-xs mt-6">© RCM Automotive. All rights reserved.</p>
    </div>
  );
}