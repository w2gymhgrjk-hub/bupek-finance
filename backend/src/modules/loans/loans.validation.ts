import { body } from 'express-validator';

export const createLoanValidation = [
  body('clientId').isUUID().withMessage('Client ID required'),
  body('loanProductId').isUUID().withMessage('Loan product ID required'),
  body('branchId').isUUID().withMessage('Branch ID required'),
  body('principal').isFloat({ min: 1 }).withMessage('Principal must be positive'),
  body('interestRate').isFloat({ min: 0 }).withMessage('Interest rate must be >= 0'),
  body('interestType').isIn(['FLAT','REDUCING_BALANCE']).withMessage('Invalid interest type'),
  body('term').isInt({ min: 1 }).withMessage('Term must be >= 1'),
  body('termUnit').isIn(['DAYS','WEEKS','MONTHS']).withMessage('Invalid term unit'),
  body('repaymentFrequency').isIn(['DAILY','WEEKLY','BI_WEEKLY','MONTHLY']).withMessage('Invalid frequency'),
  body('purpose').optional().trim(),
  body('disbursementDate').optional().isISO8601(),
];

export const approvalValidation = [
  body('notes').optional().trim(),
];

export const rejectionValidation = [
  body('rejectionReason').trim().notEmpty().withMessage('Rejection reason required'),
];

export const disbursementValidation = [
  body('disbursementDate').isISO8601().withMessage('Disbursement date required'),
  body('disbursementMethod').optional().trim(),
  body('referenceNo').optional().trim(),
];

export const writeOffValidation = [
  body('writeOffReason').trim().notEmpty().withMessage('Write-off reason required'),
];

export const calculateScheduleValidation = [
  body('principal').isFloat({ min: 1 }),
  body('interestRate').isFloat({ min: 0 }),
  body('interestType').isIn(['FLAT','REDUCING_BALANCE']),
  body('term').isInt({ min: 1 }),
  body('termUnit').isIn(['DAYS','WEEKS','MONTHS']),
  body('repaymentFrequency').isIn(['DAILY','WEEKLY','BI_WEEKLY','MONTHLY']),
  body('disbursementDate').isISO8601(),
  body('gracePeriodDays').optional().isInt({ min: 0 }),
];