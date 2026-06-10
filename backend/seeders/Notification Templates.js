import { v4 as uuidv4 } from 'uuid';

export default {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('notification_templates', [
      {
        id: uuidv4(),
        name: 'Standard Confirmation',
        subject: 'Your Appointment is Confirmed!',
        body: `
          <h2>Hello {{customerName}},</h2>
          <p>Your appointment has been confirmed. Here are the details:</p>
          <ul>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Date:</strong> {{date}}</li>
            <li><strong>Time:</strong> {{time}}</li>
          </ul>
          <p>We look forward to seeing you!</p>
          <p>— The Salon Team</p>
        `,
        isActive: true,
        requiresVip: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Reminder Template',
        subject: 'Reminder: Your Appointment Tomorrow',
        body: `
          <h2>Hi {{customerName}},</h2>
          <p>This is a friendly reminder about your upcoming appointment:</p>
          <ul>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Date:</strong> {{date}}</li>
            <li><strong>Time:</strong> {{time}}</li>
          </ul>
          <p>Please arrive 5 minutes early. See you soon!</p>
          <p>— The Salon Team</p>
        `,
        isActive: true,
        requiresVip: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'VIP Confirmation',
        subject: '✨ Your VIP Appointment is Confirmed',
        body: `
          <h2>Dear {{customerName}},</h2>
          <p>{{vipExtra}}</p>
          <p>We are delighted to confirm your VIP appointment:</p>
          <ul>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Date:</strong> {{date}}</li>
            <li><strong>Time:</strong> {{time}}</li>
          </ul>
          <p>Our team is ready to provide you with an exceptional experience.</p>
          <p>— The Salon Team</p>
        `,
        isActive: true,
        requiresVip: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('notification_templates', null, {});
  },
};
