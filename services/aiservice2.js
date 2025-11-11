const axios = require('axios');
require('dotenv').config();
const { Op } = require('sequelize');
const { Tenant, Customer, Order, OrderItem, Product, UsageStat } = require('../models');
const { connectRedis, redisClient } = require('../services/redisservice');
const { Payment } = require('../models'); // ADD THIS

function extractJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
}


async function generateResponse(tenantId, customerMessage, conversationContext = {}, customerId = null) {
  const tenant = await Tenant.findByPk(tenantId);
  const context = conversationContext || {};
  
  try {
    if (!tenant) throw new Error('Tenant not found');

    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ where: { id: customerId, tenantId } });
    }

    // Get available products (cache this in production)

    await connectRedis();
    const cacheKey = `products:${tenantId}`;
    let availableProducts;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      availableProducts = JSON.parse(cached);
      console.log('✅ Products loaded from cache');
    } else {
      availableProducts = await Product.findAll({
        where: { tenantId, status: 'active', available: true },
        order: [['name', 'ASC']],
        limit: 50
      });
      // Cache for 5 minutes (300 seconds)
      await redisClient.setEx(cacheKey, 300, JSON.stringify(availableProducts));
      console.log('✅ Products cached');
          }

    // const availableProducts = await Product.findAll({
    //   where: {
    //     tenantId,
    //     status: 'active',
    //     available: true
    //   },
    //   order: [['name', 'ASC']],
    //   limit: 50
    // });

    

    // Get recent orders for context
    let recentOrders = [];
    if (customer) {
      const orderCacheKey = `orders:${customerId}:recent`;
      const cachedOrders = await redisClient.get(orderCacheKey);
      
      if (cachedOrders) {
        recentOrders = JSON.parse(cachedOrders);
        console.log('✅ Orders loaded from cache');
      } else {
        recentOrders = await Order.findAll({
          where: { customerId: customer.id, tenantId },
          include: [{
            model: OrderItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }]
          }],
          order: [['createdAt', 'DESC']],
          limit: 3
        });
        // Cache for 2 minutes (orders change frequently)
        await redisClient.setEx(orderCacheKey, 120, JSON.stringify(recentOrders));
      }
    }

    // Build enhanced context-aware prompt
    const systemPrompt = buildEnhancedSystemPrompt(tenant, customer, availableProducts, recentOrders, context);
    
    // Analyze message intent
    const intent = await analyzeIntent(customerMessage);
    
    // Generate response based on intent
    const response = await callGemini(systemPrompt, customerMessage, intent);
    const aiMessage = response.choices[0].message.content;

    // Check for structured actions in AI response
    if (aiMessage.includes('"action":')) {
      const jsonStr = extractJSON(aiMessage);
      if (jsonStr) {
        try {
          const actionData = JSON.parse(jsonStr);
          const actionResult = await handleAIAction(actionData, tenantId, customerId, context);
          
          if (actionResult) {
            return {
              message: actionResult.message,
              intent: actionData.action,
              orderId: actionResult.orderId,
              paymentLink: actionResult.paymentLink,
              context: actionResult.context || context
            };
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }
    }
    
    return {
      message: aiMessage,
      intent: intent,
      suggested_actions: getSuggestedActions(intent, customer, availableProducts)
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      message: getFallbackResponse(tenant?.businessType),
      intent: 'general',
      suggested_actions: []
    };
  }
}

// Master action handler
async function handleAIAction(actionData, tenantId, customerId, context) {
  switch (actionData.action) {
    case 'create_order':
      return await createOrderWithPayment(tenantId, customerId, actionData);
    
    case 'check_order_status':
      return await checkOrderStatus(actionData.order_id, tenantId);
    
    case 'get_order_history':
      return await getCustomerOrderHistory(customerId, tenantId);
    
    case 'initiate_payment':
      return await initiatePaymentForOrder(actionData.order_id, tenantId);
    
    case 'check_payment_status':
      return await checkPaymentStatus(actionData.order_id, tenantId);
    
    case 'confirm_partial':
      // Store partial order data in context for next message
      return {
        message: actionData.message,
        context: { 
          ...context, 
          awaitingPartialConfirmation: true,
          partialOrderData: actionData 
        }
      };
    
    case 'cancel_order':
      return await cancelOrder(actionData.order_id, tenantId);
    
    default:
      return null;
  }
}

