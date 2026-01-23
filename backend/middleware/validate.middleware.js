const Joi = require('joi');

/**
 * Validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    console.log('Validating request body:', req.body);

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      console.error('Validation failed:', errors);

      // Return the first error message as 'message' for frontend display
      return res.status(400).json({
        error: 'Validation Error',
        message: errors[0].message,
        details: errors
      });
    }

    console.log('Validation passed, validated data:', value);
    req.validatedData = value;
    next();
  };
};

module.exports = { validate };

