import { ClipboardCheck, MapPin, FileText, Mail, CheckCircle, Wrench } from 'lucide-react';

export const STEPS = [
  { id: 'validate', title: 'Validate Details', icon: ClipboardCheck },
  { id: 'map', title: 'Find Repairer', icon: MapPin },
  { id: 'instruction', title: 'Generate Instruction', icon: FileText },
  { id: 'email', title: 'Compose Email', icon: Mail },
  { id: 'confirm', title: 'Confirm Allocation', icon: CheckCircle },
];

export const REQUIRED_FIELDS = [
  { key: 'claim_type', label: 'Claim Type', type: 'select', options: ['Credit Repair', 'Fault Claim', 'Non-Fault Claim', 'Total Loss', 'Glass Claim'] },
  { key: 'client_name', label: 'Client Name', type: 'text' },
  { key: 'client_address_line_1', label: 'Client Address', type: 'text' },
  { key: 'driver_contact_name', label: 'Contact Name', type: 'text' },
  { key: 'client_email', label: 'Client Email', type: 'email' },
  { key: 'client_phone', label: 'Client Phone', type: 'text' },
  { key: 'client_vat_status', label: 'Client VAT Status', type: 'select', options: ['VAT Registered', 'Non-VAT', 'Unknown'] },
  { key: 'make_model', label: 'Vehicle Make/Model', type: 'text' },
  { key: 'reg', label: 'Vehicle Registration', type: 'text' },
  { key: 'vehicle_location', label: 'Vehicle Location', type: 'text' },
  { key: 'vehicle_damage', label: 'Vehicle Damage', type: 'textarea' },
  { key: 'recovery_required', label: 'Urgent Recovery Required', type: 'boolean' },
  { key: 'unroadworthy', label: 'Vehicle Unroadworthy', type: 'boolean' },
  { key: 'courtesy_car_required', label: 'Courtesy Car Required', type: 'boolean' },
  { key: 'claim_ref', label: 'Insurer Claim Number', type: 'text' },
  { key: 'policy_number', label: 'Policy Number', type: 'text' },
  { key: 'send_estimate_email', label: 'Email Estimate To', type: 'email' },
  { key: 'audatex_code', label: 'Audatex Code', type: 'text' },
  { key: 'policy_excess', label: 'Policy Excess (£)', type: 'number' },
  { key: 'referral_fee_repairer', label: 'Repairer Fee (%)', type: 'number' },
];

export const BUILT_IN_PDF_TEMPLATES = [
  { id: 'standard', name: 'Standard Instructions', icon: FileText },
  { id: 'orkin', name: 'Orkin Instructions', icon: Wrench },
];

export const replacePlaceholders = (text, itemData) => {
  if (!text || !itemData) return text;
  let result = text;
  Object.keys(itemData).forEach(key => {
    const value = itemData[key];
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  });
  return result;
};