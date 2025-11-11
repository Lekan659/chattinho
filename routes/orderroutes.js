// routes/orderroutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/ordercontroller');
const getTenantContext = require('../middleware/getTenantContext');
const { validate } = require('../middleware/validate');
const { orderValidators } = require('../validators');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: CRUD Orders, Status Update
 */

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - items
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       default: 1
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error or business logic error (duplicate order, out of stock)
 *       404:
 *         description: Customer or product not found
 *       409:
 *         description: Duplicate order detected
 *       500:
 *         description: Server error
 */
router.post('/', 
  getTenantContext, 
  validate(orderValidators.create),
  orderController.createOrder
);

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Get all orders for the tenant
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       500:
 *         description: Server error
 */
router.get('/', 
  getTenantContext, 
  orderController.getOrders
);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/:id', 
  getTenantContext, 
  validate(orderValidators.getOrderById, 'params'),
  orderController.getOrder
);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status only
 *     tags: [Orders]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, shipped, delivered, cancelled]
 *                 example: confirmed
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', 
  getTenantContext, 
  validate(orderValidators.updateStatus),
  orderController.updateOrderStatus
);

/**
 * @openapi
 * /orders/{id}:
 *   put:
 *     summary: Update an entire order (status, notes, items)
 *     tags: [Orders]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, shipped, delivered, cancelled]
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.put('/:id',
  getTenantContext,
  validate(orderValidators.update),
  orderController.updateOrder
);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order and restore stock
 *     tags: [Orders]
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
 *         description: Order cancelled successfully
 *       400:
 *         description: Only pending orders can be cancelled
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/:id/cancel',
  getTenantContext,
  orderController.cancelOrder
);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete an order permanently
 *     tags: [Orders]
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
 *         description: Order deleted successfully
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', 
  getTenantContext, 
  validate(orderValidators.getOrderById, 'params'),
  orderController.deleteOrder
);

module.exports = router;