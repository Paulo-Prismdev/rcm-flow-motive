#!/usr/bin/env python3
# Re-maps the claim detail screens. Run from the app root. Fails loudly if any
# expected piece of code is not found, so nothing is half-changed silently.
import sys, re

def must_replace(s, old, new, count=1):
    n = s.count(old)
    if n != count:
        sys.exit(f"expected {count} of {old[:70]!r}, found {n}")
    return s.replace(old, new)

def cut(s, start, end, new):
    a = s.index(start)
    b = s.index(end, a + len(start))
    return s[:a] + new + s[b:]

P = 'src/components/claims/ClaimDetail.jsx'
s = open(P).read()

# ── imports ──
s = must_replace(s, 'import { ListTodo, History, Timer, Link2 } from "lucide-react";',
    'import { ListTodo, History, Timer, Link2, KeyRound, FileSignature } from "lucide-react";\n'
    "import { ClaimFieldsSection, SectionShell } from './ClaimFieldCards';\n"
    "import { overviewCards, insuranceCards, datesCards, estimateCards, clientCards, driverCards, thirdPartyCards, referrerCards, hireCards, vehicleCards, instructionCards, indemnityCards, signedFormCards } from './claimScreens';")

# ── what counts as "to fill in" per screen ──
s = cut(s, 'const SECTION_FIELDS = {', '};\n\nconst isSectionEmpty', '''const SECTION_FIELDS = {
  status: ['reg', 'claim_type', 'loss_date', 'vehicle_use', 'incident_location', 'circumstances'],
  insurance: ['insurer', 'claim_ref', 'policy_number', 'policy_excess'],
  client: ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_town', 'client_postcode'],
  hire: ['credit_repair_company_name', 'credit_repair_company_contact_name', 'credit_repair_company_phone', 'credit_repair_company_email', 'credit_repair_company_account_ref'],
  driver: ['driver_contact_name', 'driver_contact_phone'],
  estimate: ['estimate_cost_net', 'authorising_party'],
  thirdParty: ['tp_name', 'tp_phone', 'tp_reg', 'tp_insurer'],
  vehicle: ['vehicle_colour', 'vehicle_fuel_type', 'vehicle_type', 'vehicle_location', 'vehicle_damage'],
  referrer: ['referrer', 'referrer_ref', 'file_handler'],
  bodyshop: ['bodyshop'],
  financials: ['estimate_cost_net', 'authority_cost_net', 'final_repair_cost'],
  dates: ['date_received'],
  indemnity: ['indemnity_driver_dob', 'indemnity_registered_owner'],
''')
s = must_replace(s, "  if (sectionId === 'excessContribution' && (!claim.excess_contribution_method || claim.excess_contribution_method === 'None')) return false;",
    "  // Hire / credit repair company details only matter on a credit repair claim.\n"
    "  if (sectionId === 'hire' && claim.claim_type !== 'Credit Repair') return false;\n"
    "  // The repair contact is the client unless switched off.\n"
    "  if (sectionId === 'driver' && claim.driver_same_as_client !== false) return false;\n"
    "  // Indemnity only counts when checks are switched on.\n"
    "  if (sectionId === 'indemnity' && !claim.requires_indemnity) return false;")

