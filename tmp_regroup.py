import sys

def rep(s, a, b, n=1):
    c = s.count(a)
    if c != n:
        sys.exit(f'{c} x {a[:80]!r}')
    return s.replace(a, b)

# ── claimScreens: split third party insurance and the credit repair company out ──
P = 'src/components/claims/claimScreens.jsx'
s = open(P).read()
a = s.index("export const thirdPartyCards = () => [")
b = s.index("export const referrerCards", a)
s = s[:a] + """export const thirdPartyCards = () => [
  {
    title: 'Person',
    fields: [
      { key: 'tp_name', label: 'Name', type: 'thirdParty' },
      { key: 'tp_phone', label: 'Phone', type: 'tel' },
      { key: 'tp_email', label: 'Email', type: 'email', optional: true },
      { key: 'tp_driver_contact', label: 'Driver / contact', optional: true },
      address('tp_'),
    ],
  },
  {
    title: 'Their vehicle',
    fields: [
      { key: 'tp_reg', label: 'Registration', upper: true },
      { key: 'tp_make_model', label: 'Make / model', optional: true },
    ],
  },
];

export const tpInsuranceCards = () => [
  {
    title: "Third party's insurance",
    fields: [
      { key: 'tp_insurer', label: 'Insurer', type: 'insurer', placeholder: 'Select TP insurer...' },
      { key: 'tp_broker_name', label: 'Broker', type: 'broker', idKey: 'tp_broker_id', nameKey: 'tp_broker_name', placeholder: 'Select TP broker...', optional: true },
      { key: 'tp_claim_ref', label: 'Claim reference', optional: true },
      { key: 'tp_policy_number', label: 'Policy number', optional: true },
    ],
  },
];

""" + s[b:]
s = rep(s, """export const hireCards = (claim, { CreditRepairForm }) => {
  const credit = claim.claim_type === 'Credit Repair';
  const f = { form: CreditRepairForm };
  return [
    { title: 'Courtesy car & hire', fields: [courtesyField, hireField] },
    {
      title: 'Credit repair company',
      hidden: !credit,
      fields: [""", """export const hireCards = () => [
  { title: 'Courtesy car & hire', fields: [courtesyField, hireField] },
];

export const creditRepairCards = (claim, { CreditRepairForm }) => {
  const f = { form: CreditRepairForm, optional: claim.claim_type !== 'Credit Repair' };
  return [
    {
      title: 'Credit repair company',
      fields: [""")
open(P, 'w').write(s)

# ── ClaimDetail: the screens and their content ──
P = 'src/components/claims/ClaimDetail.jsx'
s = open(P).read()
s = rep(s, "thirdPartyCards, referrerCards, hireCards,", "thirdPartyCards, tpInsuranceCards, referrerCards, hireCards, creditRepairCards,")
s = rep(s, "  hire: ['credit_repair_company_name',", "  creditRepair: ['credit_repair_company_name',")
s = rep(s, "  thirdParty: ['tp_name', 'tp_phone', 'tp_reg', 'tp_insurer'],", "  thirdParty: ['tp_name', 'tp_phone', 'tp_reg'],\n  tpInsurance: ['tp_insurer'],")
s = rep(s, "  if (sectionId === 'hire' && claim.claim_type !== 'Credit Repair') return false;", "  if (sectionId === 'creditRepair' && claim.claim_type !== 'Credit Repair') return false;")
s = rep(s, """  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'insurance', label: 'Insurance & excess', icon: BadgePercent },
  { id: 'client', label: 'Client', icon: Users },
  { id: 'driver', label: 'Repair contact (driver)', icon: User },
  { id: 'thirdParty', label: 'Third party', icon: Users },
  { id: 'referrer', label: 'Referrer', icon: Briefcase },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'hire', label: 'Courtesy car & hire', icon: KeyRound },""", """  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'client', label: 'Client details', icon: Users },
  { id: 'insurance', label: 'Client insurance', icon: Shield },
  { id: 'driver', label: 'Repair contact (driver)', icon: User },
  { id: 'thirdParty', label: 'Third party details', icon: Users },
  { id: 'tpInsurance', label: 'Third party insurance', icon: Shield },
  { id: 'referrer', label: 'Referrer', icon: Briefcase },
  { id: 'creditRepair', label: 'Credit repair company', icon: BadgePercent },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'hire', label: 'Courtesy car & hire', icon: KeyRound },""")
