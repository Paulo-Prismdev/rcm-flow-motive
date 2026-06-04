import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Shield, Edit2, X, Check } from "lucide-react";
import InviteUserModal from "../components/usermgmt/InviteUserModal";

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingId(null);
    },
  });

  const isAdmin = ["admin", "super_admin", "company_admin"].includes(currentUser?.role);

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
        <Shield className="w-10 h-10 mx-auto mb-3 text-red-500" />
        <p className="font-semibold text-gray-900 dark:text-white">Access Denied</p>
      </div>
    );
  }

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditData({
      user_type: user.user_type || "internal",
      role: user.role || "user",
      company_id: user.company_id || "",
    });
  };

  const saveEdit = (userId) => {
    updateMutation.mutate({ id: userId, data: editData });
  };

  const getCompanyName = (companyId) =>
    companies.find((c) => c.id === companyId)?.name || "—";

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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{users.length} users total</p>
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
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1 py-0.5 rounded-full font-semibold ${filterType === tab.id ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"}`}>
              {typeCounts[tab.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">Email</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Role</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden lg:table-cell">Company</th>
                <th className="px-4 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredUsers.map((user) => {
                const isEditing = editingId === user.id;
                return (
                  <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isEditing ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#131d47]/10 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-[#131d47] dark:text-white dark:bg-white/10">
                          {(user.full_name || user.email)?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white truncate">{user.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 hidden md:table-cell text-xs">{user.email}</td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <select
                          value={editData.user_type}
                          onChange={(e) => setEditData((p) => ({ ...p, user_type: e.target.value }))}
                          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:text-white"
                        >
                          {USER_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{user.user_type || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <select
                          value={editData.role}
                          onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))}
                          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:text-white"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${user.role === "admin" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>
                          {user.role || "user"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {isEditing ? (
                        <select
                           value={editData.company_id}
                           onChange={(e) => setEditData((p) => ({ ...p, company_id: e.target.value }))}
                           className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:text-white"
                         >
                           <option value="">— None —</option>
                           {user.user_type === "referrer" ? (
                             referrerCompanies.map((c) => (
                               <option key={c.id} value={c.id}>{c.name}</option>
                             ))
                           ) : (
                             companies.map((c) => (
                               <option key={c.id} value={c.id}>{c.name} ({c.company_type})</option>
                             ))
                           )}
                         </select>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{user.company_id ? getCompanyName(user.company_id) : "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(user.id)}
                              disabled={updateMutation.isPending}
                              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
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