# ── the screens, in their groups (see DETAIL_GROUPS) ──
s = cut(s, 'const DETAIL_SECTIONS = [', '];\n', '''const DETAIL_SECTIONS = [
  { id: 'status', label: 'Overview', icon: Clock },
  { id: 'dates', label: 'Key dates', icon: Calendar },
  { id: 'estimate', label: 'Estimate', icon: Calculator },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'insurance', label: 'Insurance & excess', icon: BadgePercent },
  { id: 'client', label: 'Client', icon: Users },
  { id: 'driver', label: 'Repair contact (driver)', icon: User },
  { id: 'thirdParty', label: 'Third party', icon: Users },
  { id: 'referrer', label: 'Referrer', icon: Briefcase },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'hire', label: 'Courtesy car & hire', icon: KeyRound },
  { id: 'bodyshop', label: 'Bodyshop', icon: Wrench },
  { id: 'instructionDefaults', label: 'Instruction defaults', icon: FileText },
  { id: 'backorderedParts', label: 'Backordered parts', icon: Package },
  { id: 'thirdpartyPursuit', label: 'Third party pursuit', icon: Users },
  { id: 'indemnity', label: 'Indemnity', icon: Shield },
  { id: 'signedForms', label: 'Signed forms', icon: FileSignature },
''')
s = must_replace(s, "export default function ClaimDetail(",
    "// Screens that were merged into another one: old links still land in the right place.\n"
    "const SECTION_ALIASES = {\n"
    "  excessContribution: 'insurance', vehicleDamage: 'vehicle', vehicleLocation: 'vehicle', creditRepair: 'hire',\n"
    "  repairPreference: 'signedForms', declarationOfNeed: 'signedForms', witnessStatements: 'signedForms',\n"
    "};\n"
    "const canonicalSection = (id) => SECTION_ALIASES[id] || id;\n\n"
    "export default function ClaimDetail(")
s = must_replace(s, "const [selectedSection, setSelectedSection] = useState(initialSection);",
    "const [selectedSection, setSelectedSection] = useState(canonicalSection(initialSection));")
s = must_replace(s, "    if (urlSection && urlSection !== selectedSection) setSelectedSection(urlSection);",
    "    if (urlSection && canonicalSection(urlSection) !== selectedSection) setSelectedSection(canonicalSection(urlSection));")
s = must_replace(s, "  const phoneSections = DETAIL_SECTIONS\n    .filter(s => s.id !== 'creditRepair' || claim.claim_type === 'Credit Repair')\n",
    "  const phoneSections = DETAIL_SECTIONS\n")
s = must_replace(s, "        switch (selectedSection) {", "        switch (canonicalSection(selectedSection)) {")

