import React, { useState, useEffect, useMemo } from 'react';
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

  // Fetch all records once, filter client-side
  const { data: allClaims = [] } = useQuery({ queryKey: ['claims-search'], queryFn: () => base44.entities.Claim.list('-created_date', 5000), staleTime: 60000 });
  const { data: allEstimates = [] } = useQuery({ queryKey: ['estimates-search'], queryFn: () => base44.entities.Estimate.list('-created_date', 2000), staleTime: 60000 });
  const { data: allEngineering = [] } = useQuery({ queryKey: ['engineering-search'], queryFn: () => base44.entities.Engineering.list('-created_date', 2000), staleTime: 60000 });
  const { data: allParts = [] } = useQuery({ queryKey: ['parts-search'], queryFn: () => base44.entities.Part.list('-created_date', 2000), staleTime: 60000 });

  const isLoading = false;

  const data = useMemo(() => {
    if (debouncedSearchTerm.length < 2) return [];
    const term = debouncedSearchTerm.toLowerCase();

    const matchedClaims = allClaims.filter(c =>
      c.reg?.toLowerCase().includes(term) ||
      c.client_name?.toLowerCase().includes(term) ||
      c.job_number?.toLowerCase().includes(term) ||
      c.insurer?.toLowerCase().includes(term) ||
      c.referrer?.toLowerCase().includes(term) ||
      c.business_division?.toLowerCase().includes(term) ||
      c.driver_contact_name?.toLowerCase().includes(term)
    ).slice(0, 8).map(item => ({ ...item, type: 'Claims', display: `${formatUKRegistration(item.reg)} — ${item.client_name || ''}`, link: createPageUrl(`Claims?id=${item.id}`) }));

    const matchedEstimates = allEstimates.filter(e =>
      e.name?.toLowerCase().includes(term) ||
      e.job_number?.toLowerCase().includes(term) ||
      e.make_model?.toLowerCase().includes(term)
    ).slice(0, 5).map(item => ({ ...item, type: 'Estimating', display: item.name || item.job_number, link: createPageUrl(`Estimating?view=${item.id}`) }));

    const matchedEngineering = allEngineering.filter(e =>
      e.reference?.toLowerCase().includes(term) ||
      e.job_number?.toLowerCase().includes(term) ||
      e.vehicle_reg?.toLowerCase().includes(term) ||
      e.client_name?.toLowerCase().includes(term)
    ).slice(0, 5).map(item => ({ ...item, type: 'Engineering', display: item.reference || item.job_number, link: createPageUrl(`Engineering?view=${item.id}`) }));

    const matchedParts = allParts.filter(p =>
      p.vehicle_ref?.toLowerCase().includes(term) ||
      p.job_number?.toLowerCase().includes(term) ||
      p.part_description?.toLowerCase().includes(term)
    ).slice(0, 5).map(item => ({ ...item, type: 'Parts', display: `${formatUKRegistration(item.vehicle_ref)} — ${item.part_description || ''}`, link: createPageUrl(`Parts?view=${item.id}`) }));

    return [...matchedClaims, ...matchedEstimates, ...matchedEngineering, ...matchedParts];
  }, [debouncedSearchTerm, allClaims, allEstimates, allEngineering, allParts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#131d47] border border-white/10 p-6 text-white sm:top-[50%] top-[5%] sm:translate-y-[-50%] translate-y-0 sm:max-h-[85vh] max-h-[55vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Search className="w-5 h-5" /> Global Search
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search by Claim Reg, Estimate Name, etc..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoFocus
          className="mt-4 bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white/40"
        />
        <div className="mt-4 space-y-2 overflow-y-auto flex-1" style={{maxHeight: 'calc(55vh - 120px)'}}>

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