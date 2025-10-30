const axios = require('axios');
require('dotenv').config();
const { Op } = require('sequelize');
const { Tenant, Customer, Order, OrderItem, Product, UsageStat } = require('../models');

  async function generateResponse(tenantId, customerMessage, conversationContext = {}, customerId = null) {
          const tenant = await Tenant.findByPk(tenantId);
          const context = conversationContext || {};
    try {

      if (!tenant) throw new Error('Tenant not found');

      let customer = null;
      if (customerId) {
        customer = await Customer.findOne({ where: { id: customerId, tenantId } });
      }

      // Get recent orders for context
    //   let recentOrders = [];
    //   if (customer) {
    //     recentOrders = await Order.findAll({
    //       where: { customerId: customer.id, tenantId },
    //       include: [{
    //         model: OrderItem,
    //         include: [Product]
    //       }],
    //       order: [['createdAt', 'DESC']],
    //       limit: 3
    //     });
    //   }

    //   const availableProducts = await Product.findAll({
    //     where: {
    //       tenantId,
    //       isActive: true,
    //       stockQuantity: { [Op.gt]: 0 }
    //     },
    //     order: [['name', 'ASC']],
    //     limit: 20
    //   });

    const availableProducts = [
  {
    "name": "Plain White T-Shirt",
    "price": 4500,
    "stock_quantity": 42,
    "category": "Tops",
    "description": "Classic cotton tee for everyday wear"
  },
  {
    "name": "Slim Fit Jeans",
    "price": 9800,
    "stock_quantity": 30,
    "category": "Bottoms",
    "description": "Dark wash slim jeans, stretch denim"
  },
  {
    "name": "Ankara Short Gown",
    "price": 12500,
    "stock_quantity": 12,
    "category": "Dresses",
    "description": "African print gown, perfect for occasions"
  },
  {
    "name": "Black Hoodie",
    "price": 11000,
    "stock_quantity": 18,
    "category": "Outerwear",
    "description": "Fleece-lined hoodie with drawstrings"
  },
  {
    "name": "Chinos (Khaki)",
    "price": 8700,
    "stock_quantity": 22,
    "category": "Bottoms",
    "description": "Comfortable chinos for casual or office"
  }, 
  {
    "name": "Denim Jacket",
    "price": 13500,
    "stock_quantity": 14,
    "category": "Outerwear",
    "description": "Stylish distressed denim jacket"
  },
  {
    "name": "Palazzo Trousers",
    "price": 9200,
    "stock_quantity": 16,
    "category": "Bottoms",
    "description": "High-waisted wide-leg palazzo pants"
  },
  {
    "name": "Bodycon Dress",
    "price": 10500,
    "stock_quantity": 20,
    "category": "Dresses",
    "description": "Figure-hugging stretchy dress"
  },
  {
    "name": "Traditional Senator Wear",
    "price": 18000,
    "stock_quantity": 8,
    "category": "Traditional",
    "description": "Well-tailored senator outfit for men"
  },
  {
    "name": "Silk Pyjamas",
    "price": 7400,
    "stock_quantity": 25,
    "category": "Loungewear",
    "description": "Soft silk two-piece for comfy sleep"
  }
]

        // Get recent orders for context
        const recentOrders = [
  {
    "order_number": "ORD10239",
    "created_at": "2025-06-22T14:25:00Z",
    "status": "delivered",
    "total_amount": 22300,
    "items": [
      { "name": "Plain White T-Shirt", "quantity": 2, "price": 4500 },
      { "name": "Chinos (Khaki)", "quantity": 1, "price": 8700 }
    ]
  },
  {
    "order_number": "ORD10212",
    "created_at": "2025-06-18T09:40:00Z",
    "status": "shipped",
    "total_amount": 13500,
    "items": [
      { "name": "Denim Jacket", "quantity": 1, "price": 13500 }
    ]
  },
  {
    "order_number": "ORD10195",
    "created_at": "2025-06-14T16:10:00Z",
    "status": "processing",
    "total_amount": 19700,
    "items": [
      { "name": "Bodycon Dress", "quantity": 1, "price": 10500 },
      { "name": "Silk Pyjamas", "quantity": 1, "price": 9200 }
    ]
  }
]


      // Build enhanced context-aware prompt
      const systemPrompt = buildEnhancedSystemPrompt(tenant, customer, availableProducts, recentOrders, context);
      
      // Analyze message intent
      const intent = await analyzeIntent(customerMessage);
      
      // Generate response based on intent
      const response = await callGemini(systemPrompt, customerMessage, intent);
      
      // Track token usage
    //   await this.trackTokenUsage(tenantId, response.usage?.total_tokens || 0);
      
      return {
        message: response.choices[0].message.content,
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
- Order #${order.order_number} (${new Date(order.created_at).toLocaleDateString()})
  Status: ${order.status}
  Total: ₦${order.total_amount}
  Items: ${order.items.map(item => `${item.name} (${item.quantity}x ₦${item.price})`).join(', ')}
`).join('')}
` : 'Customer: New customer - no previous order history';

    const productsInfo = products.length > 0 ? `
Available Products:
${products.map(p => `- ${p.name}: ₦${p.price} (${p.stock_quantity} in stock) - ${p.description || p.category || 'No description'}`).join('\n')}
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
- Build trust with personalized, relevant interactions.`;

    return basePrompt;
  }

async function callGemini(systemPrompt, userMessage, intent) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    } else if (lowerMessage.includes('track') || lowerMessage.includes('status') || lowerMessage.includes('order')) {
      return 'order_status';
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('good')) {
      return 'greeting';
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