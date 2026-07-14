import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getPublicFormToken } from '@/functions/getPublicFormToken';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, ArrowLeft, ArrowRight, Loader, PenLine, Trash2, Camera, Upload, X, Image } from 'lucide-react';

const STEPS = [
  { key: 'personal', title: 'Your Details' },
  { key: 'incident', title: 'Incident' },
  { key: 'vehicle', title: 'Your Vehicle' },
  { key: 'insurance', title: 'Insurance' },
  { key: 'third_party', title: 'Third Party' },
  { key: 'photos', title: 'Photos' },
  { key: 'signature', title: 'Sign & Submit' },
];

const VISIBLE_STEPS = (hasTP) =>
  STEPS.filter(s => s.key !== 'third_party' || hasTP);

const initialForm = {
  client_name: '',
  client_phone: '',
  client_email: '',
  client_address_line_1: '',
  client_address_line_2: '',
  client_town: '',
  client_county: '',
  client_postcode: '',
  claim_type: 'Credit Repair',
  loss_date: '',
  loss_time: '',
  incident_location: '',
  vehicle_use: '',
  circumstances: '',
  courtesy_car_required: false,
  has_third_party: false,
  reg: '',
  make_model: '',
  vehicle_colour: '',
  vehicle_type: 'Car',
  vehicle_damage: '',
  unroadworthy: false,
  recovery_required: false,
  insurer: '',
  claim_ref: '',
  policy_number: '',
  tp_name: '',
  tp_phone: '',
  tp_reg: '',
  tp_insurer: '',
  tp_vehicle_damage: '',
};

