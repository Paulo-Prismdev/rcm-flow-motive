import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Reading a new claim's instruction into claim details.
 *
 * The user uploads whatever came in (the claim form, emails saved as PDF, damage
 * photos) and/or pastes the instruction email. Everything is read together into
 * ONE set of details, each value with where it was found and how sure the reader
 * was of it, plus a suggested claim type and a draft damage description. The
 * existing claims are then checked for the same registration or reference so a
 * duplicate can be spotted before the claim is created.
 *
 * Nothing here is written to a claim: the review screen shows the reading, and
 * the claim is filled in only once the user confirms it.
 */

// key → what to read. The values are the keys the app's own fields are named.
const READ_FIELDS: Array<[string, string]> = [
  ['reg', 'The registration of the vehicle being repaired'],
  ['make_model', 'Make and model of the vehicle being repaired, if the instruction states it'],
  ['loss_date', 'Date of the incident / date of loss'],
  ['loss_time', 'Time of the incident / time of loss'],
  ['incident_location', 'Where the incident happened, as written (street, town, postcode)'],
  ['circumstances', 'What happened, in the words of the instruction'],
  ['vehicle_use', 'How the vehicle was being used at the time: "Business", "Social" or "Commuting" only where stated'],
  ['vehicle_driveable', 'Whether the vehicle can be driven ("yes" or "no") where the instruction says so'],
  ['recovery_required', 'Whether recovery is needed because the vehicle cannot be driven ("yes" or "no") where stated'],
  ['courtesy_car_required', 'Whether a courtesy car is needed ("Yes" or "No") where stated'],
  ['vehicle_location', 'Where the vehicle is now, where the instruction says'],
  ['vehicle_damage', 'The damage described in the instruction'],
  ['client_name', 'Our client / policyholder — the person or company the claim is for'],
  ['client_phone', 'Our client\'s phone number'],
  ['client_email', 'Our client\'s email address'],
  ['client_address_line_1', 'Our client\'s address, first line'],
  ['client_address_line_2', 'Our client\'s address, second line'],
  ['client_town', 'Our client\'s town'],
  ['client_county', 'Our client\'s county'],
  ['client_postcode', 'Our client\'s postcode'],
  ['client_vat_status', 'Whether our client is VAT registered: "VAT Registered" or "Non-VAT" ONLY where stated'],
  ['driver_name', 'The driver\'s name ONLY where the driver is someone other than the client/policyholder'],
  ['driver_phone', 'The driver\'s phone number, only where the driver is not the client'],
  ['driver_email', 'The driver\'s email address, only where the driver is not the client'],
  ['insurer', 'The insurance company handling the claim (the client\'s own insurer, or the third party insurer where it is a third party instruction)'],
  ['claim_ref', 'The insurer\'s claim reference number'],
  ['policy_number', 'The policy number'],
  ['policy_excess', 'The policy excess: the amount with no currency symbol where an amount is stated, the word "waived" where the excess is waived, nil or not applicable, and an empty string where the instruction says nothing about the excess'],
  ['referrer', 'The company or person who sent us the instruction, where one is named'],
  ['referrer_ref', 'The referrer\'s own reference number for the job, where given'],
  ['tp_name', 'The OTHER DRIVER / third party involved — name, or company name where it is a business'],
  ['tp_phone', 'The third party\'s phone number'],
  ['tp_email', 'The third party\'s email address'],
  ['tp_address_line_1', 'The third party\'s address, first line'],
  ['tp_address_line_2', 'The third party\'s address, second line'],
  ['tp_town', 'The third party\'s town'],
  ['tp_county', 'The third party\'s county'],
  ['tp_postcode', 'The third party\'s postcode'],
  ['tp_reg', 'The registration of the third party\'s vehicle'],
  ['tp_make_model', 'Make and model of the third party\'s vehicle'],
  ['tp_insurer', 'The third party\'s insurance company'],
  ['tp_claim_ref', 'The third party insurer\'s claim reference number'],
  ['tp_policy_number', 'The third party\'s policy number'],
  ['tp_vehicle_damage', 'The damage to the third party\'s vehicle, where described'],
];

