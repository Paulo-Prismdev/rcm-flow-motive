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
      
      const claimsPromise = base44.entities.Claim.filter({ reg: { "$ilike": `%${debouncedSearchTerm}%` } }, '-created_date', 5);
      const estimatesPromise = base44.entities.Estimate.filter({ name: { "$ilike": `%${debouncedSearchTerm}%` } }, '-created_date', 5);
      const engineeringPromise = base44.entities.Engineering.filter({ reference: { "$ilike": `%${debouncedSearchTerm}%` } }, '-created_date', 5);
      const partsPromise = base44.entities.Part.filter({ vehicle_ref: { "$ilike": `%${debouncedSearchTerm}%` } }, '-created_date', 5);

      const [claims, estimates, engineering, parts] = await Promise.all([claimsPromise, estimatesPromise, engineeringPromise, partsPromise]);

      return [
        ...claims.map(item => ({ ...item, type: 'Claims', display: formatUKRegistration(item.reg), link: createPageUrl(`Claims?view=${item.id}`) })),
        ...estimates.map(item => ({ ...item, type: 'Estimating', display: item.name, link: createPageUrl(`Estimating?view=${item.id}`) })),
        ...engineering.map(item => ({ ...item, type: 'Engineering', display: item.reference, link: createPageUrl(`Engineering?view=${item.id}`) })),
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