export default function ClientClaimForm() {
  const [formData, setFormData] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [error, setError] = useState('');
  const [formToken, setFormToken] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const lastPos = useRef(null);

  const visibleSteps = VISIBLE_STEPS(formData.has_third_party);
  const currentStepKey = visibleSteps[step]?.key;

  const field = (key, value) => setFormData(p => ({ ...p, [key]: value }));
  const check = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  const handlePhotoFiles = async (files) => {
    setUploadingPhotos(true);
    setError('');
    const uploaded = [];
    
    for (const file of Array.from(files)) {
      try {
        const preview = URL.createObjectURL(file);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ preview, url: file_url, name: file.name });
      } catch (err) {
        console.error('Photo upload failed:', err);
        setError(`Failed to upload ${file.name}. Please try again.`);
      }
    }
    
    if (uploaded.length > 0) {
      setPhotos(p => [...p, ...uploaded]);
    }
    setUploadingPhotos(false);
  };

  const removePhoto = (index) => setPhotos(p => p.filter((_, i) => i !== index));

  // Fetch form token on mount
  useEffect(() => {
    getPublicFormToken({}).then(res => setFormToken(res.data?.token || '')).catch(() => {});
  }, []);

  // Canvas signature
  useEffect(() => {
    if (currentStepKey !== 'signature') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [currentStepKey]);

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
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
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

  const endDraw = () => setIsDrawing(false);

  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const validateStep = () => {
    if (currentStepKey === 'personal') {
      if (!formData.client_name.trim()) return 'Please enter your full name.';
      if (!formData.client_phone.trim()) return 'Please enter a phone number.';
    }
    if (currentStepKey === 'incident') {
      if (!formData.loss_date) return 'Please enter the date of loss.';
      if (!formData.circumstances.trim()) return 'Please describe what happened.';
    }
    if (currentStepKey === 'vehicle') {
      if (!formData.reg.trim()) return 'Please enter your vehicle registration.';
    }
    if (currentStepKey === 'signature') {
      if (!hasSig) return 'Please sign the form before submitting.';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    if (step < visibleSteps.length - 1) setStep(s => s + 1);
  };

  const prev = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setIsSubmitting(true);

    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : '';

    const result = await base44.functions.invoke('submitClientClaimForm', {
      _form_secret: formToken,
      formData,
      signatureDataUrl,
      photoUrls: photos.map(p => p.url),
    });

    setIsSubmitting(false);
    if (result.data?.success) {
      setSubmittedData(result.data);
      setSubmitted(true);
    } else {
      setError(result.data?.error || 'Submission failed. Please try again.');
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm';
  const labelCls = 'block text-sm font-medium text-gray-600 mb-1.5';
  const checkboxRow = (id, label, key) => (
    <label key={id} className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={!!formData[key]} onChange={e => check(key, e.target.checked)}
        className="w-5 h-5 rounded accent-amber-500" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Form Submitted!</h2>
          <p className="text-gray-500 mb-4">Thank you. Your claim has been received and a Statement of Truth PDF has been generated and saved.</p>
          {submittedData?.job_number && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-700 font-medium">Your reference number</p>
              <p className="text-2xl font-bold text-amber-800">{submittedData.job_number}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">Our team will be in touch shortly. You can close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#151d44] px-4 py-4 flex items-center justify-center">
        <img
          src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg"
          alt="RCM Automotive"
          className="h-14 w-auto object-contain"
        />
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Claim Notification Form</h1>
          <p className="text-sm text-gray-500 mt-1">Please complete all sections as accurately as possible.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-8 gap-0">
          {visibleSteps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 hidden sm:block text-center max-w-[60px]">{s.title}</span>
              </div>
              {i < visibleSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-5">{visibleSteps[step]?.title}</h2>

          {/* Step: personal */}
          {currentStepKey === 'personal' && (
            <div className="space-y-4">
              <div><label className={labelCls}>Full Name *</label><Input value={formData.client_name} onChange={e => field('client_name', e.target.value)} className={inputCls} placeholder="Your full name" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Phone *</label><Input value={formData.client_phone} onChange={e => field('client_phone', e.target.value)} className={inputCls} placeholder="07700..." /></div>
                <div><label className={labelCls}>Email</label><Input type="email" value={formData.client_email} onChange={e => field('client_email', e.target.value)} className={inputCls} placeholder="you@example.com" /></div>
              </div>
              <div><label className={labelCls}>Address Line 1</label><Input value={formData.client_address_line_1} onChange={e => field('client_address_line_1', e.target.value)} className={inputCls} placeholder="House/flat & street" /></div>
              <div><label className={labelCls}>Address Line 2</label><Input value={formData.client_address_line_2} onChange={e => field('client_address_line_2', e.target.value)} className={inputCls} placeholder="Optional" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className={labelCls}>Town</label><Input value={formData.client_town} onChange={e => field('client_town', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>County</label><Input value={formData.client_county} onChange={e => field('client_county', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Postcode</label><Input value={formData.client_postcode} onChange={e => field('client_postcode', e.target.value)} className={inputCls} /></div>
              </div>
            </div>
          )}

          {/* Step: incident */}
          {currentStepKey === 'incident' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Type of Claim *</label>
                <select value={formData.claim_type} onChange={e => field('claim_type', e.target.value)} className={inputCls}>
                  <option value="Credit Repair">Credit Repair</option>
                  <option value="Fault Claim">Fault Claim</option>
                  <option value="Non-Fault Claim">Non-Fault Claim</option>
                  <option value="Total Loss">Total Loss</option>
                  <option value="Glass Claim">Glass Claim</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Date of Loss *</label><Input type="date" value={formData.loss_date} onChange={e => field('loss_date', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Time of Loss</label><Input type="time" value={formData.loss_time} onChange={e => field('loss_time', e.target.value)} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Where did it happen?</label><Input value={formData.incident_location} onChange={e => field('incident_location', e.target.value)} className={inputCls} placeholder="Town, road, or postcode" /></div>
              <div>
                <label className={labelCls}>Use of vehicle at the time</label>
                <select value={formData.vehicle_use} onChange={e => field('vehicle_use', e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  <option value="Business">Business</option>
                  <option value="Social">Social</option>
                  <option value="Commuting">Commuting</option>
                </select>
              </div>
              <div><label className={labelCls}>What happened? *</label><Textarea value={formData.circumstances} onChange={e => field('circumstances', e.target.value)} className={`${inputCls} h-28`} placeholder="Please describe the incident in your own words..." /></div>
              <div className="flex flex-col gap-2 pt-1">
                {checkboxRow('cc', 'I require a courtesy car', 'courtesy_car_required')}
                {checkboxRow('tp', 'A third party was involved', 'has_third_party')}
              </div>
            </div>
          )}

          {/* Step: vehicle */}
          {currentStepKey === 'vehicle' && (
            <div className="space-y-4">
              <div><label className={labelCls}>Vehicle Registration *</label><Input value={formData.reg} onChange={e => field('reg', e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. AB12 CDE" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Make & Model</label><Input value={formData.make_model} onChange={e => field('make_model', e.target.value)} className={inputCls} placeholder="e.g. Ford Focus" /></div>
                <div><label className={labelCls}>Colour</label><Input value={formData.vehicle_colour} onChange={e => field('vehicle_colour', e.target.value)} className={inputCls} placeholder="e.g. Blue" /></div>
              </div>
              <div>
                <label className={labelCls}>Vehicle Type</label>
                <select value={formData.vehicle_type} onChange={e => field('vehicle_type', e.target.value)} className={inputCls}>
                  <option value="Car">Car</option>
                  <option value="Van">Van</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="HGV">HGV</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div><label className={labelCls}>Damage Description</label><Textarea value={formData.vehicle_damage} onChange={e => field('vehicle_damage', e.target.value)} className={`${inputCls} h-24`} placeholder="Describe the damage to your vehicle..." /></div>
              <div className="flex flex-col gap-2 pt-1">
                {checkboxRow('ur', 'Vehicle is unroadworthy', 'unroadworthy')}
                {checkboxRow('rr', 'Recovery is required', 'recovery_required')}
              </div>
            </div>
          )}

          {/* Step: insurance */}
          {currentStepKey === 'insurance' && (
            <div className="space-y-4">
              <div><label className={labelCls}>Your Insurer</label><Input value={formData.insurer} onChange={e => field('insurer', e.target.value)} className={inputCls} placeholder="e.g. Admiral" /></div>
              <div><label className={labelCls}>Claim Reference</label><Input value={formData.claim_ref} onChange={e => field('claim_ref', e.target.value)} className={inputCls} placeholder="If known" /></div>
              <div><label className={labelCls}>Policy Number</label><Input value={formData.policy_number} onChange={e => field('policy_number', e.target.value)} className={inputCls} placeholder="If known" /></div>
            </div>
          )}

          {/* Step: third_party */}
          {currentStepKey === 'third_party' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">Please provide as much detail as possible about the other party.</p>
              <div><label className={labelCls}>Third Party Name</label><Input value={formData.tp_name} onChange={e => field('tp_name', e.target.value)} className={inputCls} placeholder="Full name" /></div>
              <div><label className={labelCls}>Third Party Phone</label><Input value={formData.tp_phone} onChange={e => field('tp_phone', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Third Party Vehicle Reg</label><Input value={formData.tp_reg} onChange={e => field('tp_reg', e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. XY21 ZAB" /></div>
              <div><label className={labelCls}>Third Party Insurer</label><Input value={formData.tp_insurer} onChange={e => field('tp_insurer', e.target.value)} className={inputCls} placeholder="If known" /></div>
              <div><label className={labelCls}>Damage to Third Party Vehicle</label><Textarea value={formData.tp_vehicle_damage} onChange={e => field('tp_vehicle_damage', e.target.value)} className={`${inputCls} h-20`} /></div>
            </div>
          )}

          {/* Step: photos */}
          {currentStepKey === 'photos' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Please add any photos of the damage or incident scene. You can take a photo now or upload from your device.</p>

              {/* Upload buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <Camera className="w-7 h-7" />
                  <span className="text-sm font-medium">Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Upload className="w-7 h-7" />
                  <span className="text-sm font-medium">Upload from Library</span>
                </button>
              </div>

              {/* Hidden inputs - use sr-only for better mobile compatibility */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                onChange={e => handlePhotoFiles(e.target.files)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={e => handlePhotoFiles(e.target.files)}
              />

              {/* Uploading indicator */}
              {uploadingPhotos && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Loader className="w-4 h-4 animate-spin" /> Uploading photos...
                </div>
              )}

              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                      <img src={photo.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length === 0 && !uploadingPhotos && (
                <div className="text-center py-6 text-gray-400">
                  <Image className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No photos added yet. This step is optional.</p>
                </div>
              )}

              {photos.length > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {photos.length} photo{photos.length > 1 ? 's' : ''} added
                </p>
              )}
            </div>
          )}

          {/* Step: signature */}
          {currentStepKey === 'signature' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Statement of Truth</p>
                <p>I believe that the facts stated in this form are true and accurate to the best of my knowledge and belief. I understand that proceedings for contempt of court may be brought against anyone who makes a false statement without honest belief in its truth.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + ' mb-0 flex items-center gap-2'}><PenLine className="w-4 h-4" /> Sign below *</label>
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

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p><strong>Submitting for:</strong> {formData.client_name}</p>
                <p><strong>Vehicle Reg:</strong> {formData.reg}</p>
                <p><strong>Date of Loss:</strong> {formData.loss_date || 'Not specified'}</p>
              </div>
            </div>
          )}

          {/* Error */}
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

          {step < visibleSteps.length - 1 ? (
            <Button onClick={next} className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              {isSubmitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4" /> Submit & Sign</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}