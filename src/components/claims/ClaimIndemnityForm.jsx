import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';

// Custom DOB Calendar with year/month dropdowns
function DOBCalendar({ selected, onSelect }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [viewDate, setViewDate] = useState(selected || new Date(currentYear - 30, 0, 1));

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const handleDayClick = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onSelect(newDate);
  };

  const isSelected = (day) => {
    if (!selected) return false;
    return selected.getDate() === day && 
           selected.getMonth() === viewDate.getMonth() && 
           selected.getFullYear() === viewDate.getFullYear();
  };

  return (
    <div className="p-3 w-72">
      <div className="flex gap-2 mb-3">
        <select
          value={viewDate.getMonth()}
          onChange={(e) => setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value), 1))}
          className="flex-1 px-2 py-1.5 text-sm border rounded-md bg-background"
        >
          {months.map((month, i) => (
            <option key={month} value={i}>{month}</option>
          ))}
        </select>
        <select
          value={viewDate.getFullYear()}
          onChange={(e) => setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth(), 1))}
          className="w-24 px-2 py-1.5 text-sm border rounded-md bg-background"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-foreground-muted mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map(i => (
          <div key={`blank-${i}`} />
        ))}
        {days.map(day => (
          <button
            key={day}
            type="button"
            onClick={() => handleDayClick(day)}
            className={`p-2 text-sm rounded-md hover:bg-accent/20 transition-colors ${
              isSelected(day) ? 'bg-accent text-accent-foreground font-bold' : ''
            }`}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ClaimIndemnityForm({ claim, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    requires_indemnity: claim.requires_indemnity || false,
    indemnity_driver_dob: claim.indemnity_driver_dob || '',
    indemnity_registered_owner: claim.indemnity_registered_owner || '',
    indemnity_pending_prosecutions: claim.indemnity_pending_prosecutions || '',
    indemnity_dvla_medical_restrictions: claim.indemnity_dvla_medical_restrictions || '',
    indemnity_full_license_12_months: claim.indemnity_full_license_12_months || '',
    indemnity_convictions_last_5_years: claim.indemnity_convictions_last_5_years || '',
    indemnity_vehicle_use_at_incident: claim.indemnity_vehicle_use_at_incident || '',
    indemnity_vehicle_modifications: claim.indemnity_vehicle_modifications || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 p-3 neomorph-inset rounded-lg">
        <input
          type="checkbox"
          id="requires_indemnity"
          checked={formData.requires_indemnity}
          onChange={(e) => setFormData({ ...formData, requires_indemnity: e.target.checked })}
          className="w-5 h-5"
        />
        <label htmlFor="requires_indemnity" className="text-sm font-medium">
          This claim requires indemnity details
        </label>
      </div>

      {formData.requires_indemnity && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Driver's Date of Birth</label>
            <Popover>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={formData.indemnity_driver_dob ? (() => {
                    try {
                      const d = new Date(formData.indemnity_driver_dob);
                      return isValid(d) ? format(d, 'dd/MM/yyyy') : formData.indemnity_driver_dob;
                    } catch {
                      return formData.indemnity_driver_dob;
                    }
                  })() : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parsed = parse(val, 'dd/MM/yyyy', new Date());
                    if (isValid(parsed)) {
                      setFormData({ ...formData, indemnity_driver_dob: format(parsed, 'yyyy-MM-dd') });
                    } else {
                      setFormData({ ...formData, indemnity_driver_dob: val });
                    }
                  }}
                  className="neomorph-inset pr-10"
                />
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
              </div>
              <PopoverContent className="w-auto p-0" align="start">
                <DOBCalendar
                  selected={formData.indemnity_driver_dob ? new Date(formData.indemnity_driver_dob) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setFormData({ ...formData, indemnity_driver_dob: format(date, 'yyyy-MM-dd') });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

      <div>
        <label className="block text-sm font-medium mb-2">Who is the registered owner and keeper of the vehicle?</label>
        <Input
          value={formData.indemnity_registered_owner}
          onChange={(e) => setFormData({ ...formData, indemnity_registered_owner: e.target.value })}
          placeholder="Enter registered owner and keeper details..."
          className="neomorph-inset"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Does the driver have any pending prosecutions?</label>
        <Textarea
          value={formData.indemnity_pending_prosecutions}
          onChange={(e) => setFormData({ ...formData, indemnity_pending_prosecutions: e.target.value })}
          placeholder="Enter details of any pending prosecutions (or 'No' if none)..."
          className="neomorph-inset"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Has the driver been told not to drive by DVLA or any medical source?</label>
        <Textarea
          value={formData.indemnity_dvla_medical_restrictions}
          onChange={(e) => setFormData({ ...formData, indemnity_dvla_medical_restrictions: e.target.value })}
          placeholder="Enter details (or 'No' if none)..."
          className="neomorph-inset"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Has the driver held a full UK/EU license for at least 12 months and driven regularly in the UK at that time?</label>
        <Textarea
          value={formData.indemnity_full_license_12_months}
          onChange={(e) => setFormData({ ...formData, indemnity_full_license_12_months: e.target.value })}
          placeholder="Enter details..."
          className="neomorph-inset"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Has the driver had any motoring convictions or fixed penalty points within the last 5 years?</label>
        <Textarea
          value={formData.indemnity_convictions_last_5_years}
          onChange={(e) => setFormData({ ...formData, indemnity_convictions_last_5_years: e.target.value })}
          placeholder="Enter details of convictions/points (or 'No' if none)..."
          className="neomorph-inset"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">What was the vehicle being used for at the time of the incident?</label>
        <select
          value={formData.indemnity_vehicle_use_at_incident}
          onChange={(e) => setFormData({ ...formData, indemnity_vehicle_use_at_incident: e.target.value })}
          className="neomorph-inset w-full px-3 py-2 rounded-lg border-0 text-sm"
        >
          <option value="">Select...</option>
          <option value="Business">Business</option>
          <option value="Social">Social</option>
          <option value="Commuting">Commuting</option>
        </select>
      </div>

          <div>
            <label className="block text-sm font-medium mb-2">Are there any modifications to the policyholder's vehicle?</label>
            <Textarea
              value={formData.indemnity_vehicle_modifications}
              onChange={(e) => setFormData({ ...formData, indemnity_vehicle_modifications: e.target.value })}
              placeholder="Enter details of modifications (or 'No' if none)..."
              className="neomorph-inset"
              rows={2}
            />
          </div>
        </>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat flex-1">
          Cancel
        </Button>
        <Button type="submit" className="neomorph-flat bg-accent/10 text-accent flex-1">
          Save Changes
        </Button>
      </div>
    </form>
  );
}