import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const StatusConfigContext = createContext();

export const useStatusConfigs = () => {
  const context = useContext(StatusConfigContext);
  if (!context) {
    throw new Error('useStatusConfigs must be used within a StatusConfigProvider');
  }
  return context;
};

export const StatusConfigProvider = ({ children }) => {
  const { data: claimStatuses = [] } = useQuery({ 
    queryKey: ['ClaimStatusConfig'], 
    queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'), 
    staleTime: 5 * 60 * 1000 
  });
  const { data: partStatuses = [] } = useQuery({ 
    queryKey: ['PartStatusConfig'], 
    queryFn: () => base44.entities.PartStatusConfig.list('sort_order'), 
    staleTime: 5 * 60 * 1000 
  });
  const { data: estimateStatuses = [] } = useQuery({ 
    queryKey: ['EstimateStatusConfig'], 
    queryFn: () => base44.entities.EstimateStatusConfig.list('sort_order'), 
    staleTime: 5 * 60 * 1000 
  });
  const { data: engineeringStatuses = [] } = useQuery({ 
    queryKey: ['EngineeringStatusConfig'], 
    queryFn: () => base44.entities.EngineeringStatusConfig.list('sort_order'), 
    staleTime: 5 * 60 * 1000 
  });

  const allStatuses = useMemo(() => {
    return [...claimStatuses, ...partStatuses, ...estimateStatuses, ...engineeringStatuses];
  }, [claimStatuses, partStatuses, estimateStatuses, engineeringStatuses]);

  const value = {
    allStatuses,
    claimStatuses,
    isLoading: !claimStatuses || !partStatuses || !estimateStatuses || !engineeringStatuses
  };

  return (
    <StatusConfigContext.Provider value={value}>
      {children}
    </StatusConfigContext.Provider>
  );
};