import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ClaimForm from './ClaimForm';

export default function ClaimFormWrapper({ claim, onSubmit, onCancel, isSubmitting }) {
  // Fetch custom claim statuses
  const { data: customStatuses = [] } = useQuery({
    queryKey: ['ClaimStatusConfig'],
    queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
    staleTime: 0,
  });

  // Get available statuses
  const availableStatuses = React.useMemo(() => {
    const active = customStatuses
      .filter(s => s.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(s => s.status_name);
    
    return active.includes('New') ? active : ['New', ...active];
  }, [customStatuses]);

  return (
    <ClaimForm 
      claim={claim} 
      onSubmit={onSubmit} 
      onCancel={onCancel}
      availableStatuses={availableStatuses}
      isSubmitting={isSubmitting}
    />
  );
}