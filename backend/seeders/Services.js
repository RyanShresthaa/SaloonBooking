import { v4 as uuidv4 } from 'uuid';

export default {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('services', [
      {
        id: uuidv4(),
        name: 'Haircut',
        description: 'Classic haircut and styling',
        duration: 30,
        price: 25.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Manicure',
        description: 'Full manicure with nail polish',
        duration: 45,
        price: 35.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Spa Treatment',
        description: 'Full body relaxation spa',
        duration: 90,
        price: 80.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Massage',
        description: 'Deep tissue massage',
        duration: 60,
        price: 60.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Pedicure',
        description: 'Full pedicure with nail care',
        duration: 45,
        price: 40.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('services', null, {});
  },
};
