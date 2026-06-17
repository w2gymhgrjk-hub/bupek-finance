import { body, query } from 'express-validator';

export const createBranchValidation = [
  body('name').trim().notEmpty().withMessage('Branch name required'),
  body('branchCode').optional().trim().toUpperCase(),
  body('address').optional().trim(),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone required'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('region').optional().trim(),
  body('district').optional().trim(),
  body('managerId').optional().isUUID().withMessage('Valid manager ID required'),
];

export const updateBranchValidation = [
  body('name').optional().trim().notEmpty().withMessage('Branch name cannot be empty'),
  body('address').optional().trim(),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone required'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('region').optional().trim(),
  body('district').optional().trim(),
  body('managerId').optional().isUUID().withMessage('Valid manager ID required'),
];