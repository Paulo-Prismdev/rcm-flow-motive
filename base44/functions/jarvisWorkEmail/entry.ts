// redeploy 2026-11-17 19:58
import { ImapFlow } from 'npm:imapflow@1.0.171';
import { simpleParser } from 'npm:mailparser@3.7.1';
import { jarvisAuthorised, deny } from '../../shared/jarvis.ts';

// Jarvis tool: Paul's Hostinger work inbox (paul@rcmautomotive.co.uk) over IMAP.
// Actions: check (list), read (one email), draft (save to Drafts — never sends).
// Called by the Jarvis app's email tools. Requires the x-jarvis-key header.
// Secrets: HOSTINGER_EMAIL_USER, HOSTINGER_EMAIL_PASSWORD.

const clip = (v: any, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const uk = (d: any) => d ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : null;
const addr = (a: any) => (a?.value || a || []).map?.((x: any) => x.name ? `${x.name} <${x.address}>` : x.address).join(', ') || clip(a?.text, 200);

function stripQuoted(text: string) {
  const out: string[] = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    if (/^On .{5,120} wrote:\s*$/.test(line) || /^-{2,}\s*Original Message\s*-{2,}/i.test(line) || (/^From: .+/.test(line) && out.length > 3)) break;
    if (/^\s*>/.test(line)) continue;
    out.push(line);
  }
  return out.join('\n').trim();
}

function mime(o: { from: string; to: string; subject: string; body: string; inReplyTo?: string; references?: string }) {
  const enc = (s: string) => /^[\x00-\x7F]*$/.test(s) ? s : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}?=`;
  const domain = (o.from.split('@')[1] || 'localhost').replace(/>.*/, '');
  const lines = [
    `From: ${o.from}`,
    `To: ${o.to}`,
    `Subject: ${enc(o.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
  ];
  if (o.inReplyTo) lines.push(`In-Reply-To: ${o.inReplyTo}`);
  if (o.references) lines.push(`References: ${o.references}`);
  lines.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 8bit');
  return lines.join('\r\n') + '\r\n\r\n' + o.body.replace(/\r?\n/g, '\r\n');
}

