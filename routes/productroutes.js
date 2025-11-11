// routes/productRoutes.js
const express = require('express');
const ProductController = require('../controllers/productcontroller');
const getTenantContext = require('../middleware/getTenantContext');
const upload = require('../middleware/upload');
const swaggerJSDoc = require('swagger-jsdoc');
const router = express.Router();

// tenant auth middleware should attach req.tenantId

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: CRUD Products, Toggle Availability, Image Upload,
 */

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 example: Plain White T-Shirt
 *               description:
 *                 type: string
 *                 example: Classic cotton tee for everyday wear
 *               price:
 *                 type: number
 *                 format: decimal
 *                 example: 4500.00
 *               stock:
 *                 type: integer
 *                 example: 42
 *               available:
 *                 type: boolean
 *                 default: true
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', upload.array('images', 5), getTenantContext, ProductController.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               available:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [active, archived]
 *               removeImages:
 *                 type: string
 *                 description: JSON array of public_ids to remove
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.put('/:id', upload.array('images', 5), getTenantContext, ProductController.updateProduct);
// router.post('/', getTenantContext, ProductController.createProduct);
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products for the tenant
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Server error
 */
router.get('/', getTenantContext, ProductController.listProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getTenantContext, ProductController.getProduct);
// router.put('/:id', getTenantContext, ProductController.updateProduct);
/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete (archive) a product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product archived successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', getTenantContext, ProductController.deleteProduct);

/**
 * @swagger
 * /api/products/{id}/toggle-availability:
 *   patch:
 *     summary: Toggle product availability
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Availability toggled successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/toggle-availability', getTenantContext, ProductController.toggleAvailability);

module.exports = router;
