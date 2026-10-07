import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, UserCog, Link2, Mail, UserPlus, X } from "lucide-react";

/**
 * Shows every portal user linked to this referrer company and lets an admin
 * pick which contact (by email) each user represents. Auto-suggests when the
 * user's login email matches a contact email. Also lets the admin invite a
 * new user directly to this referrer, or attach an existing unlinked user.
 */
export default function ReferrerLinkedUsers({ companyId, contacts, companyName }) {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showLinkExisting, setShowLinkExisting] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["referrer-users", companyId],
    queryFn: () => base44.entities.User.filter({ linked_referrer_id: companyId }),
    enabled: !!companyId,
  });

  // Existing referrer-type users not yet linked to any company
  const { data: unlinkedUsers = [] } = useQuery({
    queryKey: ["unlinked-referrer-users"],
    queryFn: () => base44.entities.User.filter({ user_type: "referrer" }),
    enabled: !!companyId && showLinkExisting,
  });

  const contactEmails = useMemo(
    () => (contacts || []).map((c) => c.email).filter(Boolean),
    [contacts]
  );

  const linkMutation = useMutation({
    mutationFn: ({ userId, email }) =>
      base44.entities.User.update(userId, { linked_contact_email: email || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrer-users", companyId] });
      toast.success("User contact link updated");
    },
    onError: (err) => toast.error("Could not update link: " + (err.message || "Unknown error")),
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email }) => {
      const created = await base44.users.inviteUser(email, "user");
      // Attach to this referrer + set type
      await base44.entities.User.update(created.id, {
        linked_referrer_id: companyId,
        user_type: "referrer",
      });
      // Auto-match contact if email matches
      const match = contactEmails.find((e) => e.toLowerCase() === email.toLowerCase());
      if (match) await base44.entities.User.update(created.id, { linked_contact_email: match });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrer-users", companyId] });
      toast.success("Invitation sent and user linked to this referrer");
      setInviteEmail("");
      setShowInvite(false);
    },
    onError: (err) => toast.error("Could not invite: " + (err.message || "Unknown error")),
  });

  const attachMutation = useMutation({
    mutationFn: ({ userId, email }) =>
      base44.entities.User.update(userId, { linked_referrer_id: companyId, linked_contact_email: email || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrer-users", companyId] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-referrer-users"] });
      toast.success("User linked to this referrer");
    },
    onError: (err) => toast.error("Could not link user: " + (err.message || "Unknown error")),
  });

  const resolveSelected = (user) => {
    if (user.linked_contact_email) return user.linked_contact_email;
    const match = contactEmails.find((e) => e.toLowerCase() === (user.email || "").toLowerCase());
    return match || "";
  };

  const candidates = unlinkedUsers.filter((u) => !u.linked_referrer_id);

  return (
    <div className="border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Linked Portal Users
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setShowLinkExisting((v) => !v); setShowInvite(false); }}
            className="text-[11px] px-2 py-1 rounded-md border border-border bg-card hover:bg-muted flex items-center gap-1"
          >
            <UserCog className="w-3 h-3" /> Link existing
          </button>
          <button
            onClick={() => { setShowInvite((v) => !v); setShowLinkExisting(false); }}
            className="text-[11px] px-2 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" /> Invite & link
          </button>
        </div>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-lg border border-border p-2.5 bg-muted/30 mb-2">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 h-8 rounded-md border border-input bg-card px-2 text-xs"
            />
            <button
              onClick={() => inviteMutation.mutate({ email: inviteEmail })}
              disabled={!inviteEmail || inviteMutation.isPending}
              className="h-8 px-2.5 rounded-md bg-primary text-primary-foreground text-xs disabled:opacity-50"
            >
              {inviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send"}
            </button>
            <button onClick={() => setShowInvite(false)} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Sends an invite; the new user is auto-linked to {companyName || "this referrer"} and auto-matched to a contact if their email matches.</p>
        </div>
      )}

      {/* Link existing user */}
      {showLinkExisting && (
        <div className="rounded-lg border border-border p-2.5 bg-muted/30 mb-2">
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No unlinked referrer users available.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {candidates.map((u) => {
                const autoMatch = contactEmails.find((e) => e.toLowerCase() === (u.email || "").toLowerCase());
                return (
                  <div key={u.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{u.full_name || "Unnamed"}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <button
                      onClick={() => attachMutation.mutate({ userId: u.id, email: autoMatch || "" })}
                      disabled={attachMutation.isPending}
                      className="text-[11px] px-2 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-50 flex-shrink-0"
                    >
                      Link
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => setShowLinkExisting(false)} className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      {/* Linked users list */}
      {isLoading ? (
        <div className="py-3 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : users.length === 0 && !showInvite && !showLinkExisting ? (
        <p className="text-xs text-muted-foreground">No portal users linked yet. Use "Invite & link" to add one, or "Link existing" to attach an unlinked referrer user.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const selected = resolveSelected(u);
            const autoMatched = !u.linked_contact_email && selected;
            return (
              <div key={u.id} className="rounded-lg border border-border p-2.5 bg-muted/30">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.full_name || "Unnamed user"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" /> {u.email}
                    </div>
                  </div>
                  {autoMatched && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">auto</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <UserCog className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selected}
                    onChange={(e) => linkMutation.mutate({ userId: u.id, email: e.target.value })}
                    disabled={linkMutation.isPending}
                    className="flex-1 h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground disabled:opacity-50"
                  >
                    <option value="">— Not linked to a contact —</option>
                    {contactEmails.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}