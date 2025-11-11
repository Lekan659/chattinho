
const { Order, OrderItem, Product, Customer } = require('../models');
const { Op } = require('sequelize');

exports.createOrder = async (req, res) => {
  const transaction = await Order.sequelize.transaction();
  try {
    const { tenant } = req;
    const { customerId, items, notes } = req.body;

    if (!items || !items.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Order items required' });
    }


    const recentOrder = await Order.findOne({
      where: {
        tenantId: tenant.id,
        customerId,
        status: 'pending',
        createdAt: {
          [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }
    });

    if (recentOrder) {
      await transaction.rollback();
      return res.status(409).json({ 
        error: 'You have a pending order from the last 5 minutes. Please wait or check your existing order.',
        existingOrderId: recentOrder.id 
      });
    }

    // 2. Validate customer
    const customer = await Customer.findOne({ 
      where: { id: customerId, tenantId: tenant.id } 
    });
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }


    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.productId, tenantId: tenant.id }
      });
      
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }


      if (product.stock <= 0 && product.available === false) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `${product.name} is out of stock and unavailable for pre-order` 
        });
      }

      const quantity = item.quantity || 1;
      const unitPrice = parseFloat(product.price);
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;

      validatedItems.push({
        productId: product.id,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        product: product
      });
    }


    const order = await Order.create({
      tenantId: tenant.id,
      customerId,
      status: 'pending',
      totalAmount: totalAmount.toFixed(2),
      notes
    }, { transaction });


    for (const item of validatedItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal.toFixed(2)
      }, { transaction });
    }


    await transaction.commit();


    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Customer, as: 'customer' }
      ]
    });

    res.status(201).json(fullOrder);
  } catch (error) {
    console.error('Create order error:', error);
    await transaction.rollback();
    res.status(500).json({ error: 'Failed to create order' });
  }
};


exports.getOrders = async (req, res) => {
  try {
    const { tenant } = req;
    const orders = await Order.findAll({
      where: { tenantId: tenant.id },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Customer, as: 'customer' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};


exports.getOrder = async (req, res) => {
  try {
    const { tenant } = req;
    const { id } = req.params;
    const order = await Order.findOne({
      where: { id, tenantId: tenant.id },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Customer, as: 'customer' }
      ]
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};


exports.updateOrderStatus = async (req, res) => {
  try {
    const { tenant } = req;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findOne({ where: { id, tenantId: tenant.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = status;
    await order.save();

    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Customer, as: 'customer' }
      ]
    });

    res.json({ success: true, message: 'Order status updated', order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};


exports.updateOrder = async (req, res) => {
  const transaction = await Order.sequelize.transaction();
  try {
    const { tenant } = req;
    const { id } = req.params;
    const { status, notes, items } = req.body;


    const order = await Order.findOne({
      where: { id, tenantId: tenant.id },
      include: [{ model: OrderItem, as: 'items' }]
    });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }


    if (status) order.status = status;
    if (notes !== undefined) order.notes = notes;


    if (items && Array.isArray(items)) {
      // Remove old items
      await OrderItem.destroy({ where: { orderId: order.id }, transaction });

      let totalAmount = 0;
      const productIds = items.map(i => i.productId);

      // Fetch valid products
      const products = await Product.findAll({
        where: { id: productIds, tenantId: tenant.id }
      });

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);

        if (!product) continue;

        // Apply your availability logic
        if (product.stock <= 0 && product.available === false) {
          continue; // Skip unavailable items
        }

        const quantity = item.quantity || 1;
        const unitPrice = parseFloat(product.price);
        const subtotal = unitPrice * quantity;
        totalAmount += subtotal;

        await OrderItem.create({
          orderId: order.id,
          productId: product.id,
          quantity,
          unitPrice: unitPrice,
          subtotal: subtotal.toFixed(2)
        }, { transaction });
      }


      order.totalAmount = totalAmount.toFixed(2);
    }

    await order.save({ transaction });
    await transaction.commit();


    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Customer, as: 'customer' }
      ]
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order error:', error);
    await transaction.rollback();
    res.status(500).json({ error: 'Failed to update order' });
  }
};


exports.cancelOrder = async (req, res) => {
  const transaction = await Order.sequelize.transaction();
  try {
    const { tenant } = req;
    const { id } = req.params;
    
    const order = await Order.findOne({ 
      where: { id, tenantId: tenant.id },
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }]
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }


    for (const orderItem of order.items) {
      const product = orderItem.product;
      if (product && product.stock >= 0) { // Only if product tracks stock
        await product.update({
          stock: product.stock + orderItem.quantity,
          available: true // Re-enable product
        }, { transaction });
      }
    }
    
    order.status = 'cancelled';
    await order.save({ transaction });
    
    await transaction.commit();

    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Customer, as: 'customer' }
      ]
    });
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('Cancel order error:', error);
    await transaction.rollback();
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const { tenant } = req;
    const { id } = req.params;

    const order = await Order.findOne({ where: { id, tenantId: tenant.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await order.destroy();
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
};