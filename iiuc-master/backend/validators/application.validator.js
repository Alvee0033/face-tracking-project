const Joi = require('joi');

const applicationSchema = Joi.object({
  jobId: Joi.string().uuid().required(),
  coverLetter: Joi.string().allow('', null),
  resumeUrl: Joi.string().uri().allow('', null)
});

const applicationStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'reviewed', 'shortlisted', 'rejected', 'hired').required()
});

module.exports = {
  applicationSchema,
  applicationStatusSchema
};
