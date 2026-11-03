import { jsPDF } from 'npm:jspdf@2.5.1';
import { clip } from './publicLinks.ts';

/** The witness statement form's answers, cleaned, and the signed PDF made from them. */
const LOGO_URL = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';
const RCM_BLUE: [number, number, number] = [19, 29, 71];
const RCM_GREEN: [number, number, number] = [1, 242, 5];
export const STATEMENT_OF_TRUTH = 'I believe that the facts stated in this witness statement are true. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.';

export const pick = (v: unknown, allowed: string[]) => (allowed.includes(String(v)) ? String(v) : '');
const ukDate = (d: string) => {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};
export const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function cleanAnswers(a: any) {
  return {
    full_name: clip(a?.full_name, 150),
    address: clip(a?.address, 400),
    postcode: clip(a?.postcode, 12).toUpperCase(),
    phone: clip(a?.phone, 40),
    email: clip(a?.email, 200),
    knows_parties: pick(a?.knows_parties, ['No', 'Yes']),
    knows_parties_detail: clip(a?.knows_parties_detail, 500),
    position: pick(a?.position, ['Pedestrian', 'Driver of another vehicle', 'Passenger in another vehicle', 'Cyclist', 'Other']),
    position_detail: clip(a?.position_detail, 500),
    incident_date: clip(a?.incident_date, 20),
    incident_time: clip(a?.incident_time, 10),
    incident_location: clip(a?.incident_location, 300),
    weather: pick(a?.weather, ['Dry', 'Wet / raining', 'Snow or ice', 'Fog', 'Not sure']),
    light: pick(a?.light, ['Daylight', 'Dark – street lights on', 'Dark – no street lights', 'Dusk or dawn', 'Not sure']),
    account: clip(a?.account, 6000),
    vehicles_description: clip(a?.vehicles_description, 1500),
    responsibility: clip(a?.responsibility, 1500),
    injuries: pick(a?.injuries, ['No', 'Yes', 'Not sure']),
    injuries_detail: clip(a?.injuries_detail, 800),
    police: pick(a?.police, ['No', 'Yes', 'Not sure']),
    contact_ok: pick(a?.contact_ok, ['Yes', 'No']),
  };
}

/** The RCM logo as a data URL, for the PDF header (jsPDF can't fetch a web address itself). */
export async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return `data:image/jpeg;base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

export function buildPdf(ans: ReturnType<typeof cleanAnswers>, claim: any, signature: string, signedAt: Date, logo: string | null = null) {
  const doc = new jsPDF();
  const LM = 20, RM = 190, MW = RM - LM;
  let y = 0;

  const footer = () => {
    doc.setFillColor(...RCM_BLUE);
    doc.rect(0, 282, 210, 15, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('RCM Automotive', 105, 288, { align: 'center' });
    doc.setTextColor(...RCM_GREEN);
    doc.text('www.rcmautomotive.co.uk | info@rcmautomotive.co.uk', 105, 293, { align: 'center' });
  };
  const newPage = () => { footer(); doc.addPage(); y = 20; };
  const need = (h: number) => { if (y + h > 274) newPage(); };

  // Header
  // The logo sits on the brand navy, as on the website and emails.
  doc.setFillColor(...RCM_BLUE);
  doc.rect(0, 0, 210, 30, 'F');
  if (logo) { try { doc.addImage(logo, 'JPEG', 82, 4, 46, 22); } catch { /* title still shows */ } }
  y = 40;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...RCM_BLUE);
  doc.text('WITNESS STATEMENT', 105, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
  doc.text(`Our ref: ${claim.job_number || '—'}    Vehicle: ${(claim.reg || '—').toUpperCase()}    Signed: ${signedAt.toLocaleDateString('en-GB')}`, 105, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(...RCM_GREEN); doc.setLineWidth(1); doc.line(LM, y, RM, y);
  y += 9;

  let firstHeading = true;
  const heading = (t: string) => {
    if (!firstHeading) y += 4;
    firstHeading = false;
    need(14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...RCM_BLUE);
    doc.text(t, LM, y);
    y += 2; doc.setDrawColor(220, 222, 230); doc.setLineWidth(0.3); doc.line(LM, y, RM, y);
    y += 6;
  };
  const row = (label: string, value: string) => {
    const lines = doc.splitTextToSize(value || '—', MW - 52);
    need(lines.length * 5 + 2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(70, 70, 70);
    doc.text(label, LM, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
    doc.text(lines, LM + 52, y);
    y += lines.length * 5 + 2;
  };
  const block = (label: string, value: string) => {
    need(12);
    if (label) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(70, 70, 70);
      doc.text(label, LM, y); y += 5;
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    for (const line of doc.splitTextToSize(value || '—', MW)) { need(5.5); doc.text(line, LM, y); y += 5.5; }
    y += 3;
  };

  heading('1. Witness details');
  row('Full name', ans.full_name);
  row('Address', [ans.address, ans.postcode].filter(Boolean).join(', '));
  row('Phone', ans.phone);
  row('Email', ans.email);
  row('Knows anyone involved?', ans.knows_parties === 'Yes' ? `Yes – ${ans.knows_parties_detail || 'not stated'}` : (ans.knows_parties || '—'));
  row('Where they were', ans.position ? `${ans.position}${ans.position_detail ? ` – ${ans.position_detail}` : ''}` : (ans.position_detail || '—'));

  heading('2. The accident');
  row('Date', ukDate(ans.incident_date));
  row('Time', ans.incident_time);
  row('Location', ans.incident_location);
  row('Weather / road', ans.weather);
  row('Light', ans.light);

  heading('3. What the witness saw');
  block('In their own words', ans.account);
  if (ans.vehicles_description) block('Vehicles involved', ans.vehicles_description);
  if (ans.responsibility) block('Who they believe was responsible, and why', ans.responsibility);
  row('Injuries seen', ans.injuries === 'Yes' ? `Yes – ${ans.injuries_detail || 'not described'}` : (ans.injuries || '—'));
  row('Police attended', ans.police);
  row('Happy to be contacted', ans.contact_ok === 'Yes' ? 'Yes – by the insurers or solicitors dealing with the claim' : (ans.contact_ok || '—'));

  heading('4. Statement of truth');
  block('', STATEMENT_OF_TRUTH);
  need(48);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  doc.text('Signed:', LM, y); y += 3;
  try { doc.addImage(signature, 'PNG', LM, y, 80, 25); } catch { /* signature box left blank */ }
  y += 27;
  doc.setDrawColor(180, 180, 180); doc.line(LM, y, LM + 80, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${ans.full_name}`, LM, y); y += 6;
  doc.text(`Date: ${signedAt.toLocaleDateString('en-GB')} at ${signedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}`, LM, y); y += 6;
  doc.setFontSize(8); doc.setTextColor(110, 110, 110);
  doc.text('Signed electronically through RCM Automotive’s secure witness statement link.', LM, y);
  footer();
  return doc.output('arraybuffer');
}

