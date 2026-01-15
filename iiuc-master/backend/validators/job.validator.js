const Joi = require('joi');

const jobSchema = Joi.object({
  jobTitle: Joi.string().min(3).max(200).required(),
  department: Joi.string().allow('', null),
  
  jobType: Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Campus Placement').required(),
  workMode: Joi.string().valid('Remote', 'On-site', 'Hybrid').required(),
  experienceLevel: Joi.string().valid('Entry Level', 'Mid Level', 'Senior', 'Lead/Manager').required(),
  
  country: Joi.string().required(),
  city: Joi.string().required(),
  address: Joi.string().allow('', null),
  
  salaryMin: Joi.number().min(0).allow(null),
  salaryMax: Joi.number().min(0).allow(null),
  salaryCurrency: Joi.string().default('USD'),
  salaryPeriod: Joi.string().valid('per hour', 'per month', 'per year').allow('', null),
  
  jobDescription: Joi.string().min(100).required(),
  responsibilities: Joi.string().required(),
  qualifications: Joi.string().required(),
  niceToHave: Joi.string().allow('', null),
  benefits: Joi.string().allow('', null),
  
  requiredSkills: Joi.array().items(Joi.string()).min(1).required(),
  
  applicationDeadline: Joi.date().allow(null),
  numberOfPositions: Joi.number().min(1).default(1),
  
  isStudentFriendly: Joi.boolean().default(false),
  minimumExperienceYears: Joi.number().min(0).allow(null),
  
  status: Joi.string().valid('draft', 'active', 'closed').default('draft')
});

module.exports = {
  jobSchema
};