s = rep(s, "vehicleLocation: 'vehicle', creditRepair: 'hire',", "vehicleLocation: 'vehicle',")
s = rep(s, 'return <ClaimFieldsSection title="Insurance & excess" icon={BadgePercent}', 'return <ClaimFieldsSection title="Client insurance" icon={Shield}')
s = rep(s, 'return <ClaimFieldsSection title="Client" icon={Users}', 'return <ClaimFieldsSection title="Client details" icon={Users}')
s = rep(s, """            title="Courtesy car & hire" icon={KeyRound} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}
            cards={hireCards(claim, { CreditRepairForm: ClaimCreditRepairForm })}
            after={claim.claim_type === 'Credit Repair' && (""", """            title="Credit repair company" icon={BadgePercent} claim={claim} onUpdate={handleUpdate} canEdit={canEdit}
            cards={creditRepairCards(claim, { CreditRepairForm: ClaimCreditRepairForm })}
            after={(""")
s = rep(s, "      case 'hire':\n        return (\n          <ClaimFieldsSection\n            title=\"Credit repair company\"",
    "      case 'hire':\n        return <ClaimFieldsSection title=\"Courtesy car & hire\" icon={KeyRound} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={hireCards(claim)} />;\n\n"
    "      case 'creditRepair':\n        return (\n          <ClaimFieldsSection\n            title=\"Credit repair company\"")
s = rep(s, 'return <ClaimFieldsSection title="Third party" icon={Users} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={thirdPartyCards(claim)} />;',
    'return <ClaimFieldsSection title="Third party details" icon={Users} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={thirdPartyCards(claim)} />;\n\n'
    "      case 'tpInsurance':\n"
    '        return <ClaimFieldsSection title="Third party insurance" icon={Shield} claim={claim} onUpdate={handleUpdate} canEdit={canEdit} cards={tpInsuranceCards(claim)} />;')
open(P, 'w').write(s)

# ── the groups (phone list and desktop list) ──
P = 'src/components/claims/ClaimMobileSummary.jsx'
s = open(P).read()
a = s.index('export const DETAIL_GROUPS = [')
b = s.index('];\n', a)
s = s[:a] + '''export const DETAIL_GROUPS = [
  ['The job', ['status', 'dates', 'estimate', 'financials']],
  ['Client', ['client', 'insurance', 'driver']],
  ['Third party', ['thirdParty', 'tpInsurance', 'thirdpartyPursuit']],
  ['Other parties', ['referrer', 'creditRepair']],
  ['The vehicle', ['vehicle', 'hire']],
  ['The repair', ['bodyshop', 'instructionDefaults', 'backorderedParts']],
  ['Recovery and legal', ['indemnity', 'signedForms']],
''' + s[b:]
s = rep(s, "    case 'thirdParty': return join(c.tp_name, c.tp_reg);", "    case 'thirdParty': return join(c.tp_name, c.tp_reg);\n    case 'tpInsurance': return join(c.tp_insurer, c.tp_claim_ref);\n    case 'creditRepair': return c.credit_repair_company_name;")
s = rep(s, "    case 'hire': return join(c.courtesy_car_required === true ? 'Courtesy car' : (c.courtesy_car_required && c.courtesy_car_required !== 'No' ? `Courtesy car: ${c.courtesy_car_required}` : ''), c.credit_repair_company_name);",
    "    case 'hire': return c.courtesy_car_required === true ? 'Courtesy car' : (c.courtesy_car_required && c.courtesy_car_required !== 'No' ? `Courtesy car: ${c.courtesy_car_required}` : '');")
open(P, 'w').write(s)
print('ok')
