import { prisma } from './prismaClient';

let userSeq = 0;
let clientSeq = 0;
let loanSeq = 0;
let receiptSeq = 0;

async function initSequences() {
  const [users, clients, loans, repayments] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.loan.count(),
    prisma.repayment.count(),
  ]);
  userSeq = users;
  clientSeq = clients;
  loanSeq = loans;
  receiptSeq = repayments;
}

initSequences().catch(console.error);

export const generateUserNo = (): string => {
  userSeq++;
  return `BFL-USR-${String(userSeq).padStart(4, '0')}`;
};

export const generateClientNo = (): string => {
  clientSeq++;
  return `BFL-CLT-${String(clientSeq).padStart(5, '0')}`;
};

export const generateLoanNo = (): string => {
  loanSeq++;
  const year = new Date().getFullYear();
  return `BFL-LN-${year}${String(loanSeq).padStart(4, '0')}`;
};

export const generateReceiptNo = (): string => {
  receiptSeq++;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BFL-RCP-${date}-${String(receiptSeq).padStart(4, '0')}`;
};

export const generateBranchCode = (name: string): string => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
  return `BFL-${initials}`;
};