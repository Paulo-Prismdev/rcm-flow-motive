import { ClipboardCheck, MapPin, FileText, Mail, CheckCircle, Wrench, PoundSterling } from 'lucide-react';

export const STEPS = [
  { id: 'map', title: 'Find Repairer', icon: MapPin },
  { id: 'validate', title: 'Validate Details', icon: ClipboardCheck },
  { id: 'instruction', title: 'Generate Instruction', icon: FileText },
  { id: 'email', title: 'Compose Email', icon: Mail },
  { id: 'confirm', title: 'Confirm Allocation', icon: CheckCircle },
];

export const REQUIRED_FIELDS = [
  { key: 'claim_type', label: 'Claim Type', type: 'select', options: ['Fault Claim', '3rd Party Direct', 'Credit Repair', 'Glass Claim'] },
  { key: 'client_name', label: 'Client Name', type: 'text' },
  { key: 'client_email', label: 'Client Email', type: 'email' },
  { key: 'client_phone', label: 'Client Phone', type: 'text' },
];

export const BUILT_IN_PDF_TEMPLATES = [
  { id: 'standard', name: 'Standard Instructions', icon: FileText },
  { id: 'orkin', name: 'Orkin Instructions', icon: Wrench },
  { id: 'private', name: 'Paying Privately', icon: PoundSterling },
  { id: 'third_party', name: 'Third-Party Paying', icon: PoundSterling },
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