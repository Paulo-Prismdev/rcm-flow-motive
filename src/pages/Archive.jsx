import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive as ArchiveIcon, RotateCcw, FileText, Calculator, Wrench, Package } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Archive() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const queryClient = useQueryClient();

  const { data: claims = [] } = useQuery({
    queryKey: ['claims'],
    queryFn: () => base44.entities.Claim.list('-updated_date'),
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ['estimates'],
    queryFn: () => base44.entities.Estimate.list('-updated_date'),
  });

  const { data: engineering = [] } = useQuery({
    queryKey: ['engineering'],
    queryFn: () => base44.entities.Engineering.list('-updated_date'),
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list('-updated_date'),
  });

  const unarchiveMutation = useMutation({
    mutationFn: async ({ id, type }) => {
      const entityMap = {
        'Claims': base44.entities.Claim,
        'Estimating': base44.entities.Estimate,
        'Engineering': base44.entities.Engineering,
        'Parts': base44.entities.Part
      };
      return entityMap[type].update(id, { archived: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      queryClient.invalidateQueries({ queryKey: ['engineering'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
  });

  // Combine all archived items
  const allArchived = [
    ...claims.filter(c => c.archived).map(c => ({ ...c, department: 'Claims', icon: FileText, color: 'text-blue-600', link: createPageUrl(`Claims?view=${c.id}`), displayName: c.reg || 'No Reg' })),
    ...estimates.filter(e => e.archived).map(e => ({ ...e, department: 'Estimating', icon: Calculator, color: 'text-green-600', link: createPageUrl(`Estimating?view=${e.id}`), displayName: e.name || 'Untitled' })),
    ...engineering.filter(e => e.archived).map(e => ({ ...e, department: 'Engineering', icon: Wrench, color: 'text-purple-600', link: createPageUrl(`Engineering?view=${e.id}`), displayName: e.reference || e.vehicle_reg || 'Untitled' })),
    ...parts.filter(p => p.archived).map(p => ({ ...p, department: 'Parts', icon: Package, color: 'text-orange-600', link: createPageUrl(`Parts?view=${p.id}`), displayName: p.vehicle_ref || 'No Ref' })),
  ].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));

  const filteredItems = allArchived.filter(item => {
    const matchesSearch = item.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.make_model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || item.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleUnarchive = (item) => {
    if (window.confirm(`Are you sure you want to restore "${item.displayName}" back to active?`)) {
      unarchiveMutation.mutate({ id: item.id, type: item.department });
    }
  };

  return (
    <div className="space-y-6">
      <div className="neomorph p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-3">
              <ArchiveIcon className="w-7 h-7 text-gray-600" />
              Archive
            </h1>
            <p className="text-sm text-gray-500 mt-1">{allArchived.length} archived items</p>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search archived items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0 focus:ring-0"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="neomorph-inset px-4 py-3 text-gray-700 border-0 rounded-xl"
          >
            <option value="all">All Departments</option>
            <option value="Claims">Claims</option>
            <option value="Estimating">Estimating</option>
            <option value="Engineering">Engineering</option>
            <option value="Parts">Parts</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="neomorph p-8 text-center text-gray-500">
            {searchTerm || filterDepartment !== "all" ? "No matching archived items found." : "No archived items yet."}
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={`${item.department}-${item.id}`} className="neomorph card-hover p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="neomorph-flat p-2">
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-700">{item.displayName}</h3>
                        <p className="text-sm text-gray-500">{item.department}</p>
                      </div>
                      <StatusBadge status={item.job_status || item.status || item.sourcing_status || 'N/A'} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                      {item.client_name && (
                        <div>
                          <p className="text-gray-500">Client</p>
                          <p className="font-medium text-gray-700">{item.client_name}</p>
                        </div>
                      )}
                      {item.make_model && (
                        <div>
                          <p className="text-gray-500">Vehicle</p>
                          <p className="font-medium text-gray-700">{item.make_model}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">Archived</p>
                        <p className="font-medium text-gray-700">
                          {item.updated_date ? format(new Date(item.updated_date), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleUnarchive(item)}
                      className="neomorph-flat px-4 py-3 transition-all active:neomorph-pressed flex items-center gap-2 text-green-600"
                      disabled={unarchiveMutation.isLoading}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </Button>
                    <Link to={item.link}>
                      <Button className="neomorph-flat px-4 py-3 transition-all active:neomorph-pressed text-gray-600">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}