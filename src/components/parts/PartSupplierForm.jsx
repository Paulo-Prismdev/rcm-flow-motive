import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SupplierCombobox from '../shared/SupplierCombobox';
import AddSupplierModal from '../shared/AddSupplierModal';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function PartSupplierForm({ part, onSave, onCancel }) {
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    supplier: part.supplier || '',
    part_type: part.part_type || 'OEM',
    condition: part.condition || 'New',
    rrp: part.rrp || 0,
    net_price: part.net_price || 0,
    sourcing_fee: part.sourcing_fee || 0,
  });

  const handleSupplierChange = (supplier) => {
    setFormData({...formData, supplier: supplier ? supplier.name : ''});
  };

  const handleSupplierModalSuccess = (newSupplier) => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    handleSupplierChange(newSupplier);
    setShowSupplierModal(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <AddSupplierModal 
        isOpen={showSupplierModal} 
        onClose={() => setShowSupplierModal(false)} 
        onSuccess={handleSupplierModalSuccess} 
      />
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Supplier</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <SupplierCombobox 
                value={formData.supplier} 
                onChange={handleSupplierChange} 
              />
            </div>
            <Button 
              type="button"
              onClick={() => setShowSupplierModal(true)}
              className="neomorph-flat p-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Part Type</label>
          <select
            value={formData.part_type}
            onChange={(e) => setFormData({...formData, part_type: e.target.value})}
            className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
          >
            <option>OEM</option>
            <option>Aftermarket</option>
            <option>Recycled</option>
            <option>Refurbished</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Condition</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({...formData, condition: e.target.value})}
            className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
          >
            <option>New</option>
            <option>Used</option>
            <option>Refurbished</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">RRP</label>
            <Input
              type="number"
              step="0.01"
              value={formData.rrp}
              onChange={(e) => setFormData({...formData, rrp: parseFloat(e.target.value) || 0})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Net Price</label>
            <Input
              type="number"
              step="0.01"
              value={formData.net_price}
              onChange={(e) => setFormData({...formData, net_price: parseFloat(e.target.value) || 0})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Sourcing Fee</label>
            <Input
              type="number"
              step="0.01"
              value={formData.sourcing_fee}
              onChange={(e) => setFormData({...formData, sourcing_fee: parseFloat(e.target.value) || 0})}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-2">Cancel</Button>
          <Button type="submit" className="neomorph-flat px-6 py-2 text-blue-600">Save</Button>
        </div>
      </form>
    </>
  );
}