// Create order with automatic payment link generation
async function createOrderWithPayment(tenantId, customerId, orderData) {
  try {
    // Map AI item names to actual product IDs
    const items = [];
    for (const item of orderData.items) {
      const product = await Product.findOne({
        where: { 
          tenantId,
          name: { [Op.iLike]: `%${item.product_name}%` }
        }
      });
      
      if (!product) {
        return { 
          message: `Product "${item.product_name}" not found`,
          success: false 
        };
      }

      // Check stock availability
      if (product.stock <= 0 && product.available === false) {
        return {
          message: `${product.name} is out of stock and unavailable for pre-order`,
          success: false
        };
      }

      items.push({
        productId: product.id,
        quantity: item.quantity
      });
    }

    // Create order
    const order = await Order.create({
      tenantId,
      customerId,
      status: 'pending',
      totalAmount: orderData.total,
      notes: orderData.notes || null,
      deliveryAddress: orderData.delivery_address || null,
      deliveryPhone: orderData.delivery_phone || null
    });

    // Create order items
    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      const unitPrice = parseFloat(product.price);
      const subtotal = unitPrice * item.quantity;

      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: unitPrice,
        subtotal: subtotal.toFixed(2)
      });
    }
    await connectRedis();
    await redisClient.del(`orders:${customerId}:recent`);
    console.log('✅ Order cache invalidated');
    // Generate payment link
    const paymentResult = await Payment.create({
      tenantId,
      customerId,
      orderId: order.id,
      paymentNumber: `PAY-${Date.now()}`,
      amount: order.totalAmount,
      currency: 'NGN',
      status: 'pending',
      provider: 'paystack',
      reference: `rora_${order.id}_${Date.now()}`
    });

    // Call Paystack API
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: Math.round(order.totalAmount * 100),
        email: `customer_${customerId}@tenant_${tenantId}.rora`,
        currency: 'NGN',
        reference: paymentResult.reference,
        metadata: { tenantId, orderId: order.id, customerId }
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const authUrl = paystackResponse.data.data.authorization_url;

    return {
      message: `${orderData.message}\n\nOrder #${order.id} created!\nTotal: ₦${order.totalAmount}\n\nPay here: ${authUrl}`,
      orderId: order.id,
      paymentLink: authUrl,
      success: true
    };
  } catch (error) {
    console.error('Create order error:', error);
    return {
      message: 'Failed to create order. Please try again.',
      success: false
    };
  }
}

