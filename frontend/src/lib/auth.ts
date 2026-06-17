import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function isGlobal(role: UserRole): boolean {
  return ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role);
}

export function isManagement(role: UserRole): boolean {
  return ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'].includes(role);
}

export function canApproveLoan(role: UserRole): boolean {
  return ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'].includes(role);
}

export function canDisburseLoan(role: UserRole): boolean {
  return ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role);
}

export function getUser() {
  return useAuthStore.getState().user;
}