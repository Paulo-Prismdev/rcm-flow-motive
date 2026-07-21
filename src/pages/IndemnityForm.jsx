import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getPublicFormToken } from '@/functions/getPublicFormToken';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, ArrowLeft, ArrowRight, Loader, ShieldCheck, AlertTriangle } from 'lucide-react';

const STEPS = [
  { key: 'driver', title: 'Driver & Licence' },
  { key: 'history', title: 'Driver History' },
  { key: 'vehicle', title: 'Vehicle & Incident' },
  { key: 'evidence', title: 'Evidence & Info' },
  { key: 'review', title: 'Review & Submit' },
];

// Fields that count toward the live completion percentage.
const TRACKED_FIELDS = [
  'indemnity_driver_dob',
  'indemnity_registered_owner',
  'indemnity_full_license_12_months',
  'indemnity_pending_prosecutions',
  'indemnity_dvla_medical_restrictions',
  'indemnity_convictions_last_5_years',
  'indemnity_incidents_last_5_years',
  'indemnity_vehicle_use_at_incident',
  'indemnity_vehicle_modifications',
  'indemnity_pre_existing_damage',
  'indemnity_cctv_dashcam',
  'indemnity_property_damaged',
  'indemnity_more_photos',
];

const calcAge = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

const initialForm = {
  indemnity_driver_dob: '',
  indemnity_registered_owner: '',
  indemnity_pending_prosecutions: '',
  indemnity_dvla_medical_restrictions: '',
  indemnity_full_license_12_months: '',
  indemnity_convictions_last_5_years: '',
  indemnity_incidents_last_5_years: '',
  indemnity_vehicle_use_at_incident: '',
  indemnity_vehicle_modifications: '',
  indemnity_modification_details: '',
  indemnity_pre_existing_damage: '',
  indemnity_cctv_dashcam: '',
  indemnity_property_damaged: '',
  indemnity_more_photos: '',
  indemnity_other_info: '',
};