# ── field screens ──
fs = "claim={claim} onUpdate={handleUpdate} canEdit={canEdit}"
s = cut(s, "      case 'status':\n", "      case 'financials':\n", f'''      case 'status':
        return <ClaimFieldsSection title="Overview" icon={{Clock}} {fs} cards={{overviewCards(claim)}} />;

      case 'insurance':
        return <ClaimFieldsSection title="Insurance & excess" icon={{BadgePercent}} {fs} cards={{insuranceCards(claim, {{ ExcessForm: ClaimExcessContributionForm }})}} />;

      case 'client': {{
        const clientContacts = linkedClient?.contacts || [];
        const contactsCard = {{
          title: 'Contacts at this business',
          wide: true,
          after: (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {{clientContacts.map((c, i) => {{
                const primary = c.is_primary || (i === 0 && !clientContacts.some(x => x.is_primary));
                return (
                  <div key={{i}} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{{c.name || '—'}}</span>
                      {{c.position && <span className="text-xs text-muted-foreground">· {{c.position}}</span>}}
                      {{primary && <span className="inline-flex items-center gap-0.5 text-xs text-warning-fg font-medium"><Star className="w-3 h-3 fill-amber-500 text-warning" /> Primary</span>}}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-[13px] text-muted-foreground">
                      {{c.phone && <a href={{`tel:${{c.phone}}`}} className="flex items-center gap-1 hover:text-foreground"><Phone className="w-3.5 h-3.5" /> {{c.phone}}</a>}}
                      {{c.email && <a href={{`mailto:${{c.email}}`}} className="flex items-center gap-1 hover:text-foreground break-all"><Mail className="w-3.5 h-3.5" /> {{c.email}}</a>}}
                    </div>
                  </div>
                );
              }})}}
            </div>
          ),
        }};
        return <ClaimFieldsSection title="Client" icon={{Users}} {fs} cards={{[...clientCards(claim, {{ linkedClient }}), ...(clientContacts.length ? [contactsCard] : [])]}} />;
      }}

      case 'hire':
        return (
          <ClaimFieldsSection
            title="Courtesy car & hire" icon={{KeyRound}} {fs}
            cards={{hireCards(claim, {{ CreditRepairForm: ClaimCreditRepairForm }})}}
            after={{claim.claim_type === 'Credit Repair' && (
              <>
                <CreditRepairRatesCard claim={{claim}} />
                {{claim.credit_repair_company_name && (
                  <div className="rounded-2xl bg-card shadow-card p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold block">Credit repair instruction</span>
                        <span className="text-xs text-muted-foreground">Generate a PDF instruction and email it to {{claim.credit_repair_company_name}}.</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={{() => setIsCreditRepairInstructionOpen(true)}} className="gap-2">
                      <FileText className="w-4 h-4" /> Send instruction
                    </Button>
                  </div>
                )}}
              </>
            )}}
          />
        );

      case 'driver':
        return <ClaimFieldsSection title="Repair contact (driver)" icon={{User}} {fs} cards={{driverCards(claim)}} />;

      case 'thirdParty':
        return <ClaimFieldsSection title="Third party" icon={{Users}} {fs} cards={{thirdPartyCards(claim)}} />;

      case 'vehicle':
        return (
          <ClaimFieldsSection
            title="Vehicle" icon={{Car}} {fs}
            before={{vehicleFetchError ? <p className="text-xs text-danger-fg px-1">{{vehicleFetchError}}</p> : null}}
            cards={{vehicleCards(claim, {{
              dvlaAction: claim.reg ? (
                <Button size="sm" variant="outline" onClick={{handleFetchVehicleData}} disabled={{isFetchingVehicle}} className="h-8">
                  {{isFetchingVehicle ? 'Fetching…' : 'Fetch from DVLA'}}
                </Button>
              ) : null,
            }})}}
          />
        );

      case 'instructionDefaults':
        return <ClaimFieldsSection title="Instruction defaults" icon={{FileText}} {fs} cards={{instructionCards(claim)}} />;

      case 'referrer':
        return <ClaimFieldsSection title="Referrer" icon={{Briefcase}} {fs} cards={{referrerCards(claim, {{ ReferrerForm: ClaimReferrerForm }})}} />;

      case 'indemnity':
        return (
          <ClaimFieldsSection
            title="Indemnity" icon={{Shield}} {fs}
            before={{<IndemnityLinkManager claim={{claim}} onUpdate={{handleUpdate}} />}}
            cards={{indemnityCards(claim, {{ IndemnityForm: ClaimIndemnityForm }})}}
          />
        );

      case 'signedForms': {{
        const [rp, don] = signedFormCards(claim);
        const pdf = (url) => url ? (
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between gap-3">
            <span className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /> Signed PDF</span>
            <Button variant="outline" size="sm" onClick={{() => window.open(url, '_blank')}} className="gap-2 h-8"><Download className="w-4 h-4" /> View</Button>
          </div>
        ) : null;
        return (
          <ClaimFieldsSection
            title="Signed forms" icon={{FileSignature}} {fs}
            cards={{[
              {{ ...rp, wide: true, before: <div className="px-4 pb-3"><RepairPreferenceLinkManager claim={{claim}} onUpdate={{handleUpdate}} /></div>, after: pdf(claim.repair_preference_pdf_url) }},
              {{ ...don, wide: true, before: <div className="px-4 pb-3"><DeclarationOfNeedLinkManager claim={{claim}} onUpdate={{handleUpdate}} /></div>, after: pdf(claim.declaration_of_need_pdf_url) }},
              {{ title: 'Witness statements', wide: true, after: <div className="px-4 pb-4"><WitnessStatementsSection claim={{claim}} /></div> }},
            ]}}
          />
        );
      }}

''')

