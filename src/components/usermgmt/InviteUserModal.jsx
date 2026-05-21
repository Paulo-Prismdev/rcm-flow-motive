import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Check } from "lucide-react";

export default function InviteUserModal({ onClose, onSuccess, isSuperAdmin }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Please enter an email address.");
    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim().toLowerCase(), role);
      setSuccess(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err?.message || "Failed to invite user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="neomorph w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground-muted hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Invite User</h2>
            <p className="text-xs text-foreground-muted">Send an invitation to join the platform</p>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-semibold text-foreground">Invitation sent!</p>
            <p className="text-sm text-foreground-muted">{email} will receive an invite email shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="neomorph-inset w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">System Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
              >
                <option value="user">User</option>
                {isSuperAdmin && <option value="admin">Admin</option>}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" onClick={onClose} className="flex-1 neomorph-flat text-sm">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-accent text-accent-foreground text-sm"
              >
                {loading ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}