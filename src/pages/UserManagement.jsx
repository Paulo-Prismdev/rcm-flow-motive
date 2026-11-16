import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Shield, Edit2, X, Check } from "lucide-react";
import InviteUserModal from "../components/usermgmt/InviteUserModal";
import { isClientTagged } from "@/components/shared/directoryTags";
import { updateUserName } from "@/functions/updateUserName";

const USER_TYPES = ["internal", "bodyshop", "referrer", "supplier", "client"];
const ROLES = ["user", "admin"];

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [filterType, setFilterType] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("full_name", 500),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("name"),
  });

  const { data: referrerCompanies = [] } = useQuery({
    queryKey: ["companies", "referrer"],
    queryFn: () => base44.entities.Company.filter({ company_type: "referrer", is_active: true }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("name"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingId(null);
    },
  });

  const isAdmin = (currentUser?.user_type === 'internal' && ["admin", "super_admin", "company_admin"].includes(currentUser?.role));

  const filteredUsers = useMemo(() => {
    if (filterType === "all") return users;
    return users.filter((u) => u.user_type === filterType);
  }, [users, filterType]);

  const typeCounts = useMemo(() => {
    const counts = { all: users.length };
    USER_TYPES.forEach((t) => {
      counts[t] = users.filter((u) => u.user_type === t).length;
    });
    return counts;
  }, [users]);

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="w-10 h-10 mx-auto mb-3 text-danger-fg" />
        <p className="font-semibold text-foreground">Access Denied</p>
      </div>
    );
  }

  // display_name is a custom field stored in user data; full_name is read-only from the platform
  const getDisplayName = (user) => user.display_name || user.full_name || "";

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditData({
      display_name: getDisplayName(user),
      user_type: user.user_type || "internal",
      role: user.role || "user",
      company_id: user.company_id || "",
    });
  };

  const saveEdit = async (userId) => {
    const { display_name, ...rest } = editData;
    const originalUser = users.find(u => u.id === userId);
    if (display_name !== getDisplayName(originalUser)) {
      await updateUserName({ user_id: userId, full_name: display_name });
    }
    updateMutation.mutate({ id: userId, data: rest });
  };

  const getCompanyName = (user) => {
    if (!user.company_id) return "—";
    if (user.user_type === "client") return clients.find(c => c.id === user.company_id)?.name || "—";
    return companies.find((c) => c.id === user.company_id)?.name || "—";
  };

  return (
    <div className="h-full flex flex-col space-y-3">
      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            setShowInvite(false);
            queryClient.invalidateQueries({ queryKey: ["users"] });
          }}
          isSuperAdmin={isAdmin}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">User Management</h1>
          <p className="text-xs text-muted-foreground">{users.length} users total</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#131d47] text-white text-sm rounded-lg hover:bg-[#1a2660] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {[{ id: "all", label: "All" }, ...USER_TYPES.map((t) => ({ id: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              filterType === tab.id
                ? "bg-[#131d47] text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1 py-0.5 rounded-full font-semibold ${filterType === tab.id ? "bg-white/20" : "bg-accent"}`}>
              {typeCounts[tab.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0 bg-card rounded-lg border border-border">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Role</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Company</th>
                <th className="px-4 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => {
                const isEditing = editingId === user.id;
                return (
                  <tr key={user.id} className={`hover:bg-muted transition-colors ${isEditing ? "bg-info-bg" : ""}`}>
                    <td className="px-4 py-2.5">
                     <div className="flex items-center gap-2">
                       <div className="w-7 h-7 rounded-full bg-[#131d47]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#131d47] dark:text-white dark:bg-white/10">
                         {(getDisplayName(user) || user.email)?.[0]?.toUpperCase()}
                       </div>
                       {isEditing ? (
                         <input
                           type="text"
                           value={editData.display_name}
                           onChange={(e) => setEditData((p) => ({ ...p, display_name: e.target.value }))}
                           placeholder="Display name"
                           className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground w-32"
                         />
                       ) : (
                         <span className="font-medium text-foreground truncate">{getDisplayName(user) || "—"}</span>
                       )}
                     </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-xs">{user.email}</td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <select
                          value={editData.user_type}
                          onChange={(e) => setEditData((p) => ({ ...p, user_type: e.target.value }))}
                          className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground"
                          >
                          {USER_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-foreground">{user.user_type || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <select
                          value={editData.role}
                          onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))}
                          className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground"
                          >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${user.role === "admin" ? "bg-danger-bg text-danger-fg" : "bg-muted text-foreground"}`}>
                          {user.role || "user"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {isEditing ? (
                        <select
                           value={editData.company_id}
                           onChange={(e) => setEditData((p) => ({ ...p, company_id: e.target.value }))}
                           className="text-xs border border-border rounded px-2 py-1 bg-card text-foreground"
                         >
                           <option value="">— None —</option>
                           {editData.user_type === "referrer" ? (
                             referrerCompanies.map((c) => (
                               <option key={c.id} value={c.id}>{c.name}</option>
                             ))
                           ) : editData.user_type === "client" ? (
                             clients.filter(isClientTagged).map((c) => (
                               <option key={c.id} value={c.id}>{c.name}</option>
                             ))
                           ) : (
                             companies.map((c) => (
                               <option key={c.id} value={c.id}>{c.name} ({c.company_type})</option>
                             ))
                           )}
                         </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">{getCompanyName(user)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(user.id)}
                              disabled={updateMutation.isPending}
                              className="p-1 text-success-fg hover:bg-success-bg rounded transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1 text-muted-foreground hover:text-info-fg hover:bg-info-bg rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}