const CLAIM_TYPES = [
  'Fault Claim',
  'Non-Fault - Own Insurer',
  '3rd Party Insurer Direct',
  '3rd Party Paying Privately',
  'Credit Repair',
  'Glass Claim',
  'Paying Privately',
];

const META = ['suggested_claim_type', 'claim_type_reason', 'damage_draft'];

const stringMap = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, { type: 'string' }]));

function buildSchema(keys: string[]) {
  const properties: Record<string, any> = {
    readable: {
      type: 'boolean',
      description: 'True if the instruction could be read. False only if none of the files can be read at all and there is no usable pasted text.',
    },
  };
  for (const [key, description] of READ_FIELDS) {
    properties[key] = { type: 'string', description };
  }
  properties.suggested_claim_type = {
    type: 'string',
    description: `Your suggestion for the claim type, exactly one of: ${CLAIM_TYPES.join(', ')}. Base it on the circumstances and who is paying.`,
  };
  properties.claim_type_reason = {
    type: 'string',
    description: 'One short line saying why that claim type fits, referring to what the instruction says.',
  };
  properties.damage_draft = {
    type: 'string',
    description: 'A short draft damage description written from the damage photographs, where photos were supplied and the instruction does not already describe the damage. Empty otherwise.',
  };
  properties._confidence = {
    type: 'object',
    description: 'How certain you are of each value: "high", "medium" or "low". Use "low" for anything blurred, cut off, ambiguous, worked out, or where two sources disagree.',
    properties: stringMap(keys),
  };
  properties._source_snippets = {
    type: 'object',
    description: 'For each value, the text from the document where you found it, about 10 to 30 words either side. Empty string where you could not find it.',
    properties: stringMap(keys),
  };
  properties._source_files = {
    type: 'object',
    description: 'For each value, the name of the file it was found in (as listed below), or "pasted text" where it came from the text the user pasted, or an empty string where you could not find it.',
    properties: stringMap(keys),
  };
  return { type: 'object', properties };
}

function buildPrompt(fileNames: string[], hasPastedText: boolean) {
  const sources: string[] = [];
  if (fileNames.length) {
    sources.push(`The files attached, which are:\n${fileNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`);
  }
  if (hasPastedText) {
    sources.push('The text of the instruction email, pasted below the file listing.');
  }
  const keys = [...READ_FIELDS.map(([k]) => k), ...META];

  return `You are reading the instruction for a new vehicle repair claim and turning it into one set of claim details.

Read everything below TOGETHER as a single instruction:
${sources.map((s) => `- ${s}`).join('\n')}

Return:
${READ_FIELDS.map(([key, description]) => `- ${key}: ${description}`).join('\n')}
- suggested_claim_type: your suggestion from exactly one of ${CLAIM_TYPES.join(' / ')}, with a one line reason in claim_type_reason
- damage_draft: a short draft damage description written from the damage photographs, where photos are supplied and no damage is described in writing

Rules:
- Read every source. The same claim detail may be split across several of them — take each value from wherever it actually appears.
- Only return what the source actually states. Use an empty string for anything that is not there. Never invent, complete, assume or tidy up a value.
- Where the same detail appears more than once, use the clearest and most complete version. Where two sources disagree, prefer the claim form or the insurer's own instruction and mark that value "low".
- Dates are UK format, day first: 03/04/2026 is 3 April 2026. Return dates as YYYY-MM-DD and times as HH:MM (24 hour).
- The excess: return the amount as printed with no currency symbol, or the word "waived" where the instruction says the excess is waived, nil or not applicable, and an empty string where the instruction says nothing at all about the excess. Never return 0 or "waived" unless that is what the instruction says.
- The third party fields are for the OTHER party involved, never for our client.
- driver_name, driver_phone and driver_email only where the driver is someone other than the client/policyholder. Leave them empty where the driver is the client.
- For every value give a confidence of "high", "medium" or "low", the snippet of text where you found it, and the source file you found it in ("pasted text" for anything taken from the pasted email).
- Set readable to false only if nothing can be read at all.

Values to return: ${keys.join(', ')}.`;
}