// Check order status
async function checkOrderStatus(orderId, tenantId) {
  try {
    const order = await Order.findOne({
      where: { id: orderId, tenantId },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!order) {
      return { message: 'Order not found', success: false };
    }

    const payment = order.payments?.find(p => p.status === 'completed');
    const itemsList = order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ');

    let statusMessage = `Order #${order.id}\nStatus: ${order.status}\nTotal: ₦${order.totalAmount}\nItems: ${itemsList}`;
    
    if (payment) {
      statusMessage += `\n✅ Payment confirmed`;
    } else if (order.status === 'pending') {
      statusMessage += `\n⏳ Awaiting payment`;
    }

    return { message: statusMessage, success: true };
  } catch (error) {
    console.error('Check order status error:', error);
    return { message: 'Failed to check order status', success: false };
  }
}

// Get customer order history
async function getCustomerOrderHistory(customerId, tenantId) {
  try {
    const orders = await Order.findAll({
      where: { customerId, tenantId },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (orders.length === 0) {
      return { message: 'No previous orders found', success: true };
    }

    let historyMessage = 'Your Recent Orders:\n\n';
    orders.forEach((order, index) => {
      const isPaid = order.payments?.some(p => p.status === 'completed');
      historyMessage += `${index + 1}. Order #${order.id}\n`;
      historyMessage += `   Date: ${new Date(order.createdAt).toLocaleDateString()}\n`;
      historyMessage += `   Status: ${order.status} ${isPaid ? '✅ Paid' : '⏳ Pending'}\n`;
      historyMessage += `   Total: ₦${order.totalAmount}\n\n`;
    });

    return { message: historyMessage, success: true };
  } catch (error) {
    console.error('Get order history error:', error);
    return { message: 'Failed to get order history', success: false };
  }
}

// Initiate payment for existing order
async function initiatePaymentForOrder(orderId, tenantId) {
  try {
    const order = await Order.findOne({ where: { id: orderId, tenantId } });

    if (!order) {
      return { message: 'Order not found', success: false };
    }

    if (order.status !== 'pending') {
      return { message: 'Order already processed', success: false };
    }

    // Check if payment already exists and is completed
    const existingPayment = await Payment.findOne({ 
      where: { orderId, status: 'completed' } 
    });

    if (existingPayment) {
      return { message: 'Order already paid', success: false };
    }

    // Generate new payment
    const payment = await Payment.create({
      tenantId,
      customerId: order.customerId,
      orderId: order.id,
      paymentNumber: `PAY-${Date.now()}`,
      amount: order.totalAmount,
      currency: 'NGN',
      status: 'pending',
      provider: 'paystack',
      reference: `rora_${order.id}_${Date.now()}`
    });

    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: Math.round(order.totalAmount * 100),
        email: `customer_${order.customerId}@tenant_${tenantId}.rora`,
        currency: 'NGN',
        reference: payment.reference,
        metadata: { tenantId, orderId: order.id }
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    return {
      message: `Payment link for Order #${orderId}:\n${paystackResponse.data.data.authorization_url}`,
      paymentLink: paystackResponse.data.data.authorization_url,
      success: true
    };
  } catch (error) {
    console.error('Initiate payment error:', error);
    return { message: 'Failed to generate payment link', success: false };
  }
}

// Check payment status
async function checkPaymentStatus(orderId, tenantId) {
  try {
    const payment = await Payment.findOne({
      where: { orderId, tenantId },
      include: [{ model: Order, as: 'order' }]
    });

    if (!payment) {
      return { message: 'No payment found for this order', success: false };
    }

    let statusMessage = `Payment Status for Order #${orderId}\n`;
    statusMessage += `Amount: ₦${payment.amount}\n`;
    statusMessage += `Status: ${payment.status}\n`;
    
    if (payment.status === 'completed') {
      statusMessage += `✅ Payment confirmed`;
    } else if (payment.status === 'pending') {
      statusMessage += `⏳ Awaiting payment confirmation`;
    } else {
      statusMessage += `❌ Payment failed`;
    }

    return { message: statusMessage, success: true };
  } catch (error) {
    console.error('Check payment status error:', error);
    return { message: 'Failed to check payment status', success: false };
  }
}

// Cancel order
async function cancelOrder(orderId, tenantId) {
  try {
    const order = await Order.findOne({ where: { id: orderId, tenantId } });

    if (!order) {
      return { message: 'Order not found', success: false };
    }

    if (order.status !== 'pending') {
      return { message: 'Only pending orders can be cancelled', success: false };
    }

    order.status = 'cancelled';
    await order.save();

    return { message: `Order #${orderId} has been cancelled`, success: true };
  } catch (error) {
    console.error('Cancel order error:', error);
    return { message: 'Failed to cancel order', success: false };
  }
}


function buildEnhancedSystemPrompt(tenant, customer, products, recentOrders, context) {
    const customerInfo = customer ? `
Customer Information:
- Name: ${customer.name || 'Not provided'}
- Phone: ${customer.whatsappNumber}
- Total Orders: 3
- Total Spent: ₦55500
- Customer Since: ${new Date(customer.createdAt).toLocaleDateString()}

Recent Orders:
${recentOrders.map(order => `
- Order #${order.id} (${new Date(order.createdAt).toLocaleDateString()})
  Status: ${order.status}
  Total: ₦${order.totalAmount}
  Items: ${order.items.map(item => `${item.product.name} (${item.quantity}x ₦${item.unitPrice})`).join(', ')}
`).join('')}
` : 'Customer: New customer - no previous order history';

    const productsInfo = products.length > 0 ? `
Available Products:
${products.map(p => `- ${p.name}: ₦${p.price} (${p.stock} in stock) - ${p.description || p.category || 'No description'}`).join('\n')}
` : 'No products currently available';

    const basePrompt = `Nigerian Sales Bot Prompt
Core Identity & Context Awareness
You are an expert Nigerian sales assistant for ${tenant.businessName}, a ${tenant.businessType} business in Lagos, Nigeria. Your goal is to convert inquiries into sales while building trust and maintaining a natural, context-aware conversation. You understand Nigerian Pidgin and formal English, adapting to the customer's tone.

CRITICAL RULES:
- ALWAYS review the full conversation history before responding.
- NEVER use greetings (e.g., "Good morning") after the first message unless 12+ hours have passed since the last customer message.
- NEVER restart the conversation or ask "How can I help you today?" after an order is confirmed unless the customer explicitly initiates a new inquiry.
- ALWAYS reference relevant prior messages (e.g., product mentioned, budget, address) to avoid repetitive questions.
- Track conversation state: Initial Contact, Active Conversation, Order Confirmed, Order Completed.

Conversation State Management
1. Initial Contact (First Message):
- Use ONE greeting based on time (e.g., "Good morning!" for 00:00-11:59, "Good afternoon!" for 12:00-17:59, "Good evening!" for 18:00-23:59).
- Example: "Good morning! Welcome to ${tenant.businessName}. What are you looking for today?"
- For direct requests (e.g., "I want senator wear"), confirm the request and provide details: "Senator wear? We have it for ₦18,000. Should I send photos or confirm your size?"

2. Active Conversation (Subsequent Messages):
- NO greetings unless 12+ hours have passed.
- Reference prior messages: "You mentioned senator wear earlier. It’s ₦18,000. Need photos or ready to buy?"
- Summarize key points after 10+ exchanges: "To recap, you’re interested in senator wear, budget around ₦20,000, delivery to Yaba."
- If the customer repeats a request (e.g., "I said senator wear"), apologize and confirm: "My apologies for the mix-up! You want the senator wear at ₦18,000, right?"

3. Order Confirmed/Payment Received:
- Confirm payment and provide clear next steps: "Payment received for senator wear! We’ll deliver to [address] in 2-3 days. Tracking details coming soon."
- DO NOT ask "What else can I help with?" unless the customer initiates a new request.
- If the customer says "Thank you" or similar, respond minimally: "You’re welcome! Let me know if you need anything else."

4. Order Completed/Delivered:
- Follow up only if prompted or after delivery: "Hope you’re loving your senator wear! Any feedback?"
- Avoid pushing new sales unless the customer shows interest.

Context Retention
- Maintain a summary of the last 5 exchanges, including:
  - Products discussed (e.g., senator wear, white t-shirt).
  - Customer details (e.g., name, address, budget).
  - Objections or concerns (e.g., price, quality).
- If asked about prior messages, accurately summarize: "Your last three messages were about ordering a senator wear, confirming payment, and providing your address in Yaba."
- If the customer repeats information (e.g., address), acknowledge: "Got it, you’re at Tobi Street, Yaba, as you mentioned."

Customer Service Edge Cases
1. Off-Topic Questions (e.g., asking about food):
- Acknowledge politely: "I’m focused on fashion at ${tenant.businessName}, so I can’t recommend pasta spots, but I can help with outfits for your dining plans!"
- Gently pivot: "Speaking of style, are you looking for something to wear out in Lagos?"

2. Complaints (e.g., stained shirt):
- Acknowledge immediately: "I’m so sorry about the stained shirt. That’s not our standard."
- Request details: "Please send a photo of the stain and your order number (e.g., 0RD10239)."
- Offer solutions: "I’ll arrange a replacement or full refund right away. Your choice."
- Follow up: "I’ll ensure the replacement is checked before shipping. Anything else I can do?"

3. Repetitive Customer Requests:
- If the customer repeats (e.g., "I said senator wear"), apologize and clarify: "Sorry for the confusion! You’re set on the senator wear at ₦18,000. Ready to proceed?"
- Avoid asking for information already provided (e.g., address, payment status).

Order Management
- Confirm orders clearly: "You’re ordering one senator wear at ₦18,000. Please send payment to Midi Bank, Account 1234567890."
- After payment: "Payment confirmed for order #0RD10239. Delivering to [address] in 2-3 days."
- If the customer claims payment was made, verify: "Thanks for letting me know! Please share the order number or transaction name so I can confirm."

Business Information
- Contact: ${tenant.contactPerson}
- Phone: ${tenant.whatsappNumber}
- Address: ${tenant.businessAddress || 'Not specified'}
- Customer Info: ${customerInfo}
- Products: ${productsInfo}
 dos
- Context: ${JSON.stringify(context, null, 2)}

Response Guidelines
- Be concise, polite, and professional.
- Always end with a clear call-to-action (e.g., "Should I send photos?" or "Please provide your address.").
- For unknown products: "We don’t have that in stock, but I can suggest similar options. What style are you looking for?"
- Escalate complex issues to ${tenant.contactPerson} at ${tenant.whatsappNumber}.

Success Metrics
- Convert inquiries to sales.
- Ensure customer satisfaction through context-aware, non-repetitive responses.
- Build trust with personalized, relevant interactions.

CRITICAL ORDER HANDLING:
When customer wants to buy something, respond in this exact JSON format:
{
  "type": "order_request",
  "items": [
    {"product_name": "Plain White T-Shirt", "quantity": 2, "price": 4500},
    {"product_name": "Slim Fit Jeans", "quantity": 1, "price": 9800}
  ],
  "total": 18800,
  "message": "I've prepared your order: 2 Plain White T-Shirts and 1 Slim Fit Jeans for ₦18,800. Should I proceed?"
}

If stock is insufficient, use:
{
  "type": "stock_confirmation",
  "product": "Plain White T-Shirt",
  "requested": 5,
  "available": 3,
  "message": "We have only 3 Plain White T-Shirts available out of 5 you requested. Continue with 3?"
}

For creating orders:
{
  "action": "create_order",
  "items": [{"product_name": "Plain White T-Shirt", "quantity": 2}],
  "total": 9000,
  "message": "Order summary message",
  "delivery_address": "customer address if provided",
  "delivery_phone": "customer phone if provided"
}

For checking order status:
{
  "action": "check_order_status",
  "order_id": "order_id_here",
  "message": "Let me check your order status..."
}

For order history:
{
  "action": "get_order_history",
  "message": "Let me pull up your order history..."
}

For payment initiation:
{
  "action": "initiate_payment",
  "order_id": "order_id_here",
  "message": "Generating payment link..."
}

For payment status:
{
  "action": "check_payment_status",
  "order_id": "order_id_here",
  "message": "Checking payment status..."
}


`;

    return basePrompt;
  }

async function callGemini(systemPrompt, userMessage, intent) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nIntent: ${intent}\nMessage: ${userMessage}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
          topP: 0.8,
          topK: 40
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the generated text from Gemini's response format
    const generatedText = response.data.candidates[0].content.parts[0].text;
    
    // Return in a format similar to OpenAI for compatibility
    return {
      choices: [{
        message: {
          content: generatedText
        }
      }]
    };
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw error;
  }
}

function getFallbackResponse(businessType) {
    const fallbacks = {
      shortlet: "Thank you for your interest! I'd be happy to help you find the perfect accommodation. Could you tell me your preferred dates and number of guests?",
      restaurant: "Hello! Welcome to our restaurant. How can I help you today? Would you like to make a reservation or place an order?",
      retail: "Hi there! Thanks for contacting us. What can I help you find today?",
      default: "Hello! Thank you for your message. How can I assist you today?"
    };
    
    return fallbacks[businessType] || fallbacks.default;
  }
  
async function analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simple intent classification
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
      return 'pricing_inquiry';
    } else if (lowerMessage.includes('order') || lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
      return 'order_intent';
    } else if (lowerMessage.includes('available') || lowerMessage.includes('stock') || lowerMessage.includes('have')) {
      return 'availability_check';
    } else if (lowerMessage.includes('delivery') || lowerMessage.includes('deliver') || lowerMessage.includes('shipping')) {
      return 'delivery_inquiry';
    } else if (lowerMessage.includes('complaint') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
      return 'complaint';
    } else if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) {
      return 'cancellation';
    } else if (lowerMessage.includes('track') || lowerMessage.includes('status') || lowerMessage.includes('check')) {
      return 'order_status';
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('good')) {
      return 'greeting';
    } else if (lowerMessage.includes('history') || lowerMessage.includes('previous') || lowerMessage.includes('past orders')) {
    return 'order_history';
  } else if (lowerMessage.includes('pay') || lowerMessage.includes('payment')) {
    return 'payment_inquiry';
  } else if (lowerMessage.includes('cancel')) {
    return 'cancellation';
  }
    
    return 'general_inquiry';
  }

  function getSuggestedActions(intent, customer, products) {
    const actions = [];
    
    switch (intent) {
      case 'order_intent':
        actions.push('create_order', 'check_inventory', 'calculate_total');
        break;
      case 'pricing_inquiry':
        actions.push('show_catalog', 'send_price_list');
        break;
      case 'availability_check':
        actions.push('check_stock', 'suggest_alternatives');
        break;
      case 'delivery_inquiry':
        actions.push('calculate_delivery_fee', 'show_delivery_options');
        break;
      case 'order_status':
        if (customer) actions.push('check_order_status', 'show_recent_orders');
        break;
    }
    
    return actions;
  }


  module.exports = { 
    generateResponse
};