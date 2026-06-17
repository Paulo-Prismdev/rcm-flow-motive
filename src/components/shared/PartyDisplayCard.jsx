import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, User, Users, Building2 } from "lucide-react";
import CustomSelect from './CustomSelect';

function Dot({ filled }) {
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${filled ? 'bg-gold' : 'bg-muted-foreground/20'}`} />;
}

function DetailCell({ label, value, isEmpty, isCurrency, meta }) {
  let display = value;
  if (isCurrency && typeof value === 'number') display = `£${value.toFixed(2)}`;
  if (isEmpty) display = '-';

  return (
    <div className={`py-2 px-3 rounded-[8px] transition-colors ${isEmpty ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700' : 'hover:bg-muted/50'}`}>
      <div className="text-[11px] font-medium text-muted-foreground mb-0.5 flex items-center gap-1.5">
        {label}
        {isEmpty && <Dot filled />}
      </div>
      <div className={`text-sm font-medium ${isEmpty ? 'text-amber-500' : 'text-foreground'} ${isCurrency ? 'tabular-nums' : ''}`}>
        {display}
      </div>
      {meta && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{meta}</div>}
    </div>
  );
}

function AddressBlock({ addressLine1, addressLine2, town, county, postcode, isEmpty }) {
  const hasAddress = addressLine1 || town || postcode;
  return (
    <div className={`mt-2 py-3 px-4 rounded-lg ${isEmpty ? 'border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' : 'bg-muted/40'}`}>
      <div className="text-xs font-semibold text-muted-foreground mb-2">Address</div>
      <div className="text-sm leading-relaxed space-y-0.5">
        {addressLine1 && <div>{addressLine1}</div>}
        {addressLine2 && <div>{addressLine2}</div>}
        {(town || county || postcode) && (
          <div>{[town, county, postcode].filter(Boolean).join(', ')}</div>
        )}
        {!hasAddress && <span className="text-amber-500">-</span>}
      </div>
    </div>
  );
}

// Icon mapping based on party type
const partyIcons = {
  client: Building2,
  driver: User,
  thirdParty: Users,
};

const partyColors = {
  client: 'bg-primary',
  driver: 'bg-emerald-500',
  thirdParty: 'bg-orange-500',
};

/**
 * PartyDisplayCard — standardized display for Client, Driver, and Third Party.
 *
 * display mode (editing=false):
 *   renders a header + grid of DetailCells + address block — identical layout for all parties.
 *
 * edit mode (editing=true):
 *   renders editable form fields inside the same card container.
 *
 * Props:
 *   title       — card heading (e.g. "Billing Party — Client")
 *   partyType   — 'client' | 'driver' | 'thirdParty'
 *   data        — { name, phone, email, address_line_1, address_line_2, town, county, postcode, ...extras }
 *   fields      — array of field configs: [{ key, label, type?, options? }]
 *   extras      — array of extra DetailCell configs: [{ label, value, isEmpty, meta? }]
 *   editing     — boolean
 *   onFieldChange — (key, value) => void
 *   onSave      — () => void
 *   onCancel    — () => void
 *   onStartEdit — () => void
 *   canEdit     — boolean
 *   headerRight — optional ReactNode rendered in the header (e.g. "same as client" toggle)
 */
export default function PartyDisplayCard({
  title,
  partyType = 'client',
  data = {},
  fields = [],
  extras = [],
  editing = false,
  onFieldChange,
  onSave,
  onCancel,
  onStartEdit,
  canEdit = true,
  headerRight,
  bare = false,
  children,
}) {
  const Icon = partyIcons[partyType] || User;
  const dotColor = partyColors[partyType] || 'bg-primary';
  const fieldValue = (key) => data[key] ?? '';
  const cardClass = bare ? '' : 'bg-card border border-border rounded-[10px] p-4 md:p-5 shadow-sm';

  if (editing && children) {
    return (
      <div className={cardClass}>
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          </div>
        </div>
        {children}
      </div>
    );
  }

  if (editing) {
    return (
      <div className={cardClass}>
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={f.fullWidth ? 'md:col-span-2' : ''}>
                <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <CustomSelect
                    value={fieldValue(f.key)}
                    onChange={(v) => onFieldChange(f.key, v)}
                    options={f.options || []}
                  />
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={fieldValue(f.key)}
                    onChange={(e) => onFieldChange(f.key, e.target.value)}
                    rows={3}
                    className="glass-inset w-full px-3 py-2 text-sm"
                  />
                ) : (
                  <Input
                    type={f.inputType || 'text'}
                    value={fieldValue(f.key)}
                    onChange={(e) => onFieldChange(f.key, e.target.value)}
                    className="neomorph-inset"
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={onCancel} variant="outline" size="sm">Cancel</Button>
            <Button onClick={onSave} size="sm" className="bg-primary text-primary-foreground">Save Changes</Button>
          </div>
        </div>
      </div>
    );
  }

  // Display mode
  const nameValue = data.name || '';
  const phoneValue = data.phone || '';
  const emailValue = data.email || '';
  const nameEmpty = !nameValue;
  const phoneEmpty = !phoneValue;
  const emailEmpty = !emailValue;
  const addressEmpty = !data.address_line_1 && !data.town && !data.postcode;

  const allDetails = [
    { label: 'Name', value: nameValue, isEmpty: nameEmpty },
    { label: 'Phone', value: phoneValue, isEmpty: phoneEmpty },
    { label: 'Email', value: emailValue, isEmpty: emailEmpty },
    ...extras,
  ];

  return (
    <div className={cardClass}>
      {/* Header — only show when not bare (EditableSection handles its own header) */}
      {!bare && (
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
            <Icon className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            {canEdit && !editing && (
              <Button variant="ghost" size="icon" onClick={onStartEdit} className="h-8 w-8 hover:text-gold">
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {allDetails.map((d, i) => (
          <DetailCell key={i} label={d.label} value={d.value} isEmpty={d.isEmpty} isCurrency={d.isCurrency} meta={d.meta} />
        ))}
      </div>

      {/* Address block */}
      <AddressBlock
        addressLine1={data.address_line_1}
        addressLine2={data.address_line_2}
        town={data.town}
        county={data.county}
        postcode={data.postcode}
        isEmpty={addressEmpty}
      />
    </div>
  );
}