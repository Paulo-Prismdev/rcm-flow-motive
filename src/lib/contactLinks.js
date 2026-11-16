// Phone and WhatsApp links for the Call / WhatsApp buttons.
//
// Calls use a plain tel: link, so the phone's default calling app takes them
// (set Virtual Landline as the default calling app to place work calls from it).
//
// WhatsApp opens WhatsApp Business on Android: the link names the Business app
// (com.whatsapp.w4b) and falls back to the normal wa.me link if it isn't
// installed. iPhones can't be pointed at one app from a link, so they get wa.me
// and iOS opens whichever WhatsApp is installed (offering Business if both are).

export const isAndroid = () =>
  typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

// UK numbers to international digits: 07700 900188 -> 447700900188.
export function internationalDigits(number) {
  let d = String(number || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `44${d.slice(1)}`;
  return d;
}

export function telHref(number) {
  const n = String(number || '').replace(/[^\d+]/g, '');
  return n ? `tel:${n}` : undefined;
}

export function whatsappHref(number) {
  const d = internationalDigits(number);
  if (!d) return undefined;
  const web = `https://wa.me/${d}`;
  if (isAndroid()) {
    return `intent://send/?phone=${d}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${encodeURIComponent(web)};end`;
  }
  return web;
}
