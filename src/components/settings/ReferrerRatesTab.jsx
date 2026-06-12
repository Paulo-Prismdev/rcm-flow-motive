import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Save, X, Percent } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ReferrerRatesTab() {
  const queryClient = useQueryClient();
  const [editingReferrer, setEditingReferrer] = useState(null);
  const [formData, setFormData] = useState({ default_percent_to_referrer: '', default_repairer_referral_fee: '' });

  const { data: referrers = [], isLoading } = useQuery({
    queryKey: ['referrers'],
    queryFn: () => base44.entities.Referrer.list('name'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Referrer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrers'] });
      setEditingReferrer(null);
    },
  });

  const openEdit = (referrer) => {
    setEditingReferrer(referrer);
    setFormData({
      default_percent_to_referrer: referrer.default_percent_to_referrer ?? '',
      default_repairer_referral_fee: referrer.default_repairer_referral_fee ?? '',
    });
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: editingReferrer.id,
      data: {
        default_percent_to_referrer: formData.default_percent_to_referrer !== '' ? parseFloat(formData.default_percent_to_referrer) : null,
        default_repairer_referral_fee: formData.default_repairer_referral_fee !== '' ? parseFloat(formData.default_repairer_referral_fee) : null,
      }
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Referrer Rates</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Set default fee rates per referrer. These auto-populate when a referrer is selected on a claim.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-sm text-gray-400">Loading...</div>
      ) : referrers.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">No referrers found</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Referrer</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">% to Referrer</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Repairer Fee %</span>
            <span />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {referrers.map((referrer) => (
              <div key={referrer.id} className="grid grid-cols-[1fr_120px_120px_40px] gap-2 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{referrer.name}</div>
                  {referrer.email && <div className="text-xs text-gray-400">{referrer.email}</div>}
                </div>
                <div className="text-center">
                  {referrer.default_percent_to_referrer != null ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {referrer.default_percent_to_referrer}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                  )}
                </div>
                <div className="text-center">
                  {referrer.default_repairer_referral_fee != null ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {referrer.default_repairer_referral_fee}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => openEdit(referrer)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white rounded transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingReferrer} onOpenChange={(open) => !open && setEditingReferrer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Rates — {editingReferrer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                % to Referrer
              </label>
              <p className="text-xs text-gray-500 mb-2">Fee percentage owed to this referrer per claim (e.g. 5 for 5%)</p>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.default_percent_to_referrer}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_percent_to_referrer: e.target.value }))}
                  placeholder="e.g. 5"
                  className="pr-8"
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Repairer Referral Fee %
              </label>
              <p className="text-xs text-gray-500 mb-2">Default repairer referral fee for jobs from this referrer (e.g. 20 for 20%)</p>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.default_repairer_referral_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_repairer_referral_fee: e.target.value }))}
                  placeholder="e.g. 20"
                  className="pr-8"
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingReferrer(null)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Rates'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}