// middleware/validate.js
/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {String} source - 'body', 'params', 'query'
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types (e.g., string to number)
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace the original data with validated/sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate multiple sources in one middleware
 * @param {Object} schemas - { body: schema, params: schema, query: schema }
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    // Validate each source
    Object.keys(schemas).forEach(source => {
      const schema = schemas[source];
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          source,
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        })));
      } else {
        req[source] = value;
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

module.exports = { validate, validateMultiple };