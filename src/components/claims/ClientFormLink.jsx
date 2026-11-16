import React, { useState } from 'react';
import { Send, Copy, Check } from 'lucide-react';

export default function ClientFormLink() {
  const [copied, setCopied] = useState(false);

  const appOrigin = window.location.hostname.includes('base44.app')
    ? `https://${window.location.hostname.replace(/^preview-sandbox--/, '')}`
    : window.location.origin;
  const formUrl = `${appOrigin}/client-claim-form`;

  const copyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="neomorph-flat p-5 bg-info-bg border-2 border-info/30">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-info flex items-center justify-center flex-shrink-0">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-foreground mb-1">Send Form to Client</h4>
          <p className="text-sm text-muted-foreground">
            Share this link with your client so they can fill in the claim details and sign a Statement of Truth themselves. It will automatically create the claim and generate the signed PDF.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={formUrl}
          className="flex-1 text-xs px-3 py-2 rounded-lg bg-card border border-border text-muted-foreground truncate"
        />
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-info/30 bg-card text-info-fg hover:bg-info-bg whitespace-nowrap transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}