// validators/index.js
const Joi = require('joi');

// Tenant Validators
const tenantValidators = {
  create: Joi.object({
    businessName: Joi.string().min(2).max(100).required()
      .messages({
        'string.empty': 'Business name is required',
        'string.min': 'Business name must be at least 2 characters',
        'string.max': 'Business name cannot exceed 100 characters'
      }),
    contactPerson: Joi.string().min(2).max(100).required()
      .messages({
        'string.empty': 'Contact person is required'
      }),
    whatsappNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid WhatsApp number format (use international format)',
        'string.empty': 'WhatsApp number is required'
      }),
    businessType: Joi.string()
      .valid('retail', 'restaurant', 'shortlet', 'services')
      .required()
      .messages({
        'any.only': 'Business type must be one of: retail, restaurant, shortlet, services'
      }),
    subscriptionPlan: Joi.string()
      .valid('free', 'basic', 'premium')
      .default('free'),
    botInstructions: Joi.string().max(2000).allow('', null),
    businessAddress: Joi.string().max(200).allow('', null)
  }),

  update: Joi.object({
    businessName: Joi.string().min(2).max(100),
    contactPerson: Joi.string().min(2).max(100),
    businessType: Joi.string().valid('retail', 'restaurant', 'shortlet', 'services'),
    subscriptionPlan: Joi.string().valid('free', 'basic', 'premium'),
    botInstructions: Joi.string().max(2000).allow('', null),
    status: Joi.string().valid('active', 'suspended', 'cancelled')
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  getTenantById: Joi.object({
    tenantId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Invalid tenant ID format'
      })
  })
};

// Product Validators
const productValidators = {
  create: Joi.object({
    categoryId: Joi.string().uuid().allow(null),
    name: Joi.string().min(2).max(200).required()
      .messages({
        'string.empty': 'Product name is required',
        'string.min': 'Product name must be at least 2 characters'
      }),
    description: Joi.string().max(1000).allow('', null),
    price: Joi.number().positive().precision(2).required()
      .messages({
        'number.base': 'Price must be a valid number',
        'number.positive': 'Price must be greater than 0',
        'any.required': 'Price is required'
      }),
    stock: Joi.number().integer().min(0).required()
      .messages({
        'number.min': 'Stock cannot be negative'
      }),
    available: Joi.boolean().default(true),
    removeImages: Joi.string().allow('', null) // JSON string of public_ids
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(200),
    description: Joi.string().max(1000).allow('', null),
    price: Joi.number().positive().precision(2),
    stock: Joi.number().integer().min(0),
    available: Joi.boolean(),
    status: Joi.string().valid('active', 'archived'),
    removeImages: Joi.string().allow('', null)
  }).min(1),

  getProductById: Joi.object({
    id: Joi.string().uuid().required()
  }),

  deleteProduct: Joi.object({
    id: Joi.string().uuid().required()
  })
};

// Order Validators
const orderValidators = {
  create: Joi.object({
    customerId: Joi.string().uuid().required()
      .messages({
        'string.guid': 'Invalid customer ID format',
        'any.required': 'Customer ID is required'
      }),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).default(1)
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one item is required',
        'any.required': 'Order items are required'
      }),
    notes: Joi.string().max(500).allow('', null)
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
      .required()
      .messages({
        'any.only': 'Invalid status. Must be one of: pending, confirmed, shipped, delivered, cancelled',
        'any.required': 'Status is required'
      })
  }),

  update: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
    notes: Joi.string().max(500).allow('', null),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required()
      })
    ).min(1)
  }).min(1),

  getOrderById: Joi.object({
    id: Joi.string().uuid().required()
  })
};

// Query Parameter Validators
const queryValidators = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'price').default('createdAt'),
    order: Joi.string().valid('ASC', 'DESC').default('DESC')
  }),

  productFilters: Joi.object({
    categoryId: Joi.string().uuid(),
    available: Joi.boolean(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    search: Joi.string().max(100)
  }),

  orderFilters: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
    customerId: Joi.string().uuid(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  })
};

module.exports = {
  tenantValidators,
  productValidators,
  orderValidators,
  queryValidators
};