# Flowmotive hardening – go-live checklist

Everything from the hardening rounds that has to happen at the end. Nothing below is live until it is done.
Keep this list up to date at the end of every round.

## Before go-live night (Paul)
- [x] Turn off Google (and Microsoft) sign-in in the Base44 auth settings (done 3 Nov – applies to the live app straight away).
- [ ] Make sure paul@rcmautomotive.co.uk and anthony@rcmautomotive.co.uk (the day-to-day accounts) each have a password – if either only ever used Google, set one with "Forgot password?". The googlemail account is Paul's Base44 owner/testing login.
- [x] Resend domain updates.rcmautomotive.co.uk verified (3 Nov, DNS on Wix).
- [x] Resend tested in the preview 3 Nov: sign-in code and an invoice request with CC both arrived from the new address (CC and Reply-To correct).
- [x] Create a Resend API key (Sending access, that domain only) and add it in Base44 Secrets as `RESEND_API_KEY` – after office hours (saving a secret redeploys functions). Email then goes from notifications@updates.rcmautomotive.co.uk, replies to info@rcmautomotive.co.uk unless a staff member sent it, falling back to Base44 if Resend refuses. Test in the preview: sign-in code and an invoice request with a CC; check the twofaManage / requestInvoiceFromAccounts logs say "sent via Resend".
- [ ] Check `PUBLIC_LINK_SIGNING_KEY` and `APP_PUBLIC_URL` secrets are set.
- [x] (Paul: not needed – new or cancelled claims) Give these claims a claim type (Round 7 makes it required when the full edit form is saved): CLM-0116, CLM-0086, CLM-0076, CLM-0070 have none; CLM-0049 and CLM-0012 have the old "3rd Party Direct" (probably "3rd Party Insurer Direct").

## Go-live night (after office hours, in this order)
1. [x] Publish the app in Base44 (3 Nov, 11:38).
2. [x] (3 Nov, 11:39) Apply the staged access rules: `node scripts/apply-access-rules.mjs base44/access-rules/round2-access-rules.json` (dry run first with `--dry-run`), then checkpoint. Must come AFTER publish, or the old screens' activity lines will quietly fail.
3. [x] Remove the old `PUBLIC_FORM_SECRET` secret (3 Nov).

## Go-live night – testing
(3 Nov: Paul ran the live checks – sign-in, claims, portal, repair link, invoice email – all good. Resend confirmed: chaser to a repairer, repair-update alerts, invoice request and sign-in codes all delivered.)
- [ ] Sign in: password, emailed 6-digit code, Face ID / fingerprint enrol + sign-in on phone and tablet.
- [ ] Check `updateMe({ twofa_verified: true })` is refused from the browser.
- [ ] Each portal (client, referrer, repairer): sees only its own claims, journey status only (no secondary/tertiary anywhere, including the update feed and timeline), files open.
- [ ] Portal update feeds: client sees status changes, client communications and general updates; referrer also sees referrer communications; repairer sees status changes, repairer communications since they were instructed, and parts. Insurer and credit repair communications stay internal.
- [ ] Repairer portal: no third party contact details, referrer or broker; TP insurer and claim ref still there for invoicing.
- [ ] Public links (bodyshop update, back-ordered parts, indemnity, repair preference, declaration of need, client claim form, parts request) open and submit; expired links show the expiry message.
- [ ] Private files open from claims, notes and portals.
- [ ] Audit log: an edit, a deletion and a sign-in each show the right person's name; the log can't be edited or deleted.
- [ ] Financials: record an invoice and an authority; mark paid; a failed save shows a message and leaves no history line.
- [ ] New claim wizard: Next/Create with the registration, claim type or client name missing shows the message under the field; a bad email is caught. Edit form shows the list at the top.
- [ ] Confirm boxes (archive, delete claim, delete note/update/task, remove link, unsaved changes) appear in the app's own style and Cancel does nothing.
- [ ] Directory: edit a client, repairer, insurer and supplier – "Change history" on the record shows who changed which field. Adding a record logs "Added …".
- [ ] Settings: a non-admin staff member (e.g. info@rcmltd.co.uk) can't change portal adverts/products, chaser rules or invoicing settings; admins can.
- [ ] Pop-ups app-wide (settings, directories, parts, estimates, engineering, users) now use the app's own boxes and corner messages.
- [ ] Keyboard: Tab through the claims list and a portal list – each row shows a ring and Enter opens it; Escape closes the directory record, the image viewer and the add-repairer panel.
- [ ] Grey secondary text (e.g. the lines under each Financials row) is a touch darker – check it still looks right.
- [ ] Email: repeat the invoice-request-with-CC test on the live app after publishing (passed in the preview on 3 Nov).
- [x] Delete the old unused "Onboarding" API key in Resend (3 Nov).
- [ ] Branding: the browser tab shows the navy RCM icon (not the Base44 logo); "Add to Home Screen" on Anthony's phone/tablet shows the RCM icon named "RCM Flowmotive"; Base44's own sign-in/invite emails say "RCM Flowmotive" not "ARTECH One".
- [ ] Check nothing you use has gone: Round 11 removed 20 unused components and two dead pages (Part Manufacturer Config, Migrate Users). Everything is in the "Before Round 11" checkpoint if anything needs bringing back.

## Deferred to after go-live
- [ ] Split the large Financials file (`ClaimFinancials.jsx`) – maintenance only, needs live testing.
- [ ] One-off move of older public documents to private storage (offered, not done).
- [ ] Make generated PDFs private (ties in with the Resend move – attach instead of link).
- [ ] User hierarchy and permissions build (separate job). Note: any internal staff member can currently edit Role records (feature permissions) – tighten in that job.

## Open questions for Paul
- [ ] The Base44 web address is still `artech-flow.base44.app` (Face ID works on it and on app.rcmautomotive.co.uk). Renaming it in Base44 would break Face ID registered on the old address – leave it, or rename and re-register?
- [ ] Mac look drift (Round 10 report): about 35 screens still use the older hard-coded greys and white with no dark-mode colours – worst are the Parts form, the Edit Claim form, the vehicle form and the public customer forms. Do a visual-only pass after go-live?
- [ ] Confirm the portal update-feed rules above (Round 8 default) – easy to change in `base44/shared/portalAccess.ts`.
- [ ] Should the total-loss storage fee invoice carry VAT?
- [ ] Optional "Customer pays" row on the VAT & excess summary – wanted?
