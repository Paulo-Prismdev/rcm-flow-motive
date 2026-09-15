import { jsPDF } from "jspdf";
import { format } from "date-fns";

const fmtDate = (v) => {
  if (!v) return "-";
  try {
    return format(new Date(v), "dd/MM/yyyy");
  } catch {
    return String(v);
  }
};

const fmtCurrency = (v) => {
  if (v === null || v === undefined || v === "" || isNaN(Number(v))) return "-";
  return `£${Number(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtVal = (v) => (v === null || v === undefined || v === "" ? "-" : String(v));
const fmtBool = (v) => (v ? "Yes" : "No");

/**
 * Generates a printable PDF overview of a claim and opens it in a new tab.
 * @param {object} claim - The claim entity
 * @param {object} [linkedClient] - Optional linked Client entity
 */
export function generateClaimOverviewPdf(claim, linkedClient) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  const NAVY = [19, 29, 71];
  const MUTED = [107, 114, 128];

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin - 8) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionHeader = (title) => {
    ensureSpace(14);
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), margin + 2, y + 5);
    y += 7 + 5;
    doc.setTextColor(30, 41, 59);
  };

  const twoColRow = (label, value) => {
    ensureSpace(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(String(label), margin, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    const valStr = String(value);
    const wrapped = doc.splitTextToSize(valStr, contentW / 2 - 2);
    doc.text(wrapped, margin + contentW / 2, y);
    const lines = Array.isArray(wrapped) ? wrapped.length : 1;
    y += Math.max(5, lines * 3.6);
  };

  const fullWidthRow = (label, value) => {
    ensureSpace(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(String(label), margin, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    const wrapped = doc.splitTextToSize(String(value), contentW - 2);
    doc.text(wrapped, margin, y + 4);
    const lines = Array.isArray(wrapped) ? wrapped.length : 1;
    y += 4 + lines * 3.6 + 1;
  };

  // ── Header ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Claim File Overview", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW - margin, 11, { align: "right" });
  y = 24;

  // ── Title block ──
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(claim.job_number || "Claim", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Registration: ${fmtVal(claim.reg)}`, margin, y);
  doc.text(`Claim Type: ${fmtVal(claim.claim_type)}`, margin + 80, y);
  y += 5;
  if (claim.journey_status || claim.job_status) {
    doc.text(`Journey: ${fmtVal(claim.journey_status || claim.job_status)}`, margin, y);
    y += 5;
  }
  if (claim.secondary_status) {
    doc.text(`Secondary: ${fmtVal(claim.secondary_status)}`, margin, y);
    if (claim.tertiary_status) doc.text(`Tertiary: ${fmtVal(claim.tertiary_status)}`, margin + 80, y);
    y += 5;
  }
  y += 3;

  // ── Job Overview ──
  sectionHeader("Job Overview");
  twoColRow("Date Created", fmtDate(claim.created_date));
  twoColRow("Date of Loss", fmtDate(claim.loss_date));
  twoColRow("Time of Loss", fmtVal(claim.loss_time));
  twoColRow("Use of Vehicle", fmtVal(claim.vehicle_use));
  twoColRow("Courtesy Car Required", fmtBool(claim.courtesy_car_required));
  fullWidthRow("Incident Location", fmtVal(claim.incident_location));
  fullWidthRow("Circumstances", fmtVal(claim.circumstances));

  // ── Key Dates ──
  sectionHeader("Key Dates");
  twoColRow("Date Received", fmtDate(claim.date_received));
  twoColRow("Loss Date", fmtDate(claim.loss_date));
  twoColRow("Estimate Completed", fmtDate(claim.estimate_completed));
  twoColRow("Authority Received", fmtDate(claim.authority_received));
  twoColRow("Bodyshop Instructed", fmtDate(claim.bs_instructed));
  twoColRow("Booking In Date", fmtDate(claim.booking_in_date));
  twoColRow("On-Site Date", fmtDate(claim.on_site_date));
  twoColRow("Hand Over Date", fmtDate(claim.hand_over_date));
  twoColRow("Completion Date", fmtDate(claim.completion_date));
  twoColRow("Claim Complete Date", fmtDate(claim.claim_complete_date));
  twoColRow("Cancellation Date", fmtDate(claim.cancellation_date));

  // ── Client ──
  sectionHeader("Client Details");
  twoColRow("Name", fmtVal(claim.client_name || linkedClient?.name));
  twoColRow("Phone", fmtVal(claim.client_phone || linkedClient?.phone));
  twoColRow("Email", fmtVal(claim.client_email || linkedClient?.email));
  twoColRow("VAT Status", fmtVal(claim.client_vat_status || linkedClient?.vat_status));
  twoColRow("Client Ref", fmtVal(claim.client_ref));
  twoColRow("Business Division", fmtVal(claim.business_division));
  const addrParts = [
    claim.client_address_line_1,
    claim.client_address_line_2,
    [claim.client_town, claim.client_county, claim.client_postcode].filter(Boolean).join(", "),
  ].filter(Boolean);
  if (addrParts.length) fullWidthRow("Address", addrParts.join("\n"));

  // ── Insurance & Broker ──
  sectionHeader("Insurance & Broker");
  twoColRow("Broker", fmtVal(claim.broker_name));
  twoColRow("Insurer", fmtVal(claim.insurer));
  twoColRow("Claim Reference", fmtVal(claim.claim_ref));
  twoColRow("Policy Number", fmtVal(claim.policy_number));
  twoColRow("Policy Excess", fmtCurrency(claim.policy_excess));

  // ── Repair Contact (Driver) ──
  sectionHeader("Repair Contact (Driver)");
  twoColRow("Name", fmtVal(claim.driver_contact_name));
  twoColRow("Phone", fmtVal(claim.driver_contact_phone));
  twoColRow("Email", fmtVal(claim.driver_contact_email));
  twoColRow("Same as Client", claim.driver_same_as_client === false ? "No" : "Yes");

  // ── Vehicle ──
  sectionHeader("Vehicle Details");
  twoColRow("Make", fmtVal(claim.vehicle_make));
  twoColRow("Model", fmtVal(claim.vehicle_model));
  twoColRow("Colour", fmtVal(claim.vehicle_colour));
  twoColRow("Fuel Type", fmtVal(claim.vehicle_fuel_type));
  twoColRow("Year of Manufacture", fmtVal(claim.vehicle_year_of_manufacture));
  twoColRow("Vehicle Type", fmtVal(claim.vehicle_type));
  twoColRow("Engine Capacity (cc)", fmtVal(claim.vehicle_engine_capacity));
  twoColRow("CO2 Emissions", fmtVal(claim.vehicle_co2_emissions));
  twoColRow("MOT Status", fmtVal(claim.vehicle_mot_status));
  twoColRow("MOT Expiry", fmtDate(claim.vehicle_mot_expiry_date));
  twoColRow("Tax Status", fmtVal(claim.vehicle_tax_status));
  twoColRow("Tax Due Date", fmtDate(claim.vehicle_tax_due_date));
  fullWidthRow("Vehicle Location", fmtVal(claim.vehicle_location));
  fullWidthRow("Vehicle Damage", fmtVal(claim.vehicle_damage));

  // ── Third Party ──
  if (claim.tp_name || claim.tp_reg || claim.tp_insurer) {
    sectionHeader("Third Party");
    twoColRow("Name", fmtVal(claim.tp_name));
    twoColRow("Phone", fmtVal(claim.tp_phone));
    twoColRow("Email", fmtVal(claim.tp_email));
    twoColRow("Registration", fmtVal(claim.tp_reg));
    twoColRow("Insurer", fmtVal(claim.tp_insurer));
    twoColRow("Policy Number", fmtVal(claim.tp_policy_number));
    twoColRow("Claim Ref", fmtVal(claim.tp_claim_ref));
    twoColRow("Make / Model", fmtVal(claim.tp_make_model));
  }

  // ── Bodyshop ──
  sectionHeader("Bodyshop");
  twoColRow("Bodyshop", fmtVal(claim.bodyshop));
  twoColRow("Bodyshop Email", fmtVal(claim.bodyshop_email));
  twoColRow("Repairer Accepted", fmtBool(claim.repairer_accepted));
  twoColRow("Accepted Date", fmtDate(claim.repairer_accepted_date));
  twoColRow("Authorised By", fmtVal(claim.authorised_by));

  // ── Referrer ──
  sectionHeader("Referrer");
  twoColRow("Referrer", fmtVal(claim.referrer));
  twoColRow("Referrer Email", fmtVal(claim.referrer_email));
  twoColRow("Referrer Ref", fmtVal(claim.referrer_ref));
  twoColRow("File Handler", fmtVal(claim.file_handler));

  // ── Footer page numbers ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 6, { align: "right" });
  }

  const fileName = `Claim_Overview_${claim.job_number || claim.reg || claim.id}.pdf`;
  doc.save(fileName);
}