function normalise(value: any) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fileUrls: string[] = (Array.isArray(body?.file_urls) ? body.file_urls : [])
      .filter((u: any) => typeof u === 'string' && u.trim())
      .slice(0, 12);
    const pastedText = String(body?.pasted_text || '').slice(0, 20000);

    if (!fileUrls.length && !pastedText.trim()) {
      return Response.json({ error: 'Add at least one file, or paste the text of the instruction email.' }, { status: 400 });
    }

    const fileNames = fileUrls.map((url) => {
      try {
        return decodeURIComponent(String(url).split('?')[0].split('/').pop() || 'document');
      } catch {
        return 'document';
      }
    });

    const keys = READ_FIELDS.map(([k]) => k);
    const prompt = pastedText.trim()
      ? `${buildPrompt(fileNames, true)}\n\nText of the instruction email:\n---\n${pastedText}\n---`
      : buildPrompt(fileNames, false);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      ...(fileUrls.length ? { file_urls: fileUrls } : {}),
      response_json_schema: buildSchema(keys),
    });

    const readable = result?.readable !== false;
    const raw = readable ? (result || {}) : {};

    const fields: Record<string, any> = {};
    for (const key of [...keys, ...META]) {
      const value = raw[key];
      fields[key] = value === null || value === undefined ? '' : (typeof value === 'number' ? String(value) : String(value).trim());
    }

    const confidence: Record<string, string> = {};
    const snippets: Record<string, string> = {};
    const sources: Record<string, string> = {};
    for (const key of keys) {
      const level = raw?._confidence?.[key];
      confidence[key] = level ? String(level).toLowerCase() : (fields[key] ? 'low' : 'missing');
      snippets[key] = String(raw?._source_snippets?.[key] || '');
      sources[key] = String(raw?._source_files?.[key] || '');
    }

    // Has this job already been set up? The registration or either reference is
    // enough to catch a claim that is already on the system.
    const reg = normalise(fields.reg);
    const claimRef = normalise(fields.claim_ref);
    const tpClaimRef = normalise(fields.tp_claim_ref);
    let duplicates: any[] = [];
    if (reg || claimRef || tpClaimRef) {
      try {
        const page = await base44.entities.Claim.filter({}, {
          limit: 3000,
          fields: ['id', 'job_number', 'reg', 'claim_ref', 'tp_claim_ref', 'client_name', 'archived'],
        });
        const claims = page?.items || [];
        const seen = new Set<string>();
        for (const claim of claims) {
          const reasons: string[] = [];
          if (reg && normalise(claim.reg) === reg) reasons.push('the same registration');
          if (claimRef && normalise(claim.claim_ref) === claimRef) reasons.push('the same claim reference');
          if (tpClaimRef && normalise(claim.tp_claim_ref) === tpClaimRef) reasons.push('the same third party claim reference');
          if (reasons.length && !seen.has(claim.id)) {
            seen.add(claim.id);
            duplicates.push({
              id: claim.id,
              job_number: claim.job_number || '',
              reg: claim.reg || '',
              client_name: claim.client_name || '',
              archived: claim.archived === true,
              reasons,
            });
          }
        }
        duplicates = duplicates.slice(0, 5);
      } catch (e) {
        console.error('Duplicate check failed', e);
      }
    }

    return Response.json({
      readable,
      fields,
      confidence,
      snippets,
      sources,
      suggestions: {
        claim_type: fields.suggested_claim_type || '',
        claim_type_reason: fields.claim_type_reason || '',
        damage_draft: fields.damage_draft || '',
      },
      duplicates,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'The instruction could not be read.' }, { status: 500 });
  }
}