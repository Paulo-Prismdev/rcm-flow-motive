import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, Loader, ShieldCheck, Car } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { appParams } from '@/lib/app-params';

const companyLogo = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

// Direct fetch to the function endpoint — bypasses the SDK entirely,
// so no auth.me() call and no 403 on public pages.
async function callFunction(functionName, payload) {
  const { serverUrl, appId } = appParams;
  const url = `${serverUrl}/api/apps/${appId}/functions/${functionName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.response = { data };
    throw err;
  }
  return { data };
}

function DOBCalendar({ selected, onSelect }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const [viewDate, setViewDate] = useState(selected || new Date(currentYear - 30, 0, 1));
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const handleDayClick = (day) => {
    onSelect(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
  };
  const isSelected = (day) => {
    if (!selected) return false;
    return selected.getDate() === day && selected.getMonth() === viewDate.getMonth() && selected.getFullYear() === viewDate.getFullYear();
  };

  return (
    <div className="p-3 w-72">
      <div className="flex gap-2 mb-3">
        <select value={viewDate.getMonth()} onChange={(e) => setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value), 1))} className="flex-1 px-2 py-1.5 text-sm border rounded-md bg-white">
          {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={viewDate.getFullYear()} onChange={(e) => setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth(), 1))} className="w-24 px-2 py-1.5 text-sm border rounded-md bg-white">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map(i => <div key={`b-${i}`} />)}
        {days.map(day => (
          <button key={day} type="button" onClick={() => handleDayClick(day)}
            className={`p-2 text-sm rounded-md hover:bg-blue-50 transition-colors ${isSelected(day) ? 'bg-blue-600 text-white font-bold' : ''}`}>
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function IndemnityForm() {
  const pathParts = window.location.pathname.split('/');
  const urlClaimId = pathParts[pathParts.length - 2];
  const urlToken = pathParts[pathParts.length - 1];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimInfo, setClaimInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    indemnity_driver_dob: '',
    indemnity_registered_owner: '',
    indemnity_pending_prosecutions: '',
    indemnity_dvla_medical_restrictions: '',
    indemnity_full_license_12_months: '',
    indemnity_convictions_last_5_years: '',
    indemnity_vehicle_use_at_incident: '',
    indemnity_vehicle_modifications: '',
  });

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    setLoading(true);
    try {
      const res = await callFunction('submitIndemnityForm', {
        claimId: urlClaimId,
        token: urlToken,
        action: 'validate',
      });
      if (res.data?.success) {
        setClaimInfo(res.data.claim);
      } else {
        setError(res.data?.error || 'Invalid or expired link.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired link.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.indemnity_driver_dob) { setError('Please enter the driver\'s date of birth.'); return; }
    if (!formData.indemnity_registered_owner) { setError('Please enter the registered owner.'); return; }
    if (!formData.indemnity_full_license_12_months) { setError('Please confirm license held for 12+ months.'); return; }
    if (!formData.indemnity_vehicle_use_at_incident) { setError('Please select vehicle use at time of incident.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await callFunction('submitIndemnityForm', {
        claimId: urlClaimId,
        token: urlToken,
        formData,
      });
      if (res.data?.success) {
        setSubmitted(true);
      } else {
        setError(res.data?.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm';
  const labelCls = 'block text-sm font-medium text-gray-600 mb-1.5';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Verifying your link...</p>
        </div>
      </div>
    );
  }

  if (error && !claimInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link Invalid</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-4">Your indemnity details have been submitted successfully. We have everything we need to proceed with your claim.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={companyLogo} alt="RCM Automotive" className="h-16 w-auto object-contain mx-auto mb-3" />
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Indemnity Details Form</h1>
          <p className="text-gray-500 text-sm mt-1">Please complete this form so we can proceed with your claim.</p>
        </div>

        {/* Claim context banner */}
        {claimInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Ref: {claimInfo.job_number || 'N/A'}</p>
              <p className="text-xs text-gray-500">{claimInfo.client_name} — {claimInfo.reg}{claimInfo.make_model ? ` (${claimInfo.make_model})` : ''}</p>
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* DOB */}
          <div>
            <label className={labelCls}>Driver's Date of Birth *</label>
            <Popover>
              <div className="relative">
                <Input type="text" placeholder="DD/MM/YYYY"
                  value={formData.indemnity_driver_dob ? (() => { try { const d = new Date(formData.indemnity_driver_dob); return isValid(d) ? format(d, 'dd/MM/yyyy') : formData.indemnity_driver_dob; } catch { return formData.indemnity_driver_dob; } })() : ''}
                  onChange={(e) => { const val = e.target.value; const parsed = parse(val, 'dd/MM/yyyy', new Date()); if (isValid(parsed)) { setFormData(p => ({ ...p, indemnity_driver_dob: format(parsed, 'yyyy-MM-dd') })); } else { setFormData(p => ({ ...p, indemnity_driver_dob: val })); } }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm pr-10" />
                <PopoverTrigger asChild>
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
              </div>
              <PopoverContent className="w-auto p-0" align="start">
                <DOBCalendar selected={formData.indemnity_driver_dob ? new Date(formData.indemnity_driver_dob) : undefined}
                  onSelect={(date) => { if (date) setFormData(p => ({ ...p, indemnity_driver_dob: format(date, 'yyyy-MM-dd') })); }} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Registered owner */}
          <div>
            <label className={labelCls}>Who is the registered owner and keeper of the vehicle? *</label>
            <Input value={formData.indemnity_registered_owner} onChange={e => setFormData(p => ({ ...p, indemnity_registered_owner: e.target.value }))} className={inputCls} placeholder="Enter registered owner and keeper details..." />
          </div>

          {/* Pending prosecutions */}
          <div>
            <label className={labelCls}>Does the driver have any pending prosecutions?</label>
            <Textarea value={formData.indemnity_pending_prosecutions} onChange={e => setFormData(p => ({ ...p, indemnity_pending_prosecutions: e.target.value }))} className={inputCls} placeholder="Enter details (or 'No' if none)..." rows={2} />
          </div>

          {/* DVLA medical */}
          <div>
            <label className={labelCls}>Has the driver been told not to drive by DVLA or any medical source?</label>
            <Textarea value={formData.indemnity_dvla_medical_restrictions} onChange={e => setFormData(p => ({ ...p, indemnity_dvla_medical_restrictions: e.target.value }))} className={inputCls} placeholder="Enter details (or 'No' if none)..." rows={2} />
          </div>

          {/* License 12 months */}
          <div>
            <label className={labelCls}>Has the driver held a full UK/EU license for at least 12 months and driven regularly in the UK? *</label>
            <Textarea value={formData.indemnity_full_license_12_months} onChange={e => setFormData(p => ({ ...p, indemnity_full_license_12_months: e.target.value }))} className={inputCls} placeholder="Enter details (e.g. 'Yes' or explain)..." rows={2} />
          </div>

          {/* Convictions */}
          <div>
            <label className={labelCls}>Has the driver had any motoring convictions or fixed penalty points within the last 5 years?</label>
            <Textarea value={formData.indemnity_convictions_last_5_years} onChange={e => setFormData(p => ({ ...p, indemnity_convictions_last_5_years: e.target.value }))} className={inputCls} placeholder="Enter details of convictions/points (or 'No' if none)..." rows={2} />
          </div>

          {/* Vehicle use */}
          <div>
            <label className={labelCls}>What was the vehicle being used for at the time of the incident? *</label>
            <select value={formData.indemnity_vehicle_use_at_incident} onChange={e => setFormData(p => ({ ...p, indemnity_vehicle_use_at_incident: e.target.value }))} className={inputCls}>
              <option value="">Select...</option>
              <option value="Business">Business</option>
              <option value="Social">Social</option>
              <option value="Commuting">Commuting</option>
            </select>
          </div>

          {/* Modifications */}
          <div>
            <label className={labelCls}>Are there any modifications to the policyholder's vehicle?</label>
            <Textarea value={formData.indemnity_vehicle_modifications} onChange={e => setFormData(p => ({ ...p, indemnity_vehicle_modifications: e.target.value }))} className={inputCls} placeholder="Enter details of modifications (or 'No' if none)..." rows={2} />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
            {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4" /> Submit Form</>}
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your information is handled securely and used only for processing your insurance claim.
        </p>
      </div>
    </div>
  );
}