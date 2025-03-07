export const components = {
    schemas: {
        Customer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              contactInfo: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' }
                }
              },
              billingDetails: {
                type: 'object',
                properties: {
                  dailyRate: { type: 'number' },
                  currency: { type: 'string' },
                  paymentTerms: { type: 'string' }
                }
              }
            }
        },
        User: {
            type: 'object',
            properties: {
                email: { type: 'string', format: 'email', required: true },
                password: { type: 'string', format: 'password', minLength: 8, required: true },
                firstName: { type: 'string', required: true },
                lastName: { type: 'string', required: true }
            },
        },
        LoginInput: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', required: true },
            password: { type: 'string', format: 'password', required: true }
          }
        },
        Project: {
            type: 'object',
            properties: {
                name: { type: 'string', required: true },
                description: { type: 'string' },
                url: { type: 'string', format: 'url' },
                customerId: { type: 'string', format: 'uuid' }
            }
        }
    }
};