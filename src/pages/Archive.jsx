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
    <div className="space-y-4 lg:space-y-6">
      <div className="neomorph p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div>
            <h1 className="text-lg lg:text-2xl font-bold text-gray-700 flex items-center gap-2 lg:gap-3">
              <ArchiveIcon className="w-5 h-5 lg:w-7 lg:h-7 text-gray-600" />
              Archive
            </h1>
            <p className="text-sm text-gray-500 mt-1">{allArchived.length} archived items</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search archived items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neomorph-inset px-3 py-2 text-gray-700 border-0 focus:ring-0"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="neomorph-inset px-3 py-2 text-gray-700 border-0 rounded-xl text-sm"
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
              <div key={`${item.department}-${item.id}`} className="neomorph card-hover p-4 lg:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 lg:gap-4 mb-2 lg:mb-3 flex-wrap">
                      <div className="neomorph-flat p-2 flex-shrink-0">
                        <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm lg:text-lg font-bold text-gray-700 truncate">{item.displayName}</h3>
                        <p className="text-xs text-gray-500">{item.department}</p>
                      </div>
                      <StatusBadge status={item.job_status || item.status || item.sourcing_status || 'N/A'} />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 text-sm mt-2 lg:mt-4">
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
                  <div className="flex flex-col sm:flex-row gap-2 ml-2 flex-shrink-0">
                    <Button
                      onClick={() => handleUnarchive(item)}
                      size="sm"
                      className="neomorph-flat px-3 py-2 transition-all active:neomorph-pressed flex items-center gap-1.5 text-green-600 text-xs"
                      disabled={unarchiveMutation.isLoading}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </Button>
                    <Link to={item.link}>
                      <Button size="sm" className="neomorph-flat px-3 py-2 transition-all active:neomorph-pressed text-gray-600 text-xs w-full">
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