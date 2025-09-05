/**
 * Middleware to enforce seat limits when adding users
 */
import { Request, Response, NextFunction } from 'express';
import { licensingService } from '../services/licensing';
import { AuthRequest } from '../auth';

/**
 * Middleware that checks if tenant can add new users based on seat limits
 * Returns 403 if seat limit would be exceeded
 */
export async function enforceSeatLimit(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const tenantId = req.user.tenantId;
    
    // Check if tenant can add more users
    const canAdd = await licensingService.canAddUser(tenantId);
    
    if (!canAdd) {
      // Get current seat usage for error message
      const seatUsage = await licensingService.getSeatUsage(tenantId);
      const summary = await licensingService.getSubscriptionSummary(tenantId);
      
      return res.status(403).json({ 
        message: 'Seat limit reached. Cannot add more licensed users.',
        error: 'SEAT_LIMIT_EXCEEDED',
        details: {
          currentSeats: seatUsage,
          seatLimit: summary.employeeLimit,
          message: `You have reached your license limit of ${summary.employeeLimit} users. Please upgrade your plan or remove inactive users to add new ones.`
        }
      });
    }

    // Seat limit check passed, continue to next middleware
    next();
  } catch (error: any) {
    console.error('Error in enforceSeatLimit middleware:', error);
    res.status(500).json({ 
      message: 'Internal error checking seat limits',
      error: error.message 
    });
  }
}

/**
 * Middleware specifically for checking employee limits when creating employees
 */
export async function checkEmployeeLimit(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const tenantId = req.user.tenantId;
    
    // Check if tenant can add more employees
    const canAdd = await licensingService.canAddUser(tenantId);
    
    if (!canAdd) {
      const seatUsage = await licensingService.getSeatUsage(tenantId);
      const summary = await licensingService.getSubscriptionSummary(tenantId);
      
      return res.status(403).json({ 
        message: 'Employee limit reached',
        error: 'EMPLOYEE_LIMIT_EXCEEDED',
        details: {
          currentEmployees: seatUsage,
          employeeLimit: summary.employeeLimit,
          message: `Cannot add more employees. Current: ${seatUsage}/${summary.employeeLimit}. Upgrade your license or remove inactive employees.`
        }
      });
    }

    next();
  } catch (error: any) {
    console.error('Error in checkEmployeeLimit middleware:', error);
    res.status(500).json({ 
      message: 'Internal error checking employee limits',
      error: error.message 
    });
  }
}