import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function UserTypeFixer() {
  const queryClient = useQueryClient();
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      console.log('User type updated successfully, reloading page...');
      // Invalidate all queries
      queryClient.invalidateQueries();
      // Force reload the page to ensure RLS picks up the change
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  });

  useEffect(() => {
    if (!currentUser) return;
    
    const isAdminRole = ['admin', 'super_admin', 'company_admin'].includes(currentUser.role);
    
    // If user has an admin role, they must be internal — fix if missing or wrong
    if (isAdminRole && currentUser.user_type !== 'internal') {
      console.log('Fixing admin user - setting user_type to internal (was:', currentUser.user_type, ')');
      updateUserMutation.mutate({ user_type: 'internal' });
      return; // Don't run the referrer check for admin users
    }
    
    // If user has linked_referrer_id but doesn't have user_type set to 'referrer', fix it
    if (!isAdminRole && currentUser.linked_referrer_id && currentUser.user_type !== 'referrer') {
      console.log('Fixing referrer user - setting user_type to referrer');
      updateUserMutation.mutate({ user_type: 'referrer' });
    }
  }, [currentUser]);

  return null; // This component doesn't render anything
}