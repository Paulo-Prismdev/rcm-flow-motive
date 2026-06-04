import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const StatusConfigContext = createContext();

export const useStatusConfigs = () => useContext(StatusConfigContext);

export const StatusConfigProvider = ({ children }) => {
  const { data: claimStatuses = [] } = useQuery({ 
    queryKey: ['ClaimStatusConfig'], 
    queryFn: () => base44.entities.ClaimStatusConfig.list(), 
    staleTime: Infinity 
  });
  const { data: partStatuses = [] } = useQuery({ 
    queryKey: ['PartStatusConfig'], 
    queryFn: () => base44.entities.PartStatusConfig.list(), 
    staleTime: Infinity 
  });
  const { data: estimateStatuses = [] } = useQuery({ 
    queryKey: ['EstimateStatusConfig'], 
    queryFn: () => base44.entities.EstimateStatusConfig.list(), 
    staleTime: Infinity 
  });
  const { data: engineeringStatuses = [] } = useQuery({ 
    queryKey: ['EngineeringStatusConfig'], 
    queryFn: () => base44.entities.EngineeringStatusConfig.list(), 
    staleTime: Infinity 
  });

  const allStatuses = useMemo(() => {
    return [...claimStatuses, ...partStatuses, ...estimateStatuses, ...engineeringStatuses];
  }, [claimStatuses, partStatuses, estimateStatuses, engineeringStatuses]);

  const value = {
    allStatuses,
    isLoading: !claimStatuses || !partStatuses || !estimateStatuses || !engineeringStatuses
  };

  return (
    <StatusConfigContext.Provider value={value}>
      {children}
    </StatusConfigContext.Provider>
  );
};