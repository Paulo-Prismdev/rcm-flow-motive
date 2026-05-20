import React, { useState, useEffect } from 'react';
import { submitPublicPartsRequest } from '@/functions/submitPublicPartsRequest';
import { getPublicFormToken } from '@/functions/getPublicFormToken';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle2 } from 'lucide-react';

const companyLogo = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

export default function PublicPartsRequest() {
  const [formToken, setFormToken] = useState('');

  useEffect(() => {
    getPublicFormToken({}).then(res => setFormToken(res.data?.token || '')).catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    contact_name: '',
    contact_number: '',
    contact_email: '',
    bodyshop_company: '',
    vehicle_ref: '',
    manufacturer: '',
    part_description: '',
    part_number: '',
    part_type: '',
    delivery_address: '',
    additional_comments: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await submitPublicPartsRequest({ ...formData, _form_secret: formToken });
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-8 px-4" style={{ background: '#151d44' }}>
      {/* Header */}
      <div className="mb-8 flex flex-col items-center">
        <img src={companyLogo} alt="RCM Automotive" className="h-20 w-auto object-contain mb-4" />
        <h1 className="text-2xl font-bold text-white">Parts Request</h1>
        <p className="text-white/60 text-sm mt-1">Fill in the form below and our team will get back to you</p>
      </div>

      <div className="w-full max-w-2xl bg-white/10 backdrop-blur rounded-2xl border border-white/15 shadow-xl p-6 md:p-8">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-400" />
            <h2 className="text-2xl font-bold text-white">Request Submitted!</h2>
            <p className="text-white/70 max-w-sm">
              Thank you. Your parts request has been received and our team will be in touch shortly.
            </p>
            <Button
              onClick={() => { setSubmitted(false); setFormData({ contact_name:'', contact_number:'', contact_email:'', bodyshop_company:'', vehicle_ref:'', manufacturer:'', part_description:'', part_number:'', part_type:'', delivery_address:'', additional_comments:'' }); }}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white border border-white/20"
            >
              Submit Another Request
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Contact Details */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-bold">1</span>
                Your Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Your Name *</label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => handleChange('contact_name', e.target.value)}
                    placeholder="Full name"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Phone Number *</label>
                  <Input
                    value={formData.contact_number}
                    onChange={(e) => handleChange('contact_number', e.target.value)}
                    placeholder="e.g. 07700 900000"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Email Address</label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    placeholder="your@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Company / Bodyshop Name</label>
                  <Input
                    value={formData.bodyshop_company}
                    onChange={(e) => handleChange('bodyshop_company', e.target.value)}
                    placeholder="Your company name (if applicable)"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-bold">2</span>
                Vehicle Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Vehicle Registration *</label>
                  <Input
                    value={formData.vehicle_ref}
                    onChange={(e) => handleChange('vehicle_ref', e.target.value.toUpperCase())}
                    placeholder="e.g. AB12 CDE"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Manufacturer *</label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                    placeholder="e.g. Ford, BMW, Toyota"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </div>
            </div>

            {/* Part Details */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-bold">3</span>
                Part Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1">Part Description *</label>
                  <Input
                    value={formData.part_description}
                    onChange={(e) => handleChange('part_description', e.target.value)}
                    placeholder="e.g. Front Bumper, Headlight LH, Bonnet"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Part Number (if known)</label>
                  <Input
                    value={formData.part_number}
                    onChange={(e) => handleChange('part_number', e.target.value)}
                    placeholder="OEM part number"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Part Type Preference</label>
                  <select
                    value={formData.part_type}
                    onChange={(e) => handleChange('part_type', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  >
                    <option value="" className="bg-slate-800">Any</option>
                    <option value="OEM" className="bg-slate-800">OEM (Original)</option>
                    <option value="Aftermarket" className="bg-slate-800">Aftermarket</option>
                    <option value="Recycled" className="bg-slate-800">Recycled / Green Parts</option>
                    <option value="Refurbished" className="bg-slate-800">Refurbished</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1">Delivery Address</label>
                  <Input
                    value={formData.delivery_address}
                    onChange={(e) => handleChange('delivery_address', e.target.value)}
                    placeholder="Where should parts be delivered?"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1">Additional Notes</label>
                  <Textarea
                    value={formData.additional_comments}
                    onChange={(e) => handleChange('additional_comments', e.target.value)}
                    placeholder="Any additional information (urgency, colour codes, etc.)..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[90px]"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || !formData.vehicle_ref || !formData.manufacturer || !formData.part_description || !formData.contact_name || !formData.contact_number}
              className="w-full h-12 bg-[#D4AF37] hover:bg-[#C19B2B] text-black font-semibold text-base"
            >
              {submitting ? 'Submitting...' : 'Submit Parts Request'}
            </Button>
          </form>
        )}
      </div>

      <p className="text-white/30 text-xs mt-6">© RCM Automotive. All rights reserved.</p>
    </div>
  );
}