s = cut(s, "      case 'financials':\n", "      case 'dates':\n", '''      case 'financials':
        return (
          <SectionShell
            title="Financials" icon={DollarSign}
            actions={isInternalUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                <Lock className="w-3 h-3" aria-hidden="true" /> Internal only
              </span>
            )}
          >
            <div className="rounded-2xl bg-card shadow-card p-4 md:p-5">
              <ClaimFinancials claim={claim} currentUser={currentUser} onUpdate={handleUpdate} showInvoicing={isInternalUser} />
            </div>
          </SectionShell>
        );

''')

s = cut(s, "      case 'dates':\n", "      case 'bodyshop':\n", f'''      case 'dates':
        return <ClaimFieldsSection title="Key dates" icon={{Calendar}} {fs} cards={{datesCards(claim, {{ totalLoss, isRectification }})}} />;

''')

# Bodyshop keeps its own tools; it just sits in the same frame as every other screen.
s = must_replace(s, '          <EditableSection title="Bodyshop details" icon={Wrench} claim={claim} onUpdate={handleUpdate} EditComponent={ClaimBodyshopForm} canEdit={canEdit}>',
    '          <SectionShell title="Bodyshop" icon={Wrench}>\n          <div className="rounded-2xl bg-card shadow-card p-4 md:p-5">')
s = must_replace(s, '                <div className="text-xs text-muted-foreground mt-2">Debug: bodyshop_id = {claim.bodyshop_id}</div>\n', '')
b = s.index("      case 'bodyshop':")
e = s.index("      case 'estimate':", b)
block = s[b:e]
k = block.rindex('          </EditableSection>')
block = block[:k] + '          </div>\n          </SectionShell>' + block[k + len('          </EditableSection>'):]
s = s[:b] + block + s[e:]

s = cut(s, "      case 'estimate':\n", "      case 'backorderedParts':\n", f'''      case 'estimate':
        return (
          <ClaimFieldsSection
            title="Estimate" icon={{Calculator}} {fs}
            cards={{estimateCards(claim)}}
            after={{
              <>
                <EstimateAuthorityTotals claim={{claim}} />
                <div className="rounded-2xl bg-card shadow-card p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="text-sm font-semibold block">Purchase order</span>
                      <span className="text-xs text-muted-foreground">
                        Authority figure: {{(() => {{
                          const v = claim.authority_cost_gross ?? claim.estimate_cost_gross ?? claim.authority_cost_net ?? claim.estimate_cost_net;
                          return v != null && v !== '' ? `£${{Number(v).toLocaleString('en-GB', {{ minimumFractionDigits: 2 }})}}` : '—';
                        }})()}}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={{() => setIsPoDialogOpen(true)}} className="gap-2">
                    <FileText className="w-4 h-4" /> Generate PO
                  </Button>
                </div>
              </>
            }}
          />
        );

''')

open(P, 'w').write(s)

# ── phone summary: groups and the line under each screen name ──
P2 = 'src/components/claims/ClaimMobileSummary.jsx'
t = open(P2).read()
t = cut(t, 'export const DETAIL_GROUPS = [', '];\n', '''export const DETAIL_GROUPS = [
  ['The job', ['status', 'dates', 'estimate', 'financials', 'insurance']],
  ['People', ['client', 'driver', 'thirdParty', 'referrer']],
  ['The vehicle', ['vehicle', 'hire']],
  ['The repair', ['bodyshop', 'instructionDefaults', 'backorderedParts']],
  ['Recovery and legal', ['thirdpartyPursuit', 'indemnity', 'signedForms']],
''')
t = must_replace(t, "    case 'vehicleDamage': return c.vehicle_damage;\n    case 'vehicleLocation': return c.vehicle_location;\n", "")
t = must_replace(t, "    case 'creditRepair': return c.credit_repair_company_name;\n",
    "    case 'insurance': return join(c.insurer, c.claim_ref);\n"
    "    case 'hire': return join(c.courtesy_car_required === true ? 'Courtesy car' : (c.courtesy_car_required && c.courtesy_car_required !== 'No' ? `Courtesy car: ${c.courtesy_car_required}` : ''), c.credit_repair_company_name);\n")
open(P2, 'w').write(t)
print('ok')
