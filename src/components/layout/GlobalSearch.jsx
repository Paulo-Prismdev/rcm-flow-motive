import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader, Search, FileText, Calculator, Wrench, Package } from 'lucide-react';
import { formatUKRegistration } from '../shared/formatRegistration';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const iconMap = {
  Claims: FileText,
  Estimating: Calculator,
  Engineering: Wrench,
  Parts: Package,
};

export default function GlobalSearch({ open, onOpenChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['globalSearch', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return [];
      
      const term = debouncedSearchTerm.toLowerCase();
      const claimsPromise = base44.entities.Claim.filter({ reg: { "$contains": term } }, '-created_date', 20);
      const estimatesPromise = base44.entities.Estimate.filter({ name: { "$contains": term } }, '-created_date', 20);
      const engineeringPromise = base44.entities.Engineering.filter({ reference: { "$contains": term } }, '-created_date', 20);
      const partsPromise = base44.entities.Part.filter({ vehicle_ref: { "$contains": term } }, '-created_date', 20);

      const claimsClientPromise = base44.entities.Claim.filter({ client_name: { "$contains": term } }, '-created_date', 20);
      const claimsJobPromise = base44.entities.Claim.filter({ job_number: { "$contains": term } }, '-created_date', 20);

      const [claims, estimatesRaw, engineering, parts, claimsByClient, claimsByJob] = await Promise.all([
        claimsPromise, estimatesPromise, engineeringPromise, partsPromise, claimsClientPromise, claimsJobPromise
      ]);

      // Deduplicate claims by id
      const allClaimsMap = new Map();
      [...claims, ...claimsByClient, ...claimsByJob].forEach(c => allClaimsMap.set(c.id, c));
      const allClaims = Array.from(allClaimsMap.values()).slice(0, 10);

      return [
        ...allClaims.map(item => ({ ...item, type: 'Claims', display: `${formatUKRegistration(item.reg)} — ${item.client_name || ''}`, link: createPageUrl(`Claims?id=${item.id}`) })),
        ...estimatesRaw.map(item => ({ ...item, type: 'Estimating', display: item.name || item.job_number, link: createPageUrl(`Estimating?view=${item.id}`) })),
        ...engineering.map(item => ({ ...item, type: 'Engineering', display: item.reference || item.job_number, link: createPageUrl(`Engineering?view=${item.id}`) })),
        ...parts.map(item => ({ ...item, type: 'Parts', display: formatUKRegistration(item.vehicle_ref), link: createPageUrl(`Parts?view=${item.id}`) })),
      ];
    },
    enabled: debouncedSearchTerm.length > 1,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#131d47] border border-white/10 p-6 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Search className="w-5 h-5" /> Global Search
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search by Claim Reg, Estimate Name, etc..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="mt-4 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white/40"
        />
        <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading && <div className="flex justify-center p-4"><Loader className="animate-spin text-white/60" /></div>}
          {!isLoading && data && data.length === 0 && debouncedSearchTerm.length > 1 && (
            <p className="text-center text-white/50 py-4">No results found.</p>
          )}
          {!isLoading && data && data.map(item => {
            const Icon = iconMap[item.type];
            return (
              <Link to={item.link} key={item.id} onClick={() => onOpenChange(false)} className="block">
                <div className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-lg flex items-center gap-4">
                  {Icon && <Icon className="w-5 h-5 text-white/70" />}
                  <div>
                    <p className="font-bold text-white">{item.display}</p>
                    <p className="text-sm text-white/50">{item.type}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}