export default function IndemnityForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const indemnity_token = urlParams.get('token');

  const [formData, setFormData] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formToken, setFormToken] = useState('');
  const [linkValid, setLinkValid] = useState(true);

  useEffect(() => {
    if (!indemnity_token) { setLinkValid(false); return; }
    getPublicFormToken({}).then(res => setFormToken(res.data?.token || '')).catch(() => {});
  }, [indemnity_token]);

  const field = (key, value) => setFormData(p => ({ ...p, [key]: value }));

  const completion = Math.round(
    TRACKED_FIELDS.filter(f => formData[f] && String(formData[f]).trim() !== '').length / TRACKED_FIELDS.length * 100
  );

  const currentStepKey = STEPS[step]?.key;

  const validateStep = () => {
    if (currentStepKey === 'driver') {
      if (!formData.indemnity_driver_dob) return 'Please enter your date of birth.';
      if (!formData.indemnity_registered_owner.trim()) return 'Please enter the registered owner/keeper.';
      if (!formData.indemnity_full_license_12_months) return 'Please confirm your licence status.';
    }
    if (currentStepKey === 'history') {
      if (!formData.indemnity_pending_prosecutions) return 'Please answer all questions in this section.';
      if (!formData.indemnity_dvla_medical_restrictions) return 'Please answer all questions in this section.';
      if (!formData.indemnity_convictions_last_5_years) return 'Please answer all questions in this section.';
      if (!formData.indemnity_incidents_last_5_years) return 'Please answer all questions in this section.';
    }
    if (currentStepKey === 'vehicle') {
      if (!formData.indemnity_vehicle_use_at_incident) return 'Please select the vehicle use at the time of the incident.';
      if (!formData.indemnity_vehicle_modifications) return 'Please confirm whether the vehicle has any modifications.';
      if (formData.indemnity_vehicle_modifications === 'Yes' && !formData.indemnity_modification_details.trim()) return 'Please describe the modifications.';
      if (!formData.indemnity_pre_existing_damage) return 'Please confirm whether there was any pre-existing damage.';
    }
    if (currentStepKey === 'evidence') {
      if (!formData.indemnity_cctv_dashcam) return 'Please answer all questions in this section.';
      if (!formData.indemnity_property_damaged) return 'Please answer all questions in this section.';
      if (!formData.indemnity_more_photos) return 'Please answer all questions in this section.';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };
  const prev = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await base44.functions.invoke('submitIndemnityForm', {
        _form_secret: formToken,
        indemnity_token,
        formData,
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

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm';
  const labelCls = 'block text-sm font-medium text-gray-600 mb-1.5';

  // Default polarity: No = green (good), Yes = red (risk).
  // For positive-capability questions (CCTV footage, more photos) pass yesGood to flip.
  const YesNo = ({ value, onChange, yesGood = false }) => {
    const yesColor = yesGood ? 'bg-green-500 border-green-500' : 'bg-red-500 border-red-500';
    const noColor = yesGood ? 'bg-red-500 border-red-500' : 'bg-green-500 border-green-500';
    return (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onChange('Yes')} className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${value === 'Yes' ? `${yesColor} text-white` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>Yes</button>
        <button type="button" onClick={() => onChange('No')} className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${value === 'No' ? `${noColor} text-white` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>No</button>
      </div>
    );
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  // Day / Month / Year dropdowns — avoids the slow scroll-wheel year picker on native date inputs.
  const DOBPicker = ({ value, onChange }) => {
    const d = value ? new Date(value) : null;
    const valid = d && !isNaN(d.getTime());
    const day = valid ? d.getDate() : '';
    const month = valid ? d.getMonth() + 1 : '';
    const year = valid ? d.getFullYear() : '';
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);
    const maxDay = month && year ? new Date(year, month, 0).getDate() : 31;
    const set = (newDay, newMonth, newYear) => {
      const dd = newDay || day;
      const mm = newMonth || month;
      const yy = newYear || year;
      if (dd && mm && yy) {
        const pad = n => String(n).padStart(2, '0');
        onChange(`${yy}-${pad(mm)}-${pad(dd)}`);
      } else {
        onChange('');
      }
    };
    const selCls = 'w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm';
    return (
      <div className="grid grid-cols-3 gap-2">
        <select value={day} onChange={e => set(parseInt(e.target.value) || '', month, year)} className={selCls}>
          <option value="">Day</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={month} onChange={e => set(day, parseInt(e.target.value) || '', year)} className={selCls}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => set(day, month, parseInt(e.target.value) || '')} className={selCls}>
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    );
  };

  if (!linkValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid Link</h2>
          <p className="text-gray-500 text-sm">This indemnity link is invalid or has expired. Please contact us to request a new link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-4">Your indemnity details have been submitted and added to your claim. Our team will review the information and be in touch if anything further is required.</p>
          <p className="text-xs text-gray-400">You can now close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#151d44] px-4 py-4 flex items-center justify-center">
        <img src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg" alt="RCM Automotive" className="h-14 w-auto object-contain" />
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Indemnity Questionnaire</h1>
          <p className="text-sm text-gray-500 mt-1">Please complete all sections as accurately as possible. Your answers will be added directly to your claim file.</p>
        </div>

        {/* Percentage completion tracker */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Progress</span>
            <span className="text-xs font-bold text-amber-600">{completion}% complete</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${completion}%` }} />
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-6 gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 hidden sm:block text-center max-w-[64px]">{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-5">{STEPS[step]?.title}</h2>

          {currentStepKey === 'driver' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Your Date of Birth *</label>
                <DOBPicker value={formData.indemnity_driver_dob} onChange={v => field('indemnity_driver_dob', v)} />
                {(() => { const a = calcAge(formData.indemnity_driver_dob); return a !== null ? <p className="text-xs text-gray-500 mt-1">Calculated age: <span className="font-semibold text-gray-700">{a} years</span></p> : null; })()}
              </div>
              <div><label className={labelCls}>Registered Owner / Keeper of the Vehicle *</label><Input value={formData.indemnity_registered_owner} onChange={e => field('indemnity_registered_owner', e.target.value)} className={inputCls} placeholder="Full name of the registered owner/keeper" /></div>
              <div>
                <label className={labelCls}>Have you held a full UK/EU licence for at least 12 months and driven regularly in the UK? *</label>
                <YesNo value={formData.indemnity_full_license_12_months} onChange={v => field('indemnity_full_license_12_months', v)} />
              </div>
            </div>
          )}

          {currentStepKey === 'history' && (
            <div className="space-y-4">
              <div><label className={labelCls}>Do you have any pending prosecutions? *</label><YesNo value={formData.indemnity_pending_prosecutions} onChange={v => field('indemnity_pending_prosecutions', v)} /></div>
              <div><label className={labelCls}>Have you been told not to drive by the DVLA or any medical source? *</label><YesNo value={formData.indemnity_dvla_medical_restrictions} onChange={v => field('indemnity_dvla_medical_restrictions', v)} /></div>
              <div><label className={labelCls}>Have you had any motoring convictions or fixed penalty points within the last 5 years? *</label><YesNo value={formData.indemnity_convictions_last_5_years} onChange={v => field('indemnity_convictions_last_5_years', v)} /></div>
              <div><label className={labelCls}>Have you been involved in any incidents, losses, or thefts in the last 5 years, regardless of whether a claim was made? *</label><YesNo value={formData.indemnity_incidents_last_5_years} onChange={v => field('indemnity_incidents_last_5_years', v)} /></div>
            </div>
          )}

          {currentStepKey === 'vehicle' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>What was the vehicle being used for at the time of the incident? *</label>
                <select value={formData.indemnity_vehicle_use_at_incident} onChange={e => field('indemnity_vehicle_use_at_incident', e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  <option value="Business">Business</option>
                  <option value="Social">Social</option>
                  <option value="Commuting">Commuting</option>
                </select>
              </div>
              <div><label className={labelCls}>Does the vehicle have any modifications? *</label><YesNo value={formData.indemnity_vehicle_modifications} onChange={v => field('indemnity_vehicle_modifications', v)} /></div>
              {formData.indemnity_vehicle_modifications === 'Yes' && (
                <div><label className={labelCls}>If so, what modifications? *</label><Textarea value={formData.indemnity_modification_details} onChange={e => field('indemnity_modification_details', e.target.value)} className={`${inputCls} h-24`} placeholder="Please describe the modifications..." /></div>
              )}
              <div><label className={labelCls}>Did any vehicle involved have any pre-existing damages? *</label><YesNo value={formData.indemnity_pre_existing_damage} onChange={v => field('indemnity_pre_existing_damage', v)} /></div>
            </div>
          )}

          {currentStepKey === 'evidence' && (
            <div className="space-y-4">
              <div><label className={labelCls}>Is there any CCTV or dashcam footage available? *</label><YesNo value={formData.indemnity_cctv_dashcam} onChange={v => field('indemnity_cctv_dashcam', v)} yesGood /></div>
              <div><label className={labelCls}>As a result of the incident, was any property damaged? *</label><YesNo value={formData.indemnity_property_damaged} onChange={v => field('indemnity_property_damaged', v)} /></div>
              <div><label className={labelCls}>Can you provide more photos of the damages to the vehicles involved? *</label><YesNo value={formData.indemnity_more_photos} onChange={v => field('indemnity_more_photos', v)} yesGood /></div>
              <div><label className={labelCls}>Any other information that you believe is relevant and will aid the claim?</label><Textarea value={formData.indemnity_other_info} onChange={e => field('indemnity_other_info', e.target.value)} className={`${inputCls} h-24`} placeholder="Enter any other relevant information..." /></div>
            </div>
          )}

          {currentStepKey === 'review' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Declaration</p>
                <p>I confirm that the information provided in this form is true and accurate to the best of my knowledge and belief. I understand that this information will be used in connection with my insurance claim.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                <p><strong>Date of Birth:</strong> {formData.indemnity_driver_dob || '—'}</p>
                <p><strong>Registered Owner/Keeper:</strong> {formData.indemnity_registered_owner || '—'}</p>
                <p><strong>Full licence 12+ months:</strong> {formData.indemnity_full_license_12_months || '—'}</p>
                <p><strong>Pending prosecutions:</strong> {formData.indemnity_pending_prosecutions || '—'}</p>
                <p><strong>DVLA/medical restrictions:</strong> {formData.indemnity_dvla_medical_restrictions || '—'}</p>
                <p><strong>Convictions (5 yrs):</strong> {formData.indemnity_convictions_last_5_years || '—'}</p>
                <p><strong>Incidents (5 yrs):</strong> {formData.indemnity_incidents_last_5_years || '—'}</p>
                <p><strong>Vehicle use at incident:</strong> {formData.indemnity_vehicle_use_at_incident || '—'}</p>
                <p><strong>Vehicle modifications:</strong> {formData.indemnity_vehicle_modifications || '—'}</p>
                <p><strong>Pre-existing damage:</strong> {formData.indemnity_pre_existing_damage || '—'}</p>
                <p><strong>CCTV/dashcam:</strong> {formData.indemnity_cctv_dashcam || '—'}</p>
                <p><strong>Property damaged:</strong> {formData.indemnity_property_damaged || '—'}</p>
                <p><strong>More photos:</strong> {formData.indemnity_more_photos || '—'}</p>
              </div>
              <p className="text-xs text-gray-400 text-center">Please review the summary above and click Submit when ready.</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-3">
          {step > 0 ? (
            <Button onClick={prev} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : <div />}
          {step < STEPS.length - 1 ? (
            <Button onClick={next} className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
              {isSubmitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting...</> : <><ShieldCheck className="w-4 h-4" /> Submit</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}