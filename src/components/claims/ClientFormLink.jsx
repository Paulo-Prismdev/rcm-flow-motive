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
    <div className="neomorph-flat p-5 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Send Form to Client</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Share this link with your client so they can fill in the claim details and sign a Statement of Truth themselves. It will automatically create the claim and generate the signed PDF.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={formUrl}
          className="flex-1 text-xs px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-500 truncate"
        />
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-blue-300 bg-white text-blue-600 hover:bg-blue-50 whitespace-nowrap transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}