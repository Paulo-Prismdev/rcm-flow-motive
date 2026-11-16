import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, Mail, MapPin, User, Globe, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function InfoLine({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ label, value }) {
  if (!value) return null;
  const isYes = value === 'Yes';
  const isNo = value === 'No';
  const colorClass = isYes
    ? 'bg-success-bg text-success-fg border-success/30'
    : isNo
    ? 'bg-danger-bg text-danger-fg border-danger/30'
    : 'bg-muted text-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {label}: {value}
    </span>
  );
}

export default function ClaimBodyshopInfo({ bodyshopId }) {
  const { data: bodyshop, isLoading, error } = useQuery({
    queryKey: ['bodyshop', bodyshopId],
    queryFn: async () => {
      try {
        const result = await base44.entities.Bodyshop.get(bodyshopId);
        return result;
      } catch (err) {
        console.error('Failed to fetch bodyshop:', err);
        throw err;
      }
    },
    enabled: !!bodyshopId,
    staleTime: 60000,
  });


  if (!bodyshopId) {
    return null;
  }
  if (isLoading) {
    return (
      <div className="mt-3 p-3 rounded-lg border border-border">
        <div className="text-sm text-muted-foreground">Loading bodyshop details…</div>
      </div>
    );
  }
  if (error) {
    console.error('Bodyshop query error:', error);
    return (
      <div className="mt-3 p-3 rounded-lg border border-danger/30 bg-danger-bg">
        <div className="text-sm text-danger-fg">Error: {error.message || 'Failed to load'}</div>
      </div>
    );
  }
  if (!bodyshop) {
    return (
      <div className="mt-3 p-3 rounded-lg border border-border">
        <div className="text-sm text-muted-foreground">No bodyshop data found</div>
      </div>
    );
  }
  

  const fullAddress = [bodyshop.address_line_1, bodyshop.address_line_2, bodyshop.town, bodyshop.county, bodyshop.postcode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{bodyshop.name}</div>
          {bodyshop.tier && <div className="text-xs text-muted-foreground">{bodyshop.tier}</div>}
        </div>
        <Link
          to={`${createPageUrl('BodyshopMap')}?bodyshop_id=${bodyshop.id}`}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <MapPin className="w-3 h-3" /> View on Map
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <InfoLine icon={User} label="Contact" value={bodyshop.contact_name} />
        <InfoLine icon={Phone} label="Phone" value={bodyshop.phone} />
        <InfoLine icon={Mail} label="Email" value={bodyshop.email} />
        <InfoLine icon={MapPin} label="Address" value={fullAddress} />
        <InfoLine icon={Globe} label="Website" value={bodyshop.web_address} />
        <InfoLine icon={Layers} label="Radius" value={bodyshop.radius_covered ? `${bodyshop.radius_covered}` : null} />
      </div>

      {(bodyshop.acg_signed_up || bodyshop.bs10125_certified || bodyshop.bs10125_number) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
          <StatusPill label="ACG" value={bodyshop.acg_signed_up} />
          <StatusPill label="BS10125" value={bodyshop.bs10125_certified} />
          {bodyshop.bs10125_number && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-info-bg text-info-fg border-info/30">
              BS10125 #: {bodyshop.bs10125_number}
            </span>
          )}
        </div>
      )}
    </div>
  );
}