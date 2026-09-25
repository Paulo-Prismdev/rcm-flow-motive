import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getPublicFormToken } from '@/functions/getPublicFormToken';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Loader, PenLine, Trash2, FileCheck2, Plus, X, ArrowLeft, ArrowRight } from 'lucide-react';

const VEHICLE_TYPES = ['Panel Van', 'Pickup', '4x4', 'Car-Derived Van', 'Car', 'HGV', 'Other'];

const LIKE_FOR_LIKE_REASONS = [
  'Load volume / payload capacity',
  'Towing capability',
  'Racking, shelving or fitted equipment',
  'Seating / crew capacity',
  '4x4 / off-road capability',
  'Refrigeration / specialist conversion',
  'Security requirements for tools, stock or equipment',
  'Contractual or customer requirements',
];

const CONSEQUENCE_OPTIONS = [
  'Attend customer jobs / appointments',
  'Transport tools, stock or equipment',
  'Meet contractual obligations',
  'Keep the driver productively employed',
];

const STEPS = [
  { key: 'company', title: 'Company Details' },
  { key: 'vehicle', title: 'Damaged Vehicle' },
  { key: 'fleet', title: 'Fleet Availability' },
  { key: 'likeForLike', title: 'Like-for-Like' },
  { key: 'consequences', title: 'Consequences' },
  { key: 'mitigation', title: 'Undertakings' },
  { key: 'declaration', title: 'Declaration' },
];

