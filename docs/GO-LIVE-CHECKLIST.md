# Flowmotive hardening – go-live checklist

Everything from the hardening rounds that has to happen at the end. Nothing below is live until it is done.
Keep this list up to date at the end of every round.

## Before go-live night (Paul)
- [ ] Turn off Google sign-in in the Base44 auth settings (sign-in is email + password only now).
- [ ] Set your own password via "Forgot password?" on the new sign-in page (and make sure Anthony does too).
- [ ] Resend (optional, but recommended): sign up, add a sending domain (suggested `mail.rcmautomotive.co.uk`), add its DNS records, then set the Base44 secrets `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` (and optionally `EMAIL_REPLY_TO`). Until set, email keeps going through Base44.
- [ ] Check `PUBLIC_LINK_SIGNING_KEY` and `APP_PUBLIC_URL` secrets are set.
- [ ] Give these claims a claim type (Round 7 makes it required when the full edit form is saved): CLM-0116, CLM-0086, CLM-0076, CLM-0070 have none; CLM-0049 and CLM-0012 have the old "3rd Party Direct" (probably "3rd Party Insurer Direct").

## Go-live night (after office hours, in this order)
1. [ ] Publish the app in Base44.
2. [ ] Apply the staged access rules: `node scripts/apply-access-rules.mjs base44/access-rules/round2-access-rules.json` (dry run first with `--dry-run`), then checkpoint. Must come AFTER publish, or the old screens' activity lines will quietly fail.
3. [ ] Remove the old `PUBLIC_FORM_SECRET` secret.

## Go-live night – testing
- [ ] Sign in: password, emailed 6-digit code, Face ID / fingerprint enrol + sign-in on phone and tablet.
- [ ] Check `updateMe({ twofa_verified: true })` is refused from the browser.
- [ ] Each portal (client, referrer, repairer): sees only its own claims, no internal statuses, files open.
- [ ] Public links (bodyshop update, back-ordered parts, indemnity, repair preference, declaration of need, client claim form, parts request) open and submit; expired links show the expiry message.
- [ ] Private files open from claims, notes and portals.
- [ ] Audit log: an edit, a deletion and a sign-in each show the right person's name; the log can't be edited or deleted.
- [ ] Financials: record an invoice and an authority; mark paid; a failed save shows a message and leaves no history line.
- [ ] New claim wizard: Next/Create with the registration, claim type or client name missing shows the message under the field; a bad email is caught. Edit form shows the list at the top.
- [ ] Confirm boxes (archive, delete claim, delete note/update/task, remove link, unsaved changes) appear in the app's own style and Cancel does nothing.
- [ ] Email: send an invoice request with a CC – check CC, Reply-To and sender name (and that it arrives at all on Base44 email if Resend isn't set up).

## Deferred to after go-live
- [ ] Split the large Financials file (`ClaimFinancials.jsx`) – maintenance only, needs live testing.
- [ ] One-off move of older public documents to private storage (offered, not done).
- [ ] Make generated PDFs private (ties in with the Resend move – attach instead of link).
- [ ] Directory record edits (not just deletions) in the audit log – planned for Round 9.
- [ ] User hierarchy and permissions build (separate job).

## Open questions for Paul
- [ ] Should the total-loss storage fee invoice carry VAT?
- [ ] Optional "Customer pays" row on the VAT & excess summary – wanted?
