import { body } from 'express-validator';

export const createProductValidation = [
  body('name').trim().notEmpty().withMessage('Product name required'),
  body('productCode').optional().trim().toUpperCase(),
  body('minAmount').isFloat({ min: 0 }).withMessage('Min amount must be positive'),
  body('maxAmount').isFloat({ min: 0 }).withMessage('Max amount must be positive'),
  body('interestRate').isFloat({ min: 0, max: 100 }).withMessage('Interest rate 0–100'),
  body('interestType').isIn(['FLAT','REDUCING_BALANCE']).withMessage('Invalid interest type'),
  body('minTerm').isInt({ min: 1 }).withMessage('Min term required'),
  body('maxTerm').isInt({ min: 1 }).withMessage('Max term required'),
  body('termUnit').isIn(['DAYS','WEEKS','MONTHS']).withMessage('Invalid term unit'),
  body('repaymentFrequency').isIn(['DAILY','WEEKLY','BI_WEEKLY','MONTHLY']),
  body('processingFeeType').optional().isIn(['FIXED','PERCENTAGE']),
  body('processingFeeValue').optional().isFloat({ min: 0 }),
  body('insuranceFeeType').optional().isIn(['FIXED','PERCENTAGE']),
  body('insuranceFeeValue').optional().isFloat({ min: 0 }),
  body('requiresGuarantor').optional().isBoolean(),
  body('gracePeriodDays').optional().isInt({ min: 0 }),
  body('penaltyRate').optional().isFloat({ min: 0 }),
];