export default function DeclarationOfNeedForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const declaration_of_need_token = urlParams.get('token');

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(!!declaration_of_need_token);
  const [linkValid, setLinkValid] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formToken, setFormToken] = useState('');
  const [step, setStep] = useState(0);

  // Signature canvas
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [hasSig, setHasSig] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    company: { registered_name: '', company_number: '', registered_address: '', person_name: '', position: '', email: '', telephone: '' },
    vehicle: { registration: '', make_model: '', vehicle_type: '', driver_assigned: '', roadworthy: '', main_business_use: '' },
    fleet: { total_vehicles: '', off_road_count: '', vehicles: [], confirmations: { all_assigned: false, no_spare: false, no_reallocation: false, no_replacement: false, no_other_source: false }, exception_explanation: '' },
    like_for_like: { reasons: [], other_detail: '', daily_use_description: '' },
    consequences: { impacts: [], estimated_impact: '' },
    mitigation: { agreed: false },
    declaration: { authorised: false, statement_of_truth_accepted: false, full_name: '', position: '', date: '' },
  });

  useEffect(() => {
    if (!declaration_of_need_token) { setLinkValid(false); setLoading(false); return; }
    (async () => {
      try {
        const tokenRes = await getPublicFormToken({});
        const secret = tokenRes.data?.token || '';
        setFormToken(secret);
        const res = await base44.functions.invoke('getDeclarationOfNeedClaim', {
          _form_secret: secret,
          declaration_of_need_token,
        });
        const data = res?.data;
        if (data?.valid) {
          setClaim(data);
          if (data.signed) setSubmitted(true);
          // Pre-fill all possible fields from the claim
          setFormData(prev => ({
            ...prev,
            company: {
              ...prev.company,
              registered_name: data.client_name || '',
              registered_address: data.client_address || '',
              person_name: data.contact_name || '',
              email: data.contact_email || '',
              telephone: data.contact_phone || '',
            },
            vehicle: {
              ...prev.vehicle,
              registration: data.reg || '',
              make_model: [data.vehicle_make, data.vehicle_model].filter(Boolean).join(' ') || '',
              vehicle_type: data.vehicle_type || '',
              driver_assigned: data.driver_name || '',
              roadworthy: data.unroadworthy === true ? 'No' : (data.unroadworthy === false ? 'Yes' : ''),
              main_business_use: data.vehicle_use || '',
            },
            declaration: {
              ...prev.declaration,
              full_name: data.contact_name || '',
              date: new Date().toLocaleDateString('en-GB'),
            },
          }));
        } else {
          setLinkValid(false);
        }
      } catch {
        setLinkValid(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [declaration_of_need_token]);

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
  }, [step]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };
  const startDraw = (e) => { e.preventDefault(); isDrawing.current = true; lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos; setHasSig(true);
  };
  const endDraw = () => { isDrawing.current = false; };
  const clearSig = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const update = (path, value) => {
    setFormData(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]] = { ...obj[keys[i]] };
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const toggleArrayItem = (path, item) => {
    setFormData(prev => {
      const keys = path.split('.');
      let obj = prev;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      const arr = obj[keys[keys.length - 1]] || [];
      obj[keys[keys.length - 1]] = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
      return { ...prev };
    });
  };

  const addFleetVehicle = () => {
    setFormData(prev => ({
      ...prev,
      fleet: { ...prev.fleet, vehicles: [...prev.fleet.vehicles, { registration: '', make_model: '', type: '', assigned_to: '', available: '' }] },
    }));
  };
  const updateFleetVehicle = (idx, field, value) => {
    setFormData(prev => {
      const vehicles = [...prev.fleet.vehicles];
      vehicles[idx] = { ...vehicles[idx], [field]: value };
      return { ...prev, fleet: { ...prev.fleet, vehicles } };
    });
  };
  const removeFleetVehicle = (idx) => {
    setFormData(prev => ({ ...prev, fleet: { ...prev.fleet, vehicles: prev.fleet.vehicles.filter((_, i) => i !== idx) } }));
  };

  const validateStep = (s) => {
    setError('');
    if (s === 0) {
      const c = formData.company;
      if (!c.registered_name || !c.person_name || !c.position || !c.email || !c.telephone) { setError('Please complete all required company details.'); return false; }
    }
    if (s === 1) {
      const v = formData.vehicle;
      if (!v.registration || !v.make_model || !v.vehicle_type || !v.roadworthy) { setError('Please complete all required vehicle details.'); return false; }
    }
    if (s === 5) {
      if (!formData.mitigation.agreed) { setError('You must agree to the undertakings to continue.'); return false; }
    }
    if (s === 6) {
      const d = formData.declaration;
      if (!d.authorised || !d.statement_of_truth_accepted || !d.full_name || !d.position) { setError('Please complete all declaration fields and tick both confirmations.'); return false; }
      if (!hasSig) { setError('Please sign the form before submitting.'); return false; }
    }
    return true;
  };

  const handleNext = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const handleBack = () => { setError(''); setStep(s => Math.max(s - 1, 0)); };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;
    setIsSubmitting(true);
    try {
      const signatureDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
      const result = await base44.functions.invoke('submitDeclarationOfNeedForm', {
        _form_secret: formToken,
        declaration_of_need_token,
        formData,
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
          <p className="text-gray-500 text-sm">This Declaration of Need link is invalid, has already been used, or has expired. Please contact us to request a new link.</p>
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
          <p className="text-gray-500 mb-4">Your Declaration of Need – Replacement Vehicle has been signed and saved to your claim file. Our team has been notified.</p>
          <p className="text-xs text-gray-400">You can now close this page.</p>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm';
  const labelCls = 'block text-sm font-medium text-gray-600 mb-1.5';
  const sectionCls = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4';

  const Checkbox = ({ checked, onChange, label }) => (
    <label className="flex items-start gap-3 py-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-400 flex-shrink-0" />
      <span className="text-sm text-gray-700 leading-relaxed">{label}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#151d44] px-4 py-4 flex items-center justify-center">
        <img src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg" alt="RCM Automotive" className="h-14 w-auto object-contain" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Declaration of Need – Replacement Vehicle</h1>
          <p className="text-sm text-gray-500 mt-1">This form is the company's signed evidence that a like-for-like replacement vehicle was needed because no other vehicle was available within the fleet.</p>
        </div>

        {/* Pre-fill confirmation */}
        {claim && (
          <div className="mb-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Claim Reference</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Job:</span> <span className="font-semibold text-gray-800">{claim.job_number || '—'}</span></div>
              <div><span className="text-gray-500">Reg:</span> <span className="font-semibold text-gray-800">{(claim.reg || '').toUpperCase()}</span></div>
              <div><span className="text-gray-500">Claim Ref:</span> <span className="font-semibold text-gray-800">{claim.claim_ref || '—'}</span></div>
              <div><span className="text-gray-500">Incident Date:</span> <span className="font-semibold text-gray-800">{claim.loss_date || '—'}</span></div>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => i < step && setStep(i)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${i === step ? 'bg-[#151d44] text-white' : i < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {i + 1}. {s.title}
              </button>
              {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Company Details */}
        {step === 0 && (
          <div className={sectionCls}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Section 1 – Company Details</h3>
            <div className="space-y-3">
              <div><label className={labelCls}>Registered Company Name *</label><input value={formData.company.registered_name} onChange={e => update('company.registered_name', e.target.value)} className={inputCls} placeholder="Company Ltd" /></div>
              <div><label className={labelCls}>Company Number</label><input value={formData.company.company_number} onChange={e => update('company.company_number', e.target.value)} className={inputCls} placeholder="e.g. 12345678" /></div>
              <div><label className={labelCls}>Registered Address</label><textarea value={formData.company.registered_address} onChange={e => update('company.registered_address', e.target.value)} className={inputCls} rows={2} placeholder="Full registered address" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Name of Person Completing *</label><input value={formData.company.person_name} onChange={e => update('company.person_name', e.target.value)} className={inputCls} placeholder="Full name" /></div>
                <div><label className={labelCls}>Position / Job Title *</label><input value={formData.company.position} onChange={e => update('company.position', e.target.value)} className={inputCls} placeholder="e.g. Fleet Manager" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Email *</label><input type="email" value={formData.company.email} onChange={e => update('company.email', e.target.value)} className={inputCls} placeholder="name@company.com" /></div>
                <div><label className={labelCls}>Telephone *</label><input value={formData.company.telephone} onChange={e => update('company.telephone', e.target.value)} className={inputCls} placeholder="Phone number" /></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Damaged Vehicle */}
        {step === 1 && (
          <div className={sectionCls}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Section 2 – Damaged Vehicle</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Registration *</label><input value={formData.vehicle.registration} onChange={e => update('vehicle.registration', e.target.value)} className={inputCls} placeholder="e.g. AB12 CDE" /></div>
                <div><label className={labelCls}>Make / Model *</label><input value={formData.vehicle.make_model} onChange={e => update('vehicle.make_model', e.target.value)} className={inputCls} placeholder="e.g. Ford Transit" /></div>
              </div>
              <div>
                <label className={labelCls}>Vehicle Type *</label>
                <select value={formData.vehicle.vehicle_type} onChange={e => update('vehicle.vehicle_type', e.target.value)} className={inputCls}>
                  <option value="">Select type...</option>
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Driver Normally Assigned</label><input value={formData.vehicle.driver_assigned} onChange={e => update('vehicle.driver_assigned', e.target.value)} className={inputCls} placeholder="Driver name" /></div>
              <div>
                <label className={labelCls}>Is the vehicle currently roadworthy? *</label>
                <div className="flex gap-3">
                  {[['Yes', 'Yes'], ['No', 'No']].map(([label, val]) => (
                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="roadworthy" checked={formData.vehicle.roadworthy === val} onChange={() => update('vehicle.roadworthy', val)} className="w-5 h-5 text-amber-500 focus:ring-amber-400" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className={labelCls}>Main Business Use of the Vehicle</label><input value={formData.vehicle.main_business_use} onChange={e => update('vehicle.main_business_use', e.target.value)} className={inputCls} placeholder="e.g. Deliveries, engineer transport" /></div>
            </div>
          </div>
        )}

        {/* Step 2: Fleet Availability */}
        {step === 2 && (
          <div className={sectionCls}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Section 3 – Fleet Availability</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Total Vehicles Operated</label><input type="number" value={formData.fleet.total_vehicles} onChange={e => update('fleet.total_vehicles', e.target.value)} className={inputCls} placeholder="e.g. 12" /></div>
                <div><label className={labelCls}>Vehicles Currently Off Road (other than damaged vehicle)</label><input type="number" value={formData.fleet.off_road_count} onChange={e => update('fleet.off_road_count', e.target.value)} className={inputCls} placeholder="e.g. 2" /></div>
              </div>

              {/* Fleet list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + ' mb-0'}>Fleet List</label>
                  <button onClick={addFleetVehicle} className="flex items-center gap-1 text-xs text-amber-600 font-medium hover:text-amber-700">
                    <Plus className="w-4 h-4" /> Add Vehicle
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2">Add each vehicle in your fleet. Mark whether it was available at the date of the incident.</p>
                {formData.fleet.vehicles.length === 0 && (
                  <div className="text-center py-4 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">No fleet vehicles added yet. Click "Add Vehicle" to begin.</div>
                )}
                {formData.fleet.vehicles.map((v, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-3 mb-2 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">Vehicle {idx + 1}</span>
                      <button onClick={() => removeFleetVehicle(idx)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input value={v.registration} onChange={e => updateFleetVehicle(idx, 'registration', e.target.value)} className={inputCls} placeholder="Registration" />
                      <input value={v.make_model} onChange={e => updateFleetVehicle(idx, 'make_model', e.target.value)} className={inputCls} placeholder="Make / Model" />
                      <select value={v.type} onChange={e => updateFleetVehicle(idx, 'type', e.target.value)} className={inputCls}>
                        <option value="">Type...</option>
                        {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input value={v.assigned_to} onChange={e => updateFleetVehicle(idx, 'assigned_to', e.target.value)} className={inputCls} placeholder="Assigned staff member / role" />
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Available at date of incident?</label>
                        <div className="flex gap-2">
                          {[['Y', 'Yes'], ['N', 'No']].map(([val, label]) => (
                            <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                              <input type="radio" name={`avail-${idx}`} checked={v.available === val} onChange={() => updateFleetVehicle(idx, 'available', val)} className="w-4 h-4 text-amber-500 focus:ring-amber-400" />
                              <span className="text-sm text-gray-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmations */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">I confirm on behalf of the company that, at the date of the incident and for the expected repair period:</p>
                <Checkbox checked={formData.fleet.confirmations.all_assigned} onChange={v => update('fleet.confirmations.all_assigned', v)} label="Every vehicle in the company fleet is permanently assigned to, and in daily use by, a named member of staff for business purposes." />
                <Checkbox checked={formData.fleet.confirmations.no_spare} onChange={v => update('fleet.confirmations.no_spare', v)} label="The company has no spare, pool, reserve or unassigned vehicles available." />
                <Checkbox checked={formData.fleet.confirmations.no_reallocation} onChange={v => update('fleet.confirmations.no_reallocation', v)} label="No vehicle could be reallocated to the driver of the damaged vehicle without taking another vehicle off essential business operations." />
                <Checkbox checked={formData.fleet.confirmations.no_replacement} onChange={v => update('fleet.confirmations.no_replacement', v)} label="The company's lease, contract hire, maintenance or insurance arrangements do not include a replacement or courtesy vehicle for this incident." />
                <Checkbox checked={formData.fleet.confirmations.no_other_source} onChange={v => update('fleet.confirmations.no_other_source', v)} label="No suitable replacement vehicle was available from any other source at no cost to the company." />
                <div className="mt-2">
                  <label className={labelCls}>If any of the above can't be ticked, or any fleet vehicle is marked as available, please explain why:</label>
                  <textarea value={formData.fleet.exception_explanation} onChange={e => update('fleet.exception_explanation', e.target.value)} className={inputCls} rows={3} placeholder="Explanation (if applicable)" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Like-for-Like */}
        {step === 3 && (
          <div className={sectionCls}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Section 4 – Requirement for a Like-for-Like Vehicle</h3>
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">The replacement vehicle must be equivalent to the damaged vehicle for the following business reasons (tick all that apply):</p>
              {LIKE_FOR_LIKE_REASONS.map(r => (
                <Checkbox key={r} checked={formData.like_for_like.reasons.includes(r)} onChange={() => toggleArrayItem('like_for_like.reasons', r)} label={r} />
              ))}
              <div>
                <label className={labelCls}>Other (with detail)</label>
                <input value={formData.like_for_like.other_detail} onChange={e => update('like_for_like.other_detail', e.target.value)} className={inputCls} placeholder="Describe other reason" />
              </div>
              <div>
                <label className={labelCls}>Describe the vehicle's daily business use and why a smaller or lower-specification vehicle would not be suitable. *</label>
                <textarea value={formData.like_for_like.daily_use_description} onChange={e => update('like_for_like.daily_use_description', e.target.value)} className={inputCls} rows={4} placeholder="Daily use and why a lower-spec vehicle wouldn't work..." />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Consequences */}
        {step === 4 && (
          <div className={sectionCls}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Section 5 – Consequences of Being Without a Vehicle</h3>
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Without a replacement vehicle the company would be unable to (tick all that apply):</p>
              {CONSEQUENCE_OPTIONS.map(c => (
                <Checkbox key={c} checked={formData.consequences.impacts.includes(c)} onChange={() => toggleArrayItem('consequences.impacts', c)} label={c} />
              ))}
              <div>
                <label className={labelCls}>Estimated Impact (optional)</label>
                <textarea value={formData.consequences.estimated_impact} onChange={e => update('consequences.estimated_impact', e.target.value)} className={inputCls} rows={3} placeholder="e.g. Lost revenue of £X/day, unable to fulfil Y contracts..." />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Mitigation */}
        {step === 5 && (
          <div className={sectionCls}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Section 6 – Mitigation and Undertakings</h3>
            <p className="text-sm text-gray-700 mb-3">The company confirms that it will:</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-3 text-sm text-gray-700 leading-relaxed space-y-2">
              <p>• use the replacement vehicle only for the purposes it would have used the damaged vehicle for;</p>
              <p>• tell RCM Automotive Ltd straight away if any fleet vehicle becomes available, or if the damaged vehicle is repaired, replaced or declared a total loss;</p>
              <p>• return the replacement vehicle promptly when it is no longer needed; and</p>
              <p>• cooperate with any reasonable request for supporting evidence, such as fleet lists, lease agreements or job records.</p>
            </div>
            <Checkbox checked={formData.mitigation.agreed} onChange={v => update('mitigation.agreed', v)} label="I agree to the above undertakings on behalf of the company." />
          </div>
        )}

        {/* Step 6: Declaration */}
        {step === 6 && (
          <div className={sectionCls}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Section 7 – Declaration and Statement of Truth</h3>
            <div className="space-y-3">
              <Checkbox checked={formData.declaration.authorised} onChange={v => update('declaration.authorised', v)} label="I confirm that I am authorised to make this declaration on behalf of the company named above." />
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                I believe that the facts stated in this declaration are true and complete. I understand that this declaration may be relied on by RCM Automotive Ltd, its credit hire and repair partners, insurers and, if necessary, the courts in support of a claim for the cost of a replacement vehicle. I understand that making a false or misleading statement may cause the claim to fail and may result in legal action against the company and/or me personally.
              </div>
              <Checkbox checked={formData.declaration.statement_of_truth_accepted} onChange={v => update('declaration.statement_of_truth_accepted', v)} label="I accept the above statement of truth." />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Full Name *</label><input value={formData.declaration.full_name} onChange={e => update('declaration.full_name', e.target.value)} className={inputCls} placeholder="Full name" /></div>
                <div><label className={labelCls}>Position *</label><input value={formData.declaration.position} onChange={e => update('declaration.position', e.target.value)} className={inputCls} placeholder="Position / job title" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-600 mb-0 flex items-center gap-2"><PenLine className="w-4 h-4" /> Sign below *</label>
                  <button onClick={clearSig} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
                  <canvas ref={canvasRef} width={560} height={150} className="w-full block cursor-crosshair"
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                </div>
                {!hasSig && <p className="text-xs text-gray-400 mt-1 text-center">Draw your signature with your finger or mouse</p>}
                {hasSig && <p className="text-xs text-green-600 mt-1 text-center flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Signature captured</p>}
              </div>
              <div><label className={labelCls}>Date</label><input value={formData.declaration.date} onChange={e => update('declaration.date', e.target.value)} className={inputCls} placeholder="DD/MM/YYYY" /></div>
            </div>
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button onClick={handleBack} disabled={step === 0} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="flex items-center gap-2 bg-[#151d44] hover:bg-[#1e2d5a] text-white">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
              {isSubmitting ? <><Loader className="w-5 h-5 animate-spin" /> Submitting...</> : <><FileCheck2 className="w-5 h-5" /> Sign & Submit</>}
            </Button>
          )}
        </div>

        {/* Data protection footer */}
        <div className="mt-6 p-4 bg-gray-100 rounded-xl">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>Data Protection:</strong> The information on this form will be processed by RCM Automotive Ltd for the purpose of managing and pursuing your claim, and may be shared with insurers, solicitors, credit hire providers and repairers involved in the claim.
          </p>
        </div>
      </div>
    </div>
  );
}