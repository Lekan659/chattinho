// routes/tenantroutes.js
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantcontroller');
const getTenantContext = require('../middleware/getTenantContext');
const { validate } = require('../middleware/validate');
const { tenantValidators } = require('../validators');

/**
 * @swagger
 * /tenants:
 *   post:
 *     summary: Create a new tenant (business account)
 *     tags: [Tenants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - contactPerson
 *               - whatsappNumber
 *               - businessType
 *             properties:
 *               businessName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Fashion Store Lagos
 *               contactPerson:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Olalekan Adeyemi
 *               whatsappNumber:
 *                 type: string
 *                 pattern: '^\+?[1-9]\d{1,14}$'
 *                 example: "+2348012345678"
 *                 description: International format phone number
 *               businessType:
 *                 type: string
 *                 enum: [retail, restaurant, shortlet, services]
 *                 example: retail
 *               subscriptionPlan:
 *                 type: string
 *                 enum: [free, basic, premium]
 *                 default: free
 *               botInstructions:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Custom instructions for the AI chatbot
 *                 example: "Respond to customer inquiries about product availability and store hours. Never entertain negotiations"
 *               businessAddress:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', 
  validate(tenantValidators.create),
  tenantController.createTenant
);

/**
 * @swagger
 * /tenants:
 *   get:
 *     summary: Get all tenants
 *     tags: [Tenants]
 *     responses:
 *       200:
 *         description: List of all tenants
 *       500:
 *         description: Server error
 */
router.get('/', tenantController.getAllTenants);

/**
 * @swagger
 * /tenants/{tenantId}:
 *   get:
 *     summary: Get a specific tenant by ID
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tenant UUID
 *     responses:
 *       200:
 *         description: Tenant details
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Server error
 */
router.get('/:tenantId', 
  validate(tenantValidators.getTenantById, 'params'),
  tenantController.getTenantById
);

/**
 * @swagger
 * /tenants/{tenantId}:
 *   put:
 *     summary: Update tenant information
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               businessName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               contactPerson:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               businessType:
 *                 type: string
 *                 enum: [retail, restaurant, shortlet, services]
 *               subscriptionPlan:
 *                 type: string
 *                 enum: [free, basic, premium]
 *               botInstructions:
 *                 type: string
 *                 maxLength: 2000
 *               status:
 *                 type: string
 *                 enum: [active, suspended, cancelled]
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Server error
 */
router.put('/:tenantId', 
  validate(tenantValidators.update),
  tenantController.updateTenant
);

module.exports = router;