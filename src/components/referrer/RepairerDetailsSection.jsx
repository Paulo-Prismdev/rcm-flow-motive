import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wrench, Phone, Mail, MapPin, Globe, User, Loader2 } from 'lucide-react';

function Row({ icon: Icon, label, value, href }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="py-3 px-4 rounded-lg hover:bg-surface-hover">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-foreground-muted" />}
        <span className="text-xs font-semibold text-foreground-muted">{label}</span>
      </div>
      <div className="text-sm font-medium">
        {empty ? (
          <span className="text-muted-foreground italic text-xs">Not provided</span>
        ) : href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80 break-all">
            {value}
          </a>
        ) : (
          <span>{value}</span>
        )}
      </div>
    </div>
  );
}

export default function RepairerDetailsSection({ bodyshopId, fallbackName, fallbackEmail, authorisingParty }) {
  const { data: bodyshop, isLoading } = useQuery({
    queryKey: ['bodyshop', bodyshopId],
    queryFn: () => base44.entities.Bodyshop.get(bodyshopId),
    enabled: !!bodyshopId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (!bodyshopId) {
    return (
      <div className="neomorph-flat p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wrench className="w-5 h-5 text-gold" />
          <h3 className="font-bold">Repairer Details</h3>
        </div>
        <p className="text-center text-muted-foreground py-8 text-sm">
          No repairer has been allocated to this claim yet.
        </p>
        {authorisingParty && (
          <div className="mt-2">
            <Row label="Authorising Party" value={authorisingParty} />
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="neomorph-flat p-4 md:p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading repairer details...
      </div>
    );
  }

  const name = bodyshop?.name || fallbackName;
  const phone = bodyshop?.phone;
  const mobile = bodyshop?.mobile_phone;
  const email = bodyshop?.email || fallbackEmail;
  const contact = bodyshop?.contact_name;
  const web = bodyshop?.web_address;
  const addressParts = [
    bodyshop?.address_line_1,
    bodyshop?.address_line_2,
    bodyshop?.town,
    bodyshop?.county,
    bodyshop?.postcode,
  ].filter(Boolean);
  const fullAddress = bodyshop?.full_address || (addressParts.length ? addressParts.join(', ') : '');
  const mapsHref = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null;

  return (
    <div className="neomorph-flat p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Wrench className="w-5 h-5 text-gold" />
        <h3 className="font-bold">Repairer Details</h3>
      </div>

      {bodyshop?.logo_url && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-lg glass-inset">
          <img src={bodyshop.logo_url} alt={name} className="h-12 w-auto object-contain rounded" />
          <span className="text-sm font-semibold">{name}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Row icon={Wrench} label="Repairer" value={name} />
        <Row icon={User} label="Contact Name" value={contact} />
        <Row icon={Phone} label="Phone" value={phone} href={phone ? `tel:${phone.replace(/\s/g, '')}` : null} />
        <Row icon={Phone} label="Mobile" value={mobile} href={mobile ? `tel:${mobile.replace(/\s/g, '')}` : null} />
        <Row icon={Mail} label="Email" value={email} href={email ? `mailto:${email}` : null} />
        <Row icon={Globe} label="Website" value={web} href={web || null} />
      </div>

      <div className="mt-2 py-3 px-4 rounded-lg glass-inset">
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-3.5 h-3.5 text-foreground-muted" />
          <span className="text-xs font-semibold text-foreground-muted">Address</span>
        </div>
        {fullAddress ? (
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="text-sm leading-relaxed hover:text-primary hover:underline">
            {fullAddress}
          </a>
        ) : (
          <span className="text-muted-foreground italic text-xs">Not provided</span>
        )}
      </div>

      {authorisingParty && (
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
          <Row label="Authorising Party" value={authorisingParty} />
        </div>
      )}
    </div>
  );
}