Deno.serve(async (req) => {
  if (!jarvisAuthorised(req)) return deny(req);
  const body = await req.clone().json().catch(() => ({}));
  if (body?.action === 'ping') return Response.json({ ok: true });
  const user = (Deno.env.get('HOSTINGER_EMAIL_USER') || '').trim();
  const pass = Deno.env.get('HOSTINGER_EMAIL_PASSWORD') || '';
  if (!user || !pass) return Response.json({ error: 'The work inbox is not set up yet: add HOSTINGER_EMAIL_USER and HOSTINGER_EMAIL_PASSWORD to Flowmotive secrets.' }, { status: 503 });

  const action = String(body?.action || 'check');
  const client = new ImapFlow({
    host: 'imap.hostinger.com', port: 993, secure: true,
    auth: { user, pass }, logger: false, socketTimeout: 20000,
  });

  try {
    await client.connect();
  } catch (e: any) {
    const msg = String(e?.responseText || e?.message || e);
    const authFail = /auth|login|credential|password/i.test(msg);
    return Response.json({ error: authFail ? 'Hostinger rejected the email login. Check HOSTINGER_EMAIL_USER and HOSTINGER_EMAIL_PASSWORD.' : `Could not reach the Hostinger mail server: ${clip(msg, 200)}` }, { status: authFail ? 401 : 502 });
  }

  try {
    if (action === 'check') {
      const filter = String(body.filter || 'unread');
      const limit = Math.min(10, Math.max(1, parseInt(body.limit, 10) || 8));
      const q = clip(body.query, 100);
      const lock = await client.getMailboxLock('INBOX');
      try {
        let criteria: any = { seen: false };
        if (filter === 'today') criteria = { since: new Date(Date.now() - 24 * 3600 * 1000) };
        else if (filter === 'important') criteria = { seen: false, flagged: true };
        else if (filter === 'search') criteria = q ? { or: [{ from: q }, { subject: q }, { body: q }] } : { all: true };
        const uids = ((await client.search(criteria, { uid: true })) || []) as number[];
        const pick = uids.slice(-limit).reverse();
        const emails: any[] = [];
        for (const uid of pick) {
          const msg: any = await client.fetchOne(String(uid), { envelope: true, flags: true, source: { maxLength: 6000 } } as any, { uid: true });
          let preview = '';
          try {
            const parsed: any = await simpleParser(msg.source);
            preview = clip(stripQuoted(parsed.text || ''), 200);
          } catch (_) { /* preview optional */ }
          const env = msg.envelope || {};
          const from = (env.from || [])[0] || {};
          emails.push({
            id: String(uid),
            from: clip(from.name ? `${from.name} <${from.address}>` : from.address, 120),
            subject: clip(env.subject, 150) || '(no subject)',
            received: uk(env.date),
            unread: !(msg.flags && msg.flags.has('\\Seen')),
            preview,
          });
        }
        return Response.json({ account: 'rcm', filter, count: emails.length, more_available: uids.length > pick.length, emails });
      } finally { lock.release(); }
    }

    if (action === 'read') {
      const id = String(body.id || '').replace(/\D/g, '');
      if (!id) return Response.json({ error: 'Which email? Pass the id from the email check.' }, { status: 400 });
      const lock = await client.getMailboxLock('INBOX');
      try {
        const msg: any = await client.fetchOne(id, { source: true }, { uid: true });
        if (!msg?.source) return Response.json({ error: 'That email could not be found.' }, { status: 404 });
        const p: any = await simpleParser(msg.source);
        const text = stripQuoted(p.text || '');
        return Response.json({
          account: 'rcm', id,
          from: clip(addr(p.from), 150), to: clip(addr(p.to), 200), cc: p.cc ? clip(addr(p.cc), 200) : null,
          subject: clip(p.subject, 200), received: uk(p.date),
          attachments: (p.attachments || []).length,
          body: text.slice(0, 3500), truncated: text.length > 3500,
        });
      } finally { lock.release(); }
    }

    if (action === 'draft') {
      const text = String(body.body || '').slice(0, 8000).trim();
      if (!text) return Response.json({ error: 'The draft needs a body.' }, { status: 400 });
      let to = clip(body.to, 300);
      let subject = clip(body.subject, 200);
      let inReplyTo = '';
      let references = '';
      const replyId = String(body.reply_to_id || '').replace(/\D/g, '');
      if (replyId) {
        const lock = await client.getMailboxLock('INBOX');
        try {
          const msg: any = await client.fetchOne(replyId, { source: { maxLength: 20000 } } as any, { uid: true });
          if (msg?.source) {
            const p: any = await simpleParser(msg.source);
            to = to || clip(addr(p.replyTo) || addr(p.from), 300);
            subject = subject || (/^re:/i.test(p.subject || '') ? p.subject : `Re: ${p.subject || ''}`);
            inReplyTo = p.messageId || '';
            const refs = Array.isArray(p.references) ? p.references.join(' ') : (p.references || '');
            references = [refs, inReplyTo].filter(Boolean).join(' ');
          }
        } finally { lock.release(); }
      }
      if (!to) return Response.json({ error: 'Who is it to? Give a reply_to_id or a to address.' }, { status: 400 });

      const boxes: any[] = await client.list();
      const drafts = boxes.find((b) => b.specialUse === '\\Drafts')?.path
        || boxes.find((b) => /(^|[./])drafts$/i.test(b.path))?.path || 'INBOX.Drafts';
      const raw = mime({ from: `Paul Goddard <${user}>`, to, subject: subject || '(no subject)', body: text, inReplyTo, references });
      await client.append(drafts, raw, ['\\Draft', '\\Seen']);
      return Response.json({ saved_as_draft: true, account: 'rcm', to, subject, folder: drafts, note: 'Saved in your work Drafts folder. Not sent.' });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    console.error('jarvisWorkEmail error:', e?.message);
    return Response.json({ error: `Work email failed: ${clip(e?.responseText || e?.message, 200)}` }, { status: 500 });
  } finally {
    try { await client.logout(); } catch (_) { /* ignore */ }
  }
});
