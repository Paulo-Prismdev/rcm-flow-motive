import React, { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import ClientCombobox from "../shared/ClientCombobox";
import InsurerCombobox from "../shared/InsurerCombobox";
import ReferrerCombobox from "../shared/ReferrerCombobox";
import BodyshopCombobox from "../shared/BodyshopCombobox";

export default function SimpleClaimForm({ onSave, onCancel, isSaving }) {
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    reg: "",
    claim_type: "",
    client_name: "",
    client_id: "",
    client_phone: "",
    client_email: "",
    make_model: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_colour: "",
    vehicle_type: "Car",
    loss_date: "",
    loss_time: "",
    incident_location: "",
    circumstances: "",
    insurer: "",
    claim_ref: "",
    policy_number: "",
    policy_excess: "",
    tp_name: "",
    tp_phone: "",
    tp_email: "",
    tp_make_model: "",
    tp_reg: "",
    tp_insurer: "",
    tp_policy_number: "",
    bodyshop: "",
    bodyshop_id: "",
    referrer: "",
    referrer_id: "",
    job_status: "New",
    draft: false,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.reg || !formData.claim_type) {
      setError("Vehicle registration and claim type are required.");
      return;
    }

    setError(null);
    onSave(formData);
  };

  const SectionTitle = ({ children }) => (
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
      {children}
    </h3>
  );

  const InputField = ({ label, field, type = "text", placeholder, required = false }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  const TextArea = ({ label, field, placeholder, rows = 3 }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <textarea
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  const SelectField = ({ label, field, options, required = false }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-background p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">New Claim</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <SectionTitle>Basic Information</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Vehicle Registration" field="reg" required placeholder="e.g. AB12 CDE" />
            <SelectField
              label="Claim Type"
              field="claim_type"
              required
              options={["Credit Repair", "Fault Claim", "Non-Fault Claim", "Total Loss", "Glass Claim"]}
            />
            <InputField label="Loss Date" field="loss_date" type="date" />
            <InputField label="Loss Time" field="loss_time" type="time" />
            <div className="md:col-span-2">
              <TextArea label="Circumstances" field="circumstances" placeholder="Describe what happened..." />
            </div>
          </div>
        </div>

        {/* Client & Vehicle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <SectionTitle>Client & Vehicle Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name</label>
              <ClientCombobox
                value={formData.client_name}
                onChange={(client) => {
                  handleChange("client_name", client.name);
                  handleChange("client_id", client.id);
                  handleChange("client_phone", client.phone || "");
                  handleChange("client_email", client.email || "");
                }}
              />
            </div>
            <InputField label="Make & Model" field="make_model" placeholder="e.g. Ford Focus" />
            <InputField label="Vehicle Make" field="vehicle_make" placeholder="e.g. Ford" />
            <InputField label="Vehicle Model" field="vehicle_model" placeholder="e.g. Focus" />
            <InputField label="Vehicle Colour" field="vehicle_colour" />
            <SelectField
              label="Vehicle Type"
              field="vehicle_type"
              options={["Car", "Van", "Motorcycle", "HGV", "Other"]}
            />
          </div>
        </div>

        {/* Insurance Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <SectionTitle>Insurance Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insurer</label>
              <InsurerCombobox
                value={formData.insurer}
                onChange={(insurer) => handleChange("insurer", insurer.name)}
              />
            </div>
            <InputField label="Claim Reference" field="claim_ref" placeholder="Insurer claim ref" />
            <InputField label="Policy Number" field="policy_number" />
            <InputField label="Policy Excess (£)" field="policy_excess" type="number" />
          </div>
        </div>

        {/* Third Party */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <SectionTitle>Third Party Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="TP Name" field="tp_name" placeholder="Third party name" />
            <InputField label="TP Phone" field="tp_phone" />
            <InputField label="TP Email" field="tp_email" type="email" />
            <InputField label="TP Vehicle Reg" field="tp_reg" placeholder="e.g. CD34 EFG" />
            <InputField label="TP Make & Model" field="tp_make_model" />
            <InputField label="TP Insurer" field="tp_insurer" />
            <InputField label="TP Policy Number" field="tp_policy_number" />
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <SectionTitle>Additional Information</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referrer</label>
              <ReferrerCombobox
                value={formData.referrer}
                onChange={(referrer) => {
                  handleChange("referrer", referrer.name);
                  handleChange("referrer_id", referrer.id);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bodyshop</label>
              <BodyshopCombobox
                value={formData.bodyshop}
                onChange={(bodyshop) => {
                  handleChange("bodyshop", bodyshop.name);
                  handleChange("bodyshop_id", bodyshop.id);
                }}
              />
            </div>
            <div className="md:col-span-2">
              <InputField label="Incident Location" field="incident_location" placeholder="Where did it happen?" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <div
            onClick={onCancel}
            className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </div>
          <div
            onClick={handleSave}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium cursor-pointer hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Claim"}
          </div>
        </div>
      </div>
    </div>
  );
}