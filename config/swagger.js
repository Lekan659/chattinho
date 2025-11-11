// config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chattinho API',
      version: '1.0.0',
      description: 'Multi-tenant WhatsApp chatbot API with AI integration',
      contact: {
        name: 'API Support',
        email: 'support@chattinho.com'
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;