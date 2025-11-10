import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import PartManufacturerConfigForm from "../components/partManufacturerConfig/PartManufacturerConfigForm";

export default function PartManufacturerConfigManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['partManufacturerConfigs'],
    queryFn: () => base44.entities.PartManufacturerConfig.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PartManufacturerConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partManufacturerConfigs'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PartManufacturerConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partManufacturerConfigs'] });
      setShowForm(false);
      setEditingConfig(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PartManufacturerConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partManufacturerConfigs'] });
    },
  });

  const handleEdit = (config) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleDelete = (config) => {
    if (window.confirm(`Are you sure you want to delete the configuration for "${config.name}"?`)) {
      deleteMutation.mutate(config.id);
    }
  };

  const handleSubmit = (data) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  if (showForm) {
    return (
      <PartManufacturerConfigForm
        config={editingConfig}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="neomorph p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-3">
              <Factory className="w-7 h-7 text-gold" />
              Parts Manufacturer Supplier Links
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure which suppliers receive automated quote requests for each vehicle manufacturer
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="neomorph-flat px-6 py-3 font-medium text-gray-700 transition-all active:neomorph-pressed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Configuration
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="neomorph p-8 text-center text-gray-500">Loading configurations...</div>
        ) : configs.length === 0 ? (
          <div className="neomorph p-8 text-center text-gray-500">
            No manufacturer configurations yet. Create your first configuration to automate parts sourcing.
          </div>
        ) : (
          configs.map((config) => (
            <div key={config.id} className="neomorph card-hover p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="neomorph-flat p-3">
                      <Factory className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-700">{config.name}</h3>
                      <p className="text-sm text-gray-500">
                        {config.associated_supplier_names?.length || 0} linked supplier(s)
                      </p>
                    </div>
                  </div>
                  {config.associated_supplier_names && config.associated_supplier_names.length > 0 && (
                    <div className="mt-4 neomorph-inset p-4">
                      <p className="text-sm text-gray-500 mb-2"><strong>Linked Suppliers:</strong></p>
                      <div className="flex flex-wrap gap-2">
                        {config.associated_supplier_names.map((supplierName, index) => (
                          <span key={index} className="neomorph-flat px-3 py-1 text-xs font-medium text-gray-700">
                            {supplierName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => handleEdit(config)}
                    className="neomorph-flat p-3 transition-all active:neomorph-pressed"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(config)}
                    className="neomorph-flat p-3 transition-all active:neomorph-pressed"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}