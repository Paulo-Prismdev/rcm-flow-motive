import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { X, Building2, User, Link2, UserPlus } from "lucide-react";

// Shown when a claim is saved with a client that isn't linked to the directory
// but a likely match already exists — link to it, or create a new record.
export default function ClientLinkPrompt({ isOpen, matches = [], clientName, isSaving, onLink, onCreateNew, onCancel }) {
  const [selectedId, setSelectedId] = useState(matches[0]?.id || null);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10003] p-4 pointer-events-auto" data-custom-portal-modal="true" data-mobile-full-modal="true">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold">Client already in the directory</h2>
            <p className="text-sm text-muted-foreground mt-1">
              "{clientName}" matches {matches.length === 1 ? 'an existing client' : 'existing clients'}. Link this claim to one, or save it as a new client.
            </p>
          </div>
          <Button onClick={onCancel} variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
        </div>

        <div className="space-y-2 mb-5">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selectedId === c.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {c.client_type === 'Company'
                  ? <Building2 className="w-4 h-4 text-muted-foreground" />
                  : <User className="w-4 h-4 text-muted-foreground" />}
                <span className="font-medium text-sm">{c.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {[c.phone, c.email, c.postcode].filter(Boolean).join(' · ') || 'No contact details on file'}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            className="flex-1 gap-2"
            disabled={!selectedId || isSaving}
            onClick={() => onLink(matches.find((c) => c.id === selectedId))}
          >
            <Link2 className="w-4 h-4" /> Link to this client
          </Button>
          <Button type="button" variant="outline" className="flex-1 gap-2" disabled={isSaving} onClick={onCreateNew}>
            <UserPlus className="w-4 h-4" /> Save as new client
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}