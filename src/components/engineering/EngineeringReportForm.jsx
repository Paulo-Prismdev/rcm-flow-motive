import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function EngineeringReportForm({ job, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    findings: job.findings || '',
    recommendations: job.recommendations || '',
    date_requested: job.date_requested || '',
    inspection_date: job.inspection_date || '',
    fee: job.fee || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-2">Findings</label>
        <Textarea
          value={formData.findings}
          onChange={(e) => setFormData({...formData, findings: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-32"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Recommendations</label>
        <Textarea
          value={formData.recommendations}
          onChange={(e) => setFormData({...formData, recommendations: e.target.value})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-32"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Date Requested</label>
          <Input
            type="date"
            value={formData.date_requested}
            onChange={(e) => setFormData({...formData, date_requested: e.target.value})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Inspection Date</label>
          <Input
            type="date"
            value={formData.inspection_date}
            onChange={(e) => setFormData({...formData, inspection_date: e.target.value})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-2">Fee</label>
        <Input
          type="number"
          step="0.01"
          value={formData.fee}
          onChange={(e) => setFormData({...formData, fee: parseFloat(e.target.value) || 0})}
          className="neomorph-inset px-4 py-3 text-gray-700 border-0"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-2">Cancel</Button>
        <Button type="submit" className="neomorph-flat px-6 py-2 text-blue-600">Save</Button>
      </div>
    </form>
  );
}