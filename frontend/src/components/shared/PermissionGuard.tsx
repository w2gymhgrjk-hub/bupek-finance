'use client';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';

interface PermissionGuardProps {
  roles?: UserRole[];
  check?: (role: UserRole) => boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({ roles, check, children, fallback = null }: PermissionGuardProps) {
  const { user } = useAuthStore();
  if (!user) return <>{fallback}</>;
  const allowed = roles ? roles.includes(user.role) : check ? check(user.role) : true;
  return allowed ? <>{children}</> : <>{fallback}</>;
}