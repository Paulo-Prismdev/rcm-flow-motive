import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, UserCog, Link2, Mail } from "lucide-react";

/**
 * Shows every portal user linked to this referrer company and lets an admin
 * pick which contact (by email) each user represents. Auto-suggests when the
 * user's login email matches a contact email.
 */
export default function ReferrerLinkedUsers({ companyId, contacts }) {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["referrer-users", companyId],
    queryFn: () => base44.entities.User.filter({ linked_referrer_id: companyId }),
    enabled: !!companyId,
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

  const resolveSelected = (user) => {
    if (user.linked_contact_email) return user.linked_contact_email;
    const match = contactEmails.find((e) => e.toLowerCase() === (user.email || "").toLowerCase());
    return match || "";
  };

  return (
    <div className="border-t pt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5" /> Linked Portal Users
      </p>
      {isLoading ? (
        <div className="py-3 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <p className="text-xs text-muted-foreground">No portal users are linked to this referrer yet. Invite a user and set their linked referrer to see them here.</p>
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