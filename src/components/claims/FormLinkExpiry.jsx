import React from 'react';

/** Signing links run out this many days after they are generated (matches the server). */
export const FORM_LINK_TTL_DAYS = 14;

export function formLinkExpiresAt(generatedAt) {
  if (!generatedAt) return null;
  const t = Date.parse(generatedAt);
  return Number.isNaN(t) ? null : new Date(t + FORM_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * The line under a signing link: when it was generated and when it runs out, or that
 * it has run out and needs regenerating. Once the form is completed the link is spent
 * either way, so nothing about expiry is said.
 */
export default function FormLinkExpiry({ generatedAt, completed }) {
  const expires = formLinkExpiresAt(generatedAt);
  const expired = !expires || expires.getTime() < Date.now();
  return (
    <span>
      Generated {generatedAt ? new Date(generatedAt).toLocaleString('en-GB') : ''}
      {!completed && (expired
        ? <span className="text-red-600 dark:text-red-400"> · Expired: regenerate to send a new link</span>
        : <> · Expires {expires.toLocaleDateString('en-GB')}</>)}
    </span>
  );
}
