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
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
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
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700'
    : isNo
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colorClass}`}>
      {label}: {value}
    </span>
  );
}

export default function ClaimBodyshopInfo({ bodyshopId }) {
  const { data: bodyshop, isLoading, error } = useQuery({
    queryKey: ['bodyshop', bodyshopId],
    queryFn: () => base44.entities.Bodyshop.get(bodyshopId),
    enabled: !!bodyshopId,
    staleTime: 60000,
  });

  console.log('ClaimBodyshopInfo - bodyshopId:', bodyshopId, 'bodyshop:', bodyshop, 'isLoading:', isLoading, 'error:', error);

  if (!bodyshopId) {
    console.log('ClaimBodyshopInfo: No bodyshopId provided');
    return null;
  }
  if (isLoading) {
    return (
      <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-full bg-muted rounded mb-1.5" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
    );
  }
  if (!bodyshop || error) {
    console.log('ClaimBodyshopInfo: No bodyshop data or error');
    return null;
  }

  const fullAddress = [bodyshop.address_line_1, bodyshop.address_line_2, bodyshop.town, bodyshop.county, bodyshop.postcode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{bodyshop.name}</div>
          {bodyshop.tier && <div className="text-[11px] text-muted-foreground">{bodyshop.tier}</div>}
        </div>
        <Link
          to={`${createPageUrl('BodyshopMap')}?bodyshop_id=${bodyshop.id}`}
          className="text-[11px] text-accent hover:underline flex items-center gap-1"
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
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700">
              BS10125 #: {bodyshop.bs10125_number}
            </span>
          )}
        </div>
      )}
    </div>
  );
}