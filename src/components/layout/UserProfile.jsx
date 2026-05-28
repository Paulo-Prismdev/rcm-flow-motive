import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from 'lucide-react';

// Helper functions for avatar
export const getUserInitials = (user) => {
  if (!user) return '?';
  if (user.full_name) {
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  return '?';
};

export const getAvatarColor = (email) => {
  if (!email) return 'bg-gray-500';
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function UserProfile() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center p-0 focus:outline-none">
          {user?.profile_picture_url ? (
            <img 
              src={user.profile_picture_url} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full ${getAvatarColor(user?.email)} flex items-center justify-center`}>
              <span className="text-sm font-bold text-white">
                {getUserInitials(user)}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="glass-elevated w-56 md:w-64 border-accent z-[10000]" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            {user?.profile_picture_url ? (
              <img 
                src={user.profile_picture_url} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(user?.email)} flex items-center justify-center`}>
                <span className="text-sm font-bold text-white">
                  {getUserInitials(user)}
                </span>
              </div>
            )}
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-foreground-muted truncate">
                {user?.email || 'Loading...'}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <Link to={createPageUrl("UserProfile")}>
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer text-red-500 focus:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}