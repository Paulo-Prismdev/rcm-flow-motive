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
    
    // If user is admin but doesn't have user_type set, set it to 'internal'
    if (currentUser.role === 'admin' && !currentUser.user_type) {
      console.log('Fixing admin user - setting user_type to internal');
      updateUserMutation.mutate({ user_type: 'internal' });
    }
    
    // If user has linked_referrer_id but doesn't have user_type set to 'referrer', fix it
    if (currentUser.linked_referrer_id && currentUser.user_type !== 'referrer') {
      console.log('Fixing referrer user - setting user_type to referrer');
      updateUserMutation.mutate({ user_type: 'referrer' });
    }
  }, [currentUser]);

  return null; // This component doesn't render anything
}