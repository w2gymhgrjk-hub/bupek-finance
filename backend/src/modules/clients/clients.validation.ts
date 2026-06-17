import { body, query } from 'express-validator';

export const createClientValidation = [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('phonePrimary').notEmpty().withMessage('Primary phone required'),
  body('nationalId').optional().trim(),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date required'),
  body('gender').optional().isIn(['MALE','FEMALE','OTHER']),
  body('maritalStatus').optional().isIn(['SINGLE','MARRIED','DIVORCED','WIDOWED']),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('loanOfficerId').isUUID().withMessage('Loan officer ID required'),
  body('branchId').isUUID().withMessage('Branch ID required'),
];

export const updateClientValidation = [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phonePrimary').optional().notEmpty(),
  body('phoneSecondary').optional(),
  body('email').optional().isEmail(),
  body('notes').optional().trim(),
];

export const addAddressValidation = [
  body('addressType').isIn(['HOME','BUSINESS','OTHER']).withMessage('Valid address type required'),
  body('streetAddress').optional().trim(),
  body('city').optional().trim(),
  body('district').optional().trim(),
  body('region').optional().trim(),
  body('isPrimary').optional().isBoolean(),
];

export const addGuarantorValidation = [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('phone').notEmpty().withMessage('Phone required'),
  body('nationalId').optional().trim(),
  body('relationship').optional().trim(),
  body('occupation').optional().trim(),
  body('address').optional().trim(),
];

export const businessValidation = [
  body('businessName').optional().trim(),
  body('businessType').optional().trim(),
  body('registrationNo').optional().trim(),
  body('address').optional().trim(),
  body('yearsInOperation').optional().isInt({ min: 0 }),
  body('monthlyRevenue').optional().isFloat({ min: 0 }),
  body('monthlyExpenses').optional().isFloat({ min: 0 }),
  body('numberOfEmployees').optional().isInt({ min: 0 }),
];