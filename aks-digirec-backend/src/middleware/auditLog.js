const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

/**
 * Audit log middleware - logs actions to database
 * @param {string} action - Action name (e.g., 'CREATE_USER', 'UPDATE_SALE')
 * @param {string} entityType - Entity type (e.g., 'User', 'Sale')
 * @param {Function} getEntityId - Function to extract entity ID from req
 * @param {Function} getDetails - Function to extract additional details from req
 */
const auditLog = (action, entityType, getEntityId = null, getDetails = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to capture response
    res.json = function(data) {
      // Restore original json method
      res.json = originalJson;
      
      // Log the action asynchronously (don't block response)
      (async () => {
        try {
          const entityId = getEntityId ? getEntityId(req, data) : req.params.id || req.body.id;
          const details = getDetails ? getDetails(req, data) : {};
          
          await AuditLog.create({
            companyId: req.companyId || req.user?.company?._id,
            userId: req.user?._id,
            action,
            entityType,
            entityId,
            details: {
              method: req.method,
              path: req.path,
              body: sanitizeBody(req.body),
              query: req.query,
              params: req.params,
              response: data.success ? 'success' : 'failed',
              ...details
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        } catch (error) {
          logger.error('Failed to create audit log:', error);
        }
      })();
      
      // Call original json method
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Sanitize request body for logging (remove sensitive data)
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'cvv'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

/**
 * Manual audit log creation
 */
const createAuditLog = async (data) => {
  try {
    await AuditLog.create(data);
  } catch (error) {
    logger.error('Failed to create manual audit log:', error);
  }
};

module.exports = {
  auditLog,
  createAuditLog,
  sanitizeBody
};
