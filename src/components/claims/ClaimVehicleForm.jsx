import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AddressLookupInput from '../shared/AddressLookupInput';

export default function ClaimVehicleForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        make_model: claim.make_model || '',
        vehicle_make: claim.vehicle_make || '',
        vehicle_model: claim.vehicle_model || '',
        vehicle_colour: claim.vehicle_colour || '',
        vehicle_fuel_type: claim.vehicle_fuel_type || '',
        vehicle_year_of_manufacture: claim.vehicle_year_of_manufacture || null,
        vehicle_engine_capacity: claim.vehicle_engine_capacity || null,
        vehicle_co2_emissions: claim.vehicle_co2_emissions || null,
        vehicle_euro_status: claim.vehicle_euro_status || '',
        vehicle_mot_status: claim.vehicle_mot_status || '',
        vehicle_mot_expiry_date: claim.vehicle_mot_expiry_date || '',
        vehicle_tax_status: claim.vehicle_tax_status || '',
        vehicle_tax_due_date: claim.vehicle_tax_due_date || '',
        vehicle_date_of_last_v5c_issued: claim.vehicle_date_of_last_v5c_issued || '',
        vehicle_wheelplan: claim.vehicle_wheelplan || '',
        vehicle_revenue_weight: claim.vehicle_revenue_weight || null,
        vehicle_type: claim.vehicle_type || 'Car',
        vehicle_location: claim.vehicle_location || '',
        vehicle_damage: claim.vehicle_damage || '',
        unroadworthy: claim.unroadworthy || false,
        recovery_required: claim.recovery_required || false,
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleVehicleLocationChange = (addressData) => {
        setFormData(prev => ({
            ...prev,
            vehicle_location: addressData.display_name || addressData.address || ''
        }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <div className="space-y-6 pt-4">
            {/* Basic Vehicle Info */}
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Basic Vehicle Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm text-gray-500">Make (DVLA)</label>
                        <Input 
                            value={formData.vehicle_make} 
                            onChange={e => handleChange('vehicle_make', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. Ford"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Model (DVLA)</label>
                        <Input 
                            value={formData.vehicle_model} 
                            onChange={e => handleChange('vehicle_model', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. Fiesta"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Colour</label>
                        <Input 
                            value={formData.vehicle_colour} 
                            onChange={e => handleChange('vehicle_colour', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. Red"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Fuel Type</label>
                        <Input 
                            value={formData.vehicle_fuel_type} 
                            onChange={e => handleChange('vehicle_fuel_type', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. Petrol"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Year of Manufacture</label>
                        <Input 
                            type="number"
                            value={formData.vehicle_year_of_manufacture || ''} 
                            onChange={e => handleChange('vehicle_year_of_manufacture', e.target.value ? parseInt(e.target.value) : null)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. 2020"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Vehicle Type</label>
                        <select value={formData.vehicle_type} onChange={e => handleChange('vehicle_type', e.target.value)} className="neomorph-inset w-full px-4 py-3 text-gray-700 border-0 rounded-xl">
                            <option>Car</option>
                            <option>Van</option>
                            <option>Motorcycle</option>
                            <option>HGV</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Technical Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm text-gray-500">Engine Capacity (CC)</label>
                        <Input 
                            type="number"
                            value={formData.vehicle_engine_capacity || ''} 
                            onChange={e => handleChange('vehicle_engine_capacity', e.target.value ? parseInt(e.target.value) : null)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. 1600"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">CO2 Emissions (g/km)</label>
                        <Input 
                            type="number"
                            value={formData.vehicle_co2_emissions || ''} 
                            onChange={e => handleChange('vehicle_co2_emissions', e.target.value ? parseInt(e.target.value) : null)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. 120"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Euro Status</label>
                        <Input 
                            value={formData.vehicle_euro_status} 
                            onChange={e => handleChange('vehicle_euro_status', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. EURO 6"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Wheelplan</label>
                        <Input 
                            value={formData.vehicle_wheelplan} 
                            onChange={e => handleChange('vehicle_wheelplan', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. 2-AXLE-RIGID BODY"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Revenue Weight (kg)</label>
                        <Input 
                            type="number"
                            value={formData.vehicle_revenue_weight || ''} 
                            onChange={e => handleChange('vehicle_revenue_weight', e.target.value ? parseInt(e.target.value) : null)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. 1500"
                        />
                    </div>
                </div>
            </div>

            {/* Status & Dates */}
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">MOT & Tax Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm text-gray-500">MOT Status</label>
                        <Input 
                            value={formData.vehicle_mot_status} 
                            onChange={e => handleChange('vehicle_mot_status', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. VALID"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">MOT Expiry Date</label>
                        <Input 
                            type="date"
                            value={formData.vehicle_mot_expiry_date} 
                            onChange={e => handleChange('vehicle_mot_expiry_date', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Tax Status</label>
                        <Input 
                            value={formData.vehicle_tax_status} 
                            onChange={e => handleChange('vehicle_tax_status', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                            placeholder="e.g. TAXED"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Tax Due Date</label>
                        <Input 
                            type="date"
                            value={formData.vehicle_tax_due_date} 
                            onChange={e => handleChange('vehicle_tax_due_date', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Last V5C Issued</label>
                        <Input 
                            type="date"
                            value={formData.vehicle_date_of_last_v5c_issued} 
                            onChange={e => handleChange('vehicle_date_of_last_v5c_issued', e.target.value)} 
                            className="neomorph-inset px-4 py-3 text-gray-700 border-0"
                        />
                    </div>
                </div>
            </div>

            {/* Location & Damage */}
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Location & Damage</h4>
                <div className="md:col-span-2">
                    <label className="text-sm text-gray-500">Vehicle Location</label>
                    <AddressLookupInput
                        value={formData.vehicle_location}
                        onChange={handleVehicleLocationChange}
                        placeholder="Start typing address..."
                        className="neomorph-inset"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="text-sm text-gray-500">Vehicle Damage</label>
                    <Textarea value={formData.vehicle_damage} onChange={e => handleChange('vehicle_damage', e.target.value)} className="neomorph-inset px-4 py-3 text-gray-700 border-0 h-20" />
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="unroadworthy" checked={formData.unroadworthy} onChange={e => handleChange('unroadworthy', e.target.checked)} />
                        <label htmlFor="unroadworthy" className="text-sm text-gray-600">Unroadworthy</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="recovery_required" checked={formData.recovery_required} onChange={e => handleChange('recovery_required', e.target.checked)} />
                        <label htmlFor="recovery_required" className="text-sm text-gray-600">Recovery Required</label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} className="neomorph-flat">Cancel</Button>
                <Button onClick={handleSave} className="neomorph-flat text-blue-600">Save Changes</Button>
            </div>
        </div>
    );
}