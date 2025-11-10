import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, Plus } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ManufacturerCombobox from '../shared/ManufacturerCombobox';

export default function PartManufacturerConfigForm({ config, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: config?.name || '',
    associated_supplier_names: config?.associated_supplier_names || []
  });
  
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleAddSupplier = () => {
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (supplier && !formData.associated_supplier_names.includes(supplier.name)) {
      setFormData({
        ...formData,
        associated_supplier_names: [...formData.associated_supplier_names, supplier.name]
      });
    }
    setShowSupplierPicker(false);
    setSelectedSupplierId('');
  };

  const handleRemoveSupplier = (supplierName) => {
    setFormData({
      ...formData,
      associated_supplier_names: formData.associated_supplier_names.filter(name => name !== supplierName)
    });
  };

  return (
    <div className="space-y-6">
      <div className="neomorph p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onCancel} className="neomorph-flat p-3 transition-all active:neomorph-pressed">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-700">
              {config ? 'Edit Manufacturer Configuration' : 'New Manufacturer Configuration'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Link suppliers to a vehicle manufacturer for automated parts quote requests
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="neomorph-flat p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Vehicle Manufacturer *</label>
              <ManufacturerCombobox
                value={formData.name}
                onChange={(name) => setFormData({ ...formData, name })}
                placeholder="Select a vehicle manufacturer..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Linked Suppliers</label>
              <p className="text-xs text-gray-500 mb-2">
                Select which suppliers should receive automated quote requests for parts from this manufacturer
              </p>
              
              {/* Show supplier picker when adding */}
              {showSupplierPicker ? (
                <div className="neomorph-inset p-4 space-y-3">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl"
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers
                      .filter(s => !formData.associated_supplier_names.includes(s.name))
                      .map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleAddSupplier}
                      disabled={!selectedSupplierId}
                      className="neomorph-flat px-4 py-2 text-sm text-blue-600"
                    >
                      Add Selected
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowSupplierPicker(false);
                        setSelectedSupplierId('');
                      }}
                      className="neomorph-flat px-4 py-2 text-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Display selected suppliers */}
                  <div className="neomorph-inset p-4 min-h-[60px]">
                    {formData.associated_supplier_names.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.associated_supplier_names.map(name => (
                          <span key={name} className="flex items-center px-3 py-2 rounded-lg text-sm neomorph-flat">
                            {name}
                            <button
                              type="button"
                              onClick={() => handleRemoveSupplier(name)}
                              className="ml-2 text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No suppliers linked yet</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowSupplierPicker(true)}
                    className="neomorph-flat px-4 py-2 text-sm text-blue-600 flex items-center gap-2 mt-3"
                  >
                    <Plus className="w-4 h-4" />
                    Add Supplier
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={onCancel}
              className="neomorph-flat px-6 py-3 font-medium text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="neomorph-flat px-6 py-3 font-medium text-blue-600"
            >
              {config ? 'Update Configuration' : 'Create Configuration'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}