// ─── Shared Enums ─────────────────────────────────────────────
export type UserRole = 'CEO_ADMIN' | 'OPERATIONS_MANAGER' | 'BRANCH_MANAGER' | 'LOAN_OFFICER' | 'COLLECTION_OFFICER' | 'ACCOUNTANT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
export type LoanStatus = 'PENDING' | 'UNDER_REVIEW' | 'RECOMMENDED' | 'APPROVED' | 'DISBURSED' | 'ACTIVE' | 'OVERDUE' | 'PAID' | 'WRITTEN_OFF' | 'REJECTED';
export type InterestType = 'FLAT' | 'REDUCING_BALANCE';
export type RepaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type CollectionMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE';
export type ActivityType = 'PHONE_CALL' | 'FIELD_VISIT' | 'SMS' | 'EMAIL' | 'LETTER';
export type ActivityOutcome = 'PAID' | 'PROMISED' | 'REFUSED' | 'UNREACHABLE' | 'OTHER';
export type SmsStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
export type ScheduleStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

// ─── Auth ──────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  userNo: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  branchName?: string;
  status: UserStatus;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

// ─── Branch ───────────────────────────────────────────────────
export interface Branch {
  id: string;
  branchCode: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  region: string;
  district?: string;
  manager?: { firstName: string; lastName: string };
  status: 'ACTIVE' | 'INACTIVE';
  _count?: { clients: number; loans: number; users: number };
}

// ─── User ─────────────────────────────────────────────────────
export interface User {
  id: string;
  userNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  branchId: string | null;
  branch?: { name: string };
  lastLoginAt?: string;
  createdAt: string;
}

// ─── Client ───────────────────────────────────────────────────
export interface Client {
  id: string;
  clientNo: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  phonePrimary: string;
  phoneSecondary?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  maritalStatus?: string;
  educationLevel?: string;
  status: ClientStatus;
  branchId: string;
  branch?: { name: string };
  loanOfficerId?: string;
  loanOfficer?: { firstName: string; lastName: string };
  photoUrl?: string;
  addresses?: ClientAddress[];
  guarantors?: Guarantor[];
  business?: ClientBusiness;
  documents?: ClientDocument[];
  loans?: Loan[];
  createdAt: string;
}

export interface ClientAddress {
  id: string;
  addressType: string;
  streetAddress: string;
  city: string;
  district?: string;
  region?: string;
  isPrimary: boolean;
}

export interface Guarantor {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  phone: string;
  relationship: string;
}

export interface ClientBusiness {
  businessName: string;
  businessType: string;
  address: string;
  yearsInOperation?: number;
  monthlyRevenue?: number;
  monthlyExpenses?: number;
}

export interface ClientDocument {
  id: string;
  documentType: string;
  documentName: string;
  fileUrl: string;
  uploadedAt: string;
}

// ─── Loan Product ─────────────────────────────────────────────
export interface LoanProduct {
  id: string;
  productCode: string;
  name: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  interestType: InterestType;
  minTerm: number;
  maxTerm: number;
  termUnit: 'MONTHS' | 'WEEKS';
  repaymentFrequency: RepaymentFrequency;
  processingFeeType: 'FIXED' | 'PERCENTAGE';
  processingFeeValue: number;
  requiresGuarantor: boolean;
  gracePeriodDays: number;
  penaltyRate: number;
  status: 'active' | 'inactive';
}

// ─── Loan ─────────────────────────────────────────────────────
export interface Loan {
  id: string;
  loanNo: string;
  clientId: string;
  client?: Pick<Client, 'id' | 'clientNo' | 'firstName' | 'lastName' | 'phonePrimary'>;
  branchId: string;
  branch?: { name: string };
  loanProductId: string;
  loanProduct?: Pick<LoanProduct, 'name' | 'interestType'>;
  loanOfficerId?: string;
  loanOfficer?: { firstName: string; lastName: string };
  principal: number;
  interestRate: number;
  interestType: InterestType;
  termMonths: number;
  repaymentFrequency: RepaymentFrequency;
  processingFee: number;
  insuranceFee: number;
  totalLoanAmount: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  totalPaid: number;
  status: LoanStatus;
  applicationDate: string;
  approvedDate?: string;
  disbursementDate?: string;
  maturityDate?: string;
  purpose?: string;
  notes?: string;
  schedules?: LoanSchedule[];
  workflow?: LoanWorkflow[];
  repayments?: Repayment[];
  createdAt: string;
}

export interface LoanSchedule {
  id: string;
  installmentNo: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  penaltyDue: number;
  totalDue: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  totalPaid: number;
  status: ScheduleStatus;
  paidAt?: string;
}

export interface LoanWorkflow {
  id: string;
  action: string;
  fromStatus?: string;
  toStatus: string;
  notes?: string;
  actor?: { firstName: string; lastName: string; role: string };
  createdAt: string;
}

// ─── Repayment ────────────────────────────────────────────────
export interface Repayment {
  id: string;
  receiptNo: string;
  loanId: string;
  loan?: { loanNo: string };
  clientId: string;
  client?: Pick<Client, 'clientNo' | 'firstName' | 'lastName'>;
  branchId: string;
  branch?: { name: string };
  paymentDate: string;
  amountReceived: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  collectionMethod: CollectionMethod;
  referenceNo?: string;
  notes?: string;
  isReversed: boolean;
  collectedBy?: { firstName: string; lastName: string };
  allocations?: RepaymentAllocation[];
  createdAt: string;
}

export interface RepaymentAllocation {
  id: string;
  scheduleId: string;
  schedule?: { installmentNo: number; dueDate: string };
  principalAllocated: number;
  interestAllocated: number;
  penaltyAllocated: number;
}

// ─── Collection ───────────────────────────────────────────────
export interface CollectionActivity {
  id: string;
  loanId: string;
  clientId: string;
  officerId: string;
  officer?: { firstName: string; lastName: string; role: string };
  activityType: ActivityType;
  notes: string;
  outcome: ActivityOutcome;
  promiseToPayDate?: string;
  promiseAmount?: number;
  nextFollowUpDate?: string;
  createdAt: string;
}

// ─── SMS ──────────────────────────────────────────────────────
export interface SmsTemplate {
  id: string;
  code: string;
  name: string;
  messageTemplate: string;
  triggerEvent: string;
  daysBeforeDue?: number;
  daysAfterDue?: number;
  isActive: boolean;
}

export interface SmsLog {
  id: string;
  recipientPhone: string;
  message: string;
  status: SmsStatus;
  sentAt?: string;
  template?: { name: string; code: string };
  client?: Pick<Client, 'clientNo' | 'firstName' | 'lastName'>;
  createdAt: string;
}

// ─── API Response ─────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: unknown[];
}

// ─── Dashboard ────────────────────────────────────────────────
export interface DashboardStats {
  totalPortfolio: number;
  totalClients: number;
  activeLoans: number;
  overdueLoans: number;
  totalArrears: number;
  todayCollections: { amount: number; count: number };
  pendingLoans: number;
}