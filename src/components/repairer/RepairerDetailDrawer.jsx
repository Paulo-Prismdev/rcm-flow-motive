import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Building2, MapPin, Phone, Mail, Globe, Users, Wrench,
  Shield, Save, Loader2
} from "lucide-react";

const TIER_OPTIONS = ["TIER 1", "TIER 2", "Previously on Network", ""];
const YES_NO_OPTIONS = ["Yes", "No", "TBC", ""];
const IN_HOUSE_OPTIONS = ["In House", "Outsourced", ""];

function EditableField({ label, value, onChange, type = "text" }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <label className="text-xs text-muted-foreground whitespace-nowrap block mb-1">{label}</label>
      <Input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
        placeholder="—"
      />
    </div>
  );
}

function DropdownField({ label, value, onChange, options }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <label className="text-xs text-muted-foreground whitespace-nowrap block mb-1">{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm w-full rounded-md border border-input bg-transparent px-2"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt === "" ? "— Not set —" : opt}</option>
        ))}
      </select>
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});

  const { data: bodyshop, isLoading } = useQuery({
    queryKey: ["bodyshop-detail", bodyshopId],
    queryFn: () => base44.entities.Bodyshop.get(bodyshopId),
    enabled: !!bodyshopId,
  });

  useEffect(() => {
    if (bodyshop) {
      setFormData({ ...bodyshop });
    }
  }, [bodyshop]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: (data) => {
      // Only send editable fields, strip built-in fields
      const { id, created_date, updated_date, created_by_id, ...editable } = data;
      return base44.entities.Bodyshop.update(bodyshopId, editable);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodyshop-detail", bodyshopId] });
      queryClient.invalidateQueries({ queryKey: ["repairer-directory"] });
      toast({ title: "Saved", description: "Repairer details updated successfully." });
    },
    onError: (err) => {
      toast({ title: "Save failed", description: err.message || "Unknown error", variant: "destructive" });
    },
  });

  const handleSave = () => saveMutation.mutate(formData);

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
            {formData.tier && <Badge variant="outline">{formData.tier}</Badge>}
            {formData.acg_signed_up === "Yes" && <Badge className="bg-green-100 text-green-700">ACG</Badge>}
            {formData.bs10125_certified === "Yes" && <Badge className="bg-blue-100 text-blue-700">BS10125</Badge>}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : bodyshop ? (
          <>
            <div className="px-1 pb-20">
              <Section title="Company Information" icon={Building2}>
                <EditableField label="Name" value={formData.name} onChange={(v) => updateField("name", v)} />
                <EditableField label="Group" value={formData.group_name} onChange={(v) => updateField("group_name", v)} />
                <DropdownField label="Tier" value={formData.tier} onChange={(v) => updateField("tier", v)} options={TIER_OPTIONS} />
                <EditableField label="Company Reg. No." value={formData.company_registration_number} onChange={(v) => updateField("company_registration_number", v)} />
                <EditableField label="VAT Number" value={formData.vat_number} onChange={(v) => updateField("vat_number", v)} />
                <EditableField label="ICO Number" value={formData.ico_number} onChange={(v) => updateField("ico_number", v)} />
                <EditableField label="Directors" value={formData.company_directors} onChange={(v) => updateField("company_directors", v)} />
                <EditableField label="Web Address" value={formData.web_address} onChange={(v) => updateField("web_address", v)} />
              </Section>

              <Section title="Contact Details" icon={Users}>
                <EditableField label="Main Contact" value={formData.contact_name} onChange={(v) => updateField("contact_name", v)} />
                <EditableField label="Phone (Landline)" value={formData.phone} onChange={(v) => updateField("phone", v)} />
                <EditableField label="Phone (Mobile)" value={formData.mobile_phone} onChange={(v) => updateField("mobile_phone", v)} />
                <EditableField label="Main Email" value={formData.email} onChange={(v) => updateField("email", v)} />
                <EditableField label="Bodyshop Manager" value={formData.bodyshop_manager} onChange={(v) => updateField("bodyshop_manager", v)} />
                <EditableField label="BS Manager Email" value={formData.bs_manager_email} onChange={(v) => updateField("bs_manager_email", v)} />
                <EditableField label="Referral Email" value={formData.referral_email} onChange={(v) => updateField("referral_email", v)} />
                <EditableField label="Accounts Contact" value={formData.accounts_contact} onChange={(v) => updateField("accounts_contact", v)} />
                <EditableField label="Accounts Email" value={formData.accounts_email} onChange={(v) => updateField("accounts_email", v)} />
              </Section>

              <Section title="Address & Coverage" icon={MapPin}>
                <EditableField label="Full Address" value={formData.full_address} onChange={(v) => updateField("full_address", v)} />
                <EditableField label="Address Line 1" value={formData.address_line_1} onChange={(v) => updateField("address_line_1", v)} />
                <EditableField label="Address Line 2" value={formData.address_line_2} onChange={(v) => updateField("address_line_2", v)} />
                <EditableField label="Town" value={formData.town} onChange={(v) => updateField("town", v)} />
                <EditableField label="County" value={formData.county} onChange={(v) => updateField("county", v)} />
                <EditableField label="Postcode" value={formData.postcode} onChange={(v) => updateField("postcode", v)} />
                <EditableField label="Radius Covered" value={formData.radius_covered} onChange={(v) => updateField("radius_covered", v)} />
              </Section>

              <Section title="Technical Capabilities" icon={Wrench}>
                <EditableField label="Audatex Code" value={formData.audatex_code} onChange={(v) => updateField("audatex_code", v)} />
                <DropdownField label="BS10125 Certified" value={formData.bs10125_certified} onChange={(v) => updateField("bs10125_certified", v)} options={YES_NO_OPTIONS} />
                <EditableField label="BS10125 Number" value={formData.bs10125_number} onChange={(v) => updateField("bs10125_number", v)} />
                <EditableField label="Largest Vehicle" value={formData.largest_vehicle_repairable} onChange={(v) => updateField("largest_vehicle_repairable", v)} />
                <EditableField label="Management System" value={formData.bodyshop_management_system} onChange={(v) => updateField("bodyshop_management_system", v)} />
                <DropdownField label="Wheel Alignment" value={formData.wheel_alignment} onChange={(v) => updateField("wheel_alignment", v)} options={IN_HOUSE_OPTIONS} />
                <DropdownField label="ADAS" value={formData.adas} onChange={(v) => updateField("adas", v)} options={IN_HOUSE_OPTIONS} />
                <DropdownField label="JIG" value={formData.jig} onChange={(v) => updateField("jig", v)} options={IN_HOUSE_OPTIONS} />
              </Section>

              <Section title="Compliance" icon={Shield}>
                <DropdownField label="ACG Signed Up" value={formData.acg_signed_up} onChange={(v) => updateField("acg_signed_up", v)} options={YES_NO_OPTIONS} />
                <EditableField label="Manufacturer Approvals" value={formData.manufacturer_approvals} onChange={(v) => updateField("manufacturer_approvals", v)} />
                <EditableField label="Insurer Approvals" value={formData.insurer_approvals} onChange={(v) => updateField("insurer_approvals", v)} />
              </Section>
            </div>

            {/* Sticky Save Bar */}
            <div className="sticky bottom-0 left-0 right-0 bg-card border-t border-border p-3 flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}