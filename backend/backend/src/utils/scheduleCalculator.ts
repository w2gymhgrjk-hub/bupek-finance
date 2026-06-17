import { RepaymentFrequency, TermUnit } from '@prisma/client';
import { addDays, addWeeks, addMonths } from './dateHelpers';

export interface InstallmentRow {
  installmentNo: number;
  dueDate: Date;
  openingBalance: number;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  closingBalance: number;
}

export interface ScheduleInput {
  principal: number;
  interestRate: number; // per annum as decimal e.g. 0.24 = 24%
  interestType: 'FLAT' | 'REDUCING_BALANCE';
  term: number;
  termUnit: TermUnit;
  repaymentFrequency: RepaymentFrequency;
  disbursementDate: Date;
  gracePeriodDays?: number;
}

function getPeriodsPerYear(freq: RepaymentFrequency): number {
  switch (freq) {
    case 'DAILY': return 365;
    case 'WEEKLY': return 52;
    case 'BI_WEEKLY': return 26;
    case 'MONTHLY': return 12;
    default: return 12;
  }
}

function getNumInstallments(term: number, termUnit: TermUnit, freq: RepaymentFrequency): number {
  const periodsPerYear = getPeriodsPerYear(freq);
  switch (termUnit) {
    case 'DAYS': {
      const weeks = term / 7;
      if (freq === 'DAILY') return term;
      if (freq === 'WEEKLY') return Math.ceil(weeks);
      if (freq === 'BI_WEEKLY') return Math.ceil(weeks / 2);
      return Math.ceil(term / 30);
    }
    case 'WEEKS': {
      if (freq === 'WEEKLY') return term;
      if (freq === 'BI_WEEKLY') return Math.ceil(term / 2);
      if (freq === 'DAILY') return term * 7;
      return Math.ceil(term / 4.33);
    }
    case 'MONTHS': {
      if (freq === 'MONTHLY') return term;
      if (freq === 'BI_WEEKLY') return term * 2;
      if (freq === 'WEEKLY') return term * 4;
      if (freq === 'DAILY') return term * 30;
      return term;
    }
    default: return term;
  }
}

function addPeriod(date: Date, freq: RepaymentFrequency): Date {
  switch (freq) {
    case 'DAILY': return addDays(date, 1);
    case 'WEEKLY': return addWeeks(date, 1);
    case 'BI_WEEKLY': return addWeeks(date, 2);
    case 'MONTHLY': return addMonths(date, 1);
    default: return addMonths(date, 1);
  }
}

export function calculateSchedule(input: ScheduleInput): InstallmentRow[] {
  const {
    principal, interestRate, interestType,
    term, termUnit, repaymentFrequency,
    disbursementDate, gracePeriodDays = 0,
  } = input;

  const n = getNumInstallments(term, termUnit, repaymentFrequency);
  const periodsPerYear = getPeriodsPerYear(repaymentFrequency);
  const periodRate = interestRate / periodsPerYear;

  const rows: InstallmentRow[] = [];
  let firstDueDate = addDays(disbursementDate, gracePeriodDays);
  firstDueDate = addPeriod(firstDueDate, repaymentFrequency);

  if (interestType === 'FLAT') {
    const totalInterest = principal * interestRate * (term / 12);
    const principalPerPeriod = round2(principal / n);
    const interestPerPeriod = round2(totalInterest / n);
    let balance = principal;
    let dueDate = firstDueDate;

    for (let i = 1; i <= n; i++) {
      const openBal = balance;
      const pDue = i === n ? round2(balance) : principalPerPeriod;
      const iDue = interestPerPeriod;
      balance = round2(balance - pDue);
      rows.push({
        installmentNo: i,
        dueDate: new Date(dueDate),
        openingBalance: round2(openBal),
        principalDue: pDue,
        interestDue: iDue,
        totalDue: round2(pDue + iDue),
        closingBalance: round2(balance),
      });
      dueDate = addPeriod(dueDate, repaymentFrequency);
    }
  } else {
    // Reducing balance: EMI = P * r(1+r)^n / ((1+r)^n - 1)
    const r = periodRate;
    const emi = r === 0
      ? principal / n
      : round2(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    let balance = principal;
    let dueDate = firstDueDate;

    for (let i = 1; i <= n; i++) {
      const openBal = balance;
      const iDue = round2(balance * r);
      let pDue = round2(emi - iDue);
      if (i === n) pDue = round2(balance); // final installment clears balance
      balance = round2(balance - pDue);
      rows.push({
        installmentNo: i,
        dueDate: new Date(dueDate),
        openingBalance: round2(openBal),
        principalDue: pDue,
        interestDue: iDue,
        totalDue: round2(pDue + iDue),
        closingBalance: Math.max(0, round2(balance)),
      });
      dueDate = addPeriod(dueDate, repaymentFrequency);
    }
  }

  return rows;
}

export function calculateFees(
  principal: number,
  feeType: 'FIXED' | 'PERCENTAGE',
  feeValue: number
): number {
  if (feeType === 'FIXED') return round2(feeValue);
  return round2(principal * (feeValue / 100));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}