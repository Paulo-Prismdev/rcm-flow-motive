import { ClipboardCheck, MapPin, FileText, CheckCircle, Wrench, PoundSterling, CreditCard } from 'lucide-react';

export const STEPS = [
  { id: 'map', title: 'Find Repairer', icon: MapPin },
  { id: 'validate', title: 'Review Details', icon: ClipboardCheck },
  { id: 'instruction', title: 'Instruction & Email', icon: FileText },
  { id: 'confirm', title: 'Confirm Allocation', icon: CheckCircle },
];

export const REQUIRED_FIELDS = [
  { key: 'claim_type', label: 'Claim Type', type: 'select', options: ['Fault Claim', '3rd Party Insurer Direct', '3rd Party Paying Privately', 'Credit Repair', 'Glass Claim'] },
  { key: 'client_name', label: 'Client Name', type: 'text' },
  { key: 'client_email', label: 'Client Email', type: 'email' },
  { key: 'client_phone', label: 'Client Phone', type: 'text' },
];

export const BUILT_IN_PDF_TEMPLATES = [
  { id: 'standard', name: 'Standard Instructions', icon: FileText },
  { id: 'orkin', name: 'Orkin Instructions', icon: Wrench },
  { id: 'private', name: 'Paying Privately', icon: PoundSterling },
  { id: 'third_party', name: 'Third-Party Paying', icon: PoundSterling },
  { id: 'credit_repair', name: 'Credit Repair', icon: CreditCard },
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