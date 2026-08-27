import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Building2, MapPin, Globe, Users, Wrench,
  Shield, Save, Loader2, Pencil, X, ExternalLink, Map as MapIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const TIER_OPTIONS = ["TIER 1", "TIER 2", "Previously on Network", ""];
const MAP_GROUP_OPTIONS = ["Solution", "QAC", ""];
const YES_NO_OPTIONS = ["Yes", "No", "TBC", ""];
const IN_HOUSE_OPTIONS = ["In House", "Outsourced", ""];

function ViewField({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-words">{value || "—"}</span>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }) {
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
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: bodyshop, isLoading } = useQuery({
    queryKey: ["bodyshop-detail", bodyshopId],
    queryFn: () => base44.entities.Bodyshop.get(bodyshopId),
    enabled: !!bodyshopId,
  });

  useEffect(() => {
    if (bodyshop) {
      setFormData({ ...bodyshop });
      setIsEditing(false);
    }
  }, [bodyshop]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const { id, created_date, updated_date, created_by_id, ...editable } = data;
      return base44.entities.Bodyshop.update(bodyshopId, editable);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodyshop-detail", bodyshopId] });
      queryClient.invalidateQueries({ queryKey: ["repairer-directory"] });
      toast({ title: "Saved", description: "Repairer details updated successfully." });
      setIsEditing(false);
    },
    onError: (err) => {
      toast({ title: "Save failed", description: err.message || "Unknown error", variant: "destructive" });
    },
  });

  const handleSave = () => saveMutation.mutate(formData);
  const handleCancel = () => {
    setFormData({ ...bodyshop });
    setIsEditing(false);
  };

  const open = !!bodyshopId;
  const data = isEditing ? formData : bodyshop;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {bodyshop?.name || "Repairer Details"}
          </SheetTitle>
          <div className="flex flex-wrap gap-1.5 mt-1">
          {data?.tier && <Badge variant="outline">{data.tier}</Badge>}
          {data?.map_group && <Badge className="bg-violet-100 text-violet-700">{data.map_group}</Badge>}
          {data?.acg_signed_up === "Yes" && <Badge className="bg-green-100 text-green-700">ACG</Badge>}
          {data?.bs10125_certified === "Yes" && <Badge className="bg-blue-100 text-blue-700">BS10125</Badge>}
          </div>
          {!isEditing && (
            <div className="flex gap-2 mt-3 pb-3 border-b border-border">
              <Button
                onClick={() => {
                  onClose();
                  navigate(`${createPageUrl("BodyshopMap")}?bodyshop_id=${bodyshopId}`);
                }}
                className="w-full"
              >
                <MapIcon className="w-4 h-4" /> See on Map
              </Button>
            </div>
          )}
          </SheetHeader>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : bodyshop ? (
          <>
            <div className="px-1 pb-8">
              <Section title="Company Information" icon={Building2}>
                {isEditing ? (
                  <>
                    <EditField label="Name" value={formData.name} onChange={(v) => updateField("name", v)} />
                    <EditField label="Group" value={formData.group_name} onChange={(v) => updateField("group_name", v)} />
                    <DropdownField label="Tier" value={formData.tier} onChange={(v) => updateField("tier", v)} options={TIER_OPTIONS} />
                    <DropdownField label="Map Group" value={formData.map_group} onChange={(v) => updateField("map_group", v)} options={MAP_GROUP_OPTIONS} />
                    <EditField label="Company Reg. No." value={formData.company_registration_number} onChange={(v) => updateField("company_registration_number", v)} />
                    <EditField label="VAT Number" value={formData.vat_number} onChange={(v) => updateField("vat_number", v)} />
                    <EditField label="ICO Number" value={formData.ico_number} onChange={(v) => updateField("ico_number", v)} />
                    <EditField label="Directors" value={formData.company_directors} onChange={(v) => updateField("company_directors", v)} />
                    <EditField label="Web Address" value={formData.web_address} onChange={(v) => updateField("web_address", v)} />
                  </>
                ) : (
                  <>
                    <ViewField label="Name" value={bodyshop.name} />
                    <ViewField label="Group" value={bodyshop.group_name} />
                    <ViewField label="Tier" value={bodyshop.tier} />
                    <ViewField label="Map Group" value={bodyshop.map_group} />
                    <ViewField label="Company Reg. No." value={bodyshop.company_registration_number} />
                    <ViewField label="VAT Number" value={bodyshop.vat_number} />
                    <ViewField label="ICO Number" value={bodyshop.ico_number} />
                    <ViewField label="Directors" value={bodyshop.company_directors} />
                    {bodyshop.web_address && (
                      <a href={bodyshop.web_address} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                        <Globe className="w-3 h-3" /> Visit Website <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </>
                )}
              </Section>

              <Section title="Contact Details" icon={Users}>
                {isEditing ? (
                  <>
                    <EditField label="Main Contact" value={formData.contact_name} onChange={(v) => updateField("contact_name", v)} />
                    <EditField label="Phone (Landline)" value={formData.phone} onChange={(v) => updateField("phone", v)} />
                    <EditField label="Phone (Mobile)" value={formData.mobile_phone} onChange={(v) => updateField("mobile_phone", v)} />
                    <EditField label="Main Email" value={formData.email} onChange={(v) => updateField("email", v)} />
                    <EditField label="Bodyshop Manager" value={formData.bodyshop_manager} onChange={(v) => updateField("bodyshop_manager", v)} />
                    <EditField label="BS Manager Email" value={formData.bs_manager_email} onChange={(v) => updateField("bs_manager_email", v)} />
                    <EditField label="Referral Email" value={formData.referral_email} onChange={(v) => updateField("referral_email", v)} />
                    <EditField label="Accounts Contact" value={formData.accounts_contact} onChange={(v) => updateField("accounts_contact", v)} />
                    <EditField label="Accounts Email" value={formData.accounts_email} onChange={(v) => updateField("accounts_email", v)} />
                  </>
                ) : (
                  <>
                    <ViewField label="Main Contact" value={bodyshop.contact_name} />
                    <ViewField label="Phone (Landline)" value={bodyshop.phone} />
                    <ViewField label="Phone (Mobile)" value={bodyshop.mobile_phone} />
                    <ViewField label="Main Email" value={bodyshop.email} />
                    <ViewField label="Bodyshop Manager" value={bodyshop.bodyshop_manager} />
                    <ViewField label="BS Manager Email" value={bodyshop.bs_manager_email} />
                    <ViewField label="Referral Email" value={bodyshop.referral_email} />
                    <ViewField label="Accounts Contact" value={bodyshop.accounts_contact} />
                    <ViewField label="Accounts Email" value={bodyshop.accounts_email} />
                  </>
                )}
              </Section>

              <Section title="Address & Coverage" icon={MapPin}>
                {isEditing ? (
                  <>
                    <EditField label="Full Address" value={formData.full_address} onChange={(v) => updateField("full_address", v)} />
                    <EditField label="Address Line 1" value={formData.address_line_1} onChange={(v) => updateField("address_line_1", v)} />
                    <EditField label="Address Line 2" value={formData.address_line_2} onChange={(v) => updateField("address_line_2", v)} />
                    <EditField label="Town" value={formData.town} onChange={(v) => updateField("town", v)} />
                    <EditField label="County" value={formData.county} onChange={(v) => updateField("county", v)} />
                    <EditField label="Postcode" value={formData.postcode} onChange={(v) => updateField("postcode", v)} />
                    <EditField label="Radius Covered" value={formData.radius_covered} onChange={(v) => updateField("radius_covered", v)} />
                  </>
                ) : (
                  <>
                    <ViewField label="Full Address" value={bodyshop.full_address} />
                    <ViewField label="Address Line 1" value={bodyshop.address_line_1} />
                    <ViewField label="Address Line 2" value={bodyshop.address_line_2} />
                    <ViewField label="Town" value={bodyshop.town} />
                    <ViewField label="County" value={bodyshop.county} />
                    <ViewField label="Postcode" value={bodyshop.postcode} />
                    <ViewField label="Radius Covered" value={bodyshop.radius_covered} />
                  </>
                )}
              </Section>

              <Section title="Technical Capabilities" icon={Wrench}>
                {isEditing ? (
                  <>
                    <EditField label="Audatex Code" value={formData.audatex_code} onChange={(v) => updateField("audatex_code", v)} />
                    <DropdownField label="BS10125 Certified" value={formData.bs10125_certified} onChange={(v) => updateField("bs10125_certified", v)} options={YES_NO_OPTIONS} />
                    <EditField label="BS10125 Number" value={formData.bs10125_number} onChange={(v) => updateField("bs10125_number", v)} />
                    <EditField label="Largest Vehicle" value={formData.largest_vehicle_repairable} onChange={(v) => updateField("largest_vehicle_repairable", v)} />
                    <EditField label="Management System" value={formData.bodyshop_management_system} onChange={(v) => updateField("bodyshop_management_system", v)} />
                    <DropdownField label="Wheel Alignment" value={formData.wheel_alignment} onChange={(v) => updateField("wheel_alignment", v)} options={IN_HOUSE_OPTIONS} />
                    <DropdownField label="ADAS" value={formData.adas} onChange={(v) => updateField("adas", v)} options={IN_HOUSE_OPTIONS} />
                    <DropdownField label="JIG" value={formData.jig} onChange={(v) => updateField("jig", v)} options={IN_HOUSE_OPTIONS} />
                  </>
                ) : (
                  <>
                    <ViewField label="Audatex Code" value={bodyshop.audatex_code} />
                    <ViewField label="BS10125 Certified" value={bodyshop.bs10125_certified} />
                    <ViewField label="BS10125 Number" value={bodyshop.bs10125_number} />
                    <ViewField label="Largest Vehicle" value={bodyshop.largest_vehicle_repairable} />
                    <ViewField label="Management System" value={bodyshop.bodyshop_management_system} />
                    <ViewField label="Wheel Alignment" value={bodyshop.wheel_alignment} />
                    <ViewField label="ADAS" value={bodyshop.adas} />
                    <ViewField label="JIG" value={bodyshop.jig} />
                  </>
                )}
              </Section>

              <Section title="Compliance" icon={Shield}>
                {isEditing ? (
                  <>
                    <DropdownField label="ACG Signed Up" value={formData.acg_signed_up} onChange={(v) => updateField("acg_signed_up", v)} options={YES_NO_OPTIONS} />
                    <EditField label="Manufacturer Approvals" value={formData.manufacturer_approvals} onChange={(v) => updateField("manufacturer_approvals", v)} />
                    <EditField label="Insurer Approvals" value={formData.insurer_approvals} onChange={(v) => updateField("insurer_approvals", v)} />
                  </>
                ) : (
                  <>
                    <ViewField label="ACG Signed Up" value={bodyshop.acg_signed_up} />
                    <ViewField label="Manufacturer Approvals" value={bodyshop.manufacturer_approvals} />
                    <ViewField label="Insurer Approvals" value={bodyshop.insurer_approvals} />
                  </>
                )}
              </Section>
            </div>

            {/* Edit / Save / Cancel — sticky bottom bar */}
            <div className="sticky bottom-0 -mx-1 px-1 pt-3 pb-14 md:pb-3 bg-background border-t border-border mt-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button onClick={handleCancel} variant="outline" className="flex-1" disabled={saveMutation.isPending}>
                    <X className="w-4 h-4" /> Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)} className="w-full">
                  <Pencil className="w-4 h-4" /> Edit Details
                </Button>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}