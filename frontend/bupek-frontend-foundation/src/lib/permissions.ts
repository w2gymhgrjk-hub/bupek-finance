import { UserRole } from '@/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  CEO_ADMIN: 'CEO / Admin',
  OPERATIONS_MANAGER: 'Operations Manager',
  BRANCH_MANAGER: 'Branch Manager',
  LOAN_OFFICER: 'Loan Officer',
  COLLECTION_OFFICER: 'Collection Officer',
  ACCOUNTANT: 'Accountant',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  CEO_ADMIN: 'bg-purple-100 text-purple-800',
  OPERATIONS_MANAGER: 'bg-blue-100 text-blue-800',
  BRANCH_MANAGER: 'bg-cyan-100 text-cyan-800',
  LOAN_OFFICER: 'bg-green-100 text-green-800',
  COLLECTION_OFFICER: 'bg-orange-100 text-orange-800',
  ACCOUNTANT: 'bg-yellow-100 text-yellow-800',
};

export const PERMISSIONS = {
  // Users
  canManageUsers: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'].includes(role),
  canCreateUsers: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'].includes(role),

  // Branches
  canManageBranches: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role),
  canViewAllBranches: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role),

  // Clients
  canManageClients: (role: UserRole) => !['ACCOUNTANT'].includes(role),
  canDeleteClients: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role),

  // Loans
  canCreateLoan: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'LOAN_OFFICER'].includes(role),
  canRecommendLoan: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'LOAN_OFFICER'].includes(role),
  canApproveLoan: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'].includes(role),
  canDisburseLoan: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role),
  canWriteOffLoan: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role),

  // Repayments
  canRecordRepayment: (role: UserRole) => !['ACCOUNTANT'].includes(role),
  canReverseRepayment: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role),

  // Collections
  canLogActivity: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'LOAN_OFFICER', 'COLLECTION_OFFICER'].includes(role),

  // Reports
  canViewReports: (_role: UserRole) => true,
  canViewFinancials: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'ACCOUNTANT'].includes(role),

  // SMS
  canManageSms: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(role),
  canSendSms: (role: UserRole) => ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'LOAN_OFFICER', 'COLLECTION_OFFICER'].includes(role),
};