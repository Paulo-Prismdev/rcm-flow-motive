import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WorkProviderCombobox from '../shared/WorkProviderCombobox';
import AddWorkProviderModal from '../shared/AddWorkProviderModal';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function PartOrderForm({ part, onSave, onCancel }) {
  const [showWorkProviderModal, setShowWorkProviderModal] = useState(false);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    date_ordered: part.date_ordered || '',
    delivery_time_weeks: part.delivery_time_weeks || 0,
    work_provider: part.work_provider || '',
    courtesy_vehicle_type: part.courtesy_vehicle_type || 'None',
  });

  const handleWorkProviderChange = (workProvider) => {
    setFormData({...formData, work_provider: workProvider ? workProvider.name : ''});
  };

  const handleWorkProviderModalSuccess = (newWorkProvider) => {
    queryClient.invalidateQueries({ queryKey: ['workProviders'] });
    handleWorkProviderChange(newWorkProvider);
    setShowWorkProviderModal(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <AddWorkProviderModal 
        isOpen={showWorkProviderModal} 
        onClose={() => setShowWorkProviderModal(false)} 
        onSuccess={handleWorkProviderModalSuccess} 
      />
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Date of Initial Order</label>
          <Input
            type="date"
            value={formData.date_ordered}
            onChange={(e) => setFormData({...formData, date_ordered: e.target.value})}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Expected Delivery Time</label>
          <select
            value={formData.delivery_time_weeks}
            onChange={(e) => setFormData({...formData, delivery_time_weeks: parseInt(e.target.value)})}
            className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
          >
            <option value={0}>No Date</option>
            <option value={1}>1 Week</option>
            <option value={2}>2 Weeks</option>
            <option value={3}>3 Weeks</option>
            <option value={4}>4 Weeks</option>
            <option value={6}>6 Weeks</option>
            <option value={8}>8 Weeks</option>
            <option value={12}>12 Weeks</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Work Provider</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <WorkProviderCombobox
                value={formData.work_provider}
                onChange={handleWorkProviderChange}
              />
            </div>
            <Button 
              type="button"
              onClick={() => setShowWorkProviderModal(true)}
              className="neomorph-flat p-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Courtesy Vehicle</label>
          <select
            value={formData.courtesy_vehicle_type}
            onChange={(e) => setFormData({...formData, courtesy_vehicle_type: e.target.value})}
            className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
          >
            <option value="None">None</option>
            <option value="Credit Hire">Credit Hire</option>
            <option value="Repairers Courtesy Vehicle">Repairers Courtesy Vehicle</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-2">Cancel</Button>
          <Button type="submit" className="neomorph-flat px-6 py-2 text-blue-600">Save</Button>
        </div>
      </form>
    </>
  );
}