import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Building2, MapPin, Phone, Mail, Globe, Users, Wrench,
  Shield, FileText, ExternalLink
} from "lucide-react";

function FieldRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-words">{value || "—"}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 pt-4 pb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className="px-1">{children}</div>
    </div>
  );
}

export default function RepairerDetailDrawer({ bodyshopId, onClose }) {
  const { data: bodyshop, isLoading } = useQuery({
    queryKey: ["bodyshop-detail", bodyshopId],
    queryFn: () => base44.entities.Bodyshop.get(bodyshopId),
    enabled: !!bodyshopId,
  });

  const open = !!bodyshopId;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {bodyshop?.name || "Repairer Details"}
          </SheetTitle>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {bodyshop?.tier && <Badge variant="outline">{bodyshop.tier}</Badge>}
            {bodyshop?.acg_signed_up === "Yes" && <Badge className="bg-green-100 text-green-700">ACG</Badge>}
            {bodyshop?.bs10125_certified === "Yes" && <Badge className="bg-blue-100 text-blue-700">BS10125</Badge>}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : bodyshop ? (
          <div className="px-1 pb-8">
            <Section title="Company Information" icon={Building2}>
              <FieldRow label="Name" value={bodyshop.name} />
              <FieldRow label="Group" value={bodyshop.group_name} />
              <FieldRow label="Tier" value={bodyshop.tier} />
              <FieldRow label="Company Reg. No." value={bodyshop.company_registration_number} />
              <FieldRow label="VAT Number" value={bodyshop.vat_number} />
              <FieldRow label="ICO Number" value={bodyshop.ico_number} />
              <FieldRow label="Directors" value={bodyshop.company_directors} />
              {bodyshop.web_address && (
                <a href={bodyshop.web_address} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                  <Globe className="w-3 h-3" /> Visit Website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </Section>

            <Section title="Contact Details" icon={Users}>
              <FieldRow label="Main Contact" value={bodyshop.contact_name} />
              <FieldRow label="Phone (Landline)" value={bodyshop.phone} />
              <FieldRow label="Phone (Mobile)" value={bodyshop.mobile_phone} />
              <FieldRow label="Main Email" value={bodyshop.email} />
              <FieldRow label="Bodyshop Manager" value={bodyshop.bodyshop_manager} />
              <FieldRow label="BS Manager Email" value={bodyshop.bs_manager_email} />
              <FieldRow label="Referral Email" value={bodyshop.referral_email} />
              <FieldRow label="Accounts Contact" value={bodyshop.accounts_contact} />
              <FieldRow label="Accounts Email" value={bodyshop.accounts_email} />
            </Section>

            <Section title="Address & Coverage" icon={MapPin}>
              <FieldRow label="Full Address" value={bodyshop.full_address} />
              <FieldRow label="Address Line 1" value={bodyshop.address_line_1} />
              <FieldRow label="Town" value={bodyshop.town} />
              <FieldRow label="County" value={bodyshop.county} />
              <FieldRow label="Postcode" value={bodyshop.postcode} />
              <FieldRow label="Radius Covered" value={bodyshop.radius_covered} />
              <FieldRow label="Latitude" value={bodyshop.latitude} />
              <FieldRow label="Longitude" value={bodyshop.longitude} />
            </Section>

            <Section title="Technical Capabilities" icon={Wrench}>
              <FieldRow label="Audatex Code" value={bodyshop.audatex_code} />
              <FieldRow label="BS10125 Certified" value={bodyshop.bs10125_certified} />
              <FieldRow label="BS10125 Number" value={bodyshop.bs10125_number} />
              <FieldRow label="Largest Vehicle" value={bodyshop.largest_vehicle_repairable} />
              <FieldRow label="Management System" value={bodyshop.bodyshop_management_system} />
              <FieldRow label="Wheel Alignment" value={bodyshop.wheel_alignment} />
              <FieldRow label="ADAS" value={bodyshop.adas} />
              <FieldRow label="JIG" value={bodyshop.jig} />
            </Section>

            <Section title="Approvals" icon={Shield}>
              <FieldRow label="Manufacturer Approvals" value={bodyshop.manufacturer_approvals} />
              <FieldRow label="Insurer Approvals" value={bodyshop.insurer_approvals} />
            </Section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}