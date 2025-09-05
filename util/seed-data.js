// 시드 데이터 스크립트
require('dotenv').config();
const database = require('./database');
const { User, DesignTemplate, Memo } = require('../models');

const seedData = {
  users: [
    {
      _id: '1',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123' // 실제 환경에서는 해시화 필요
    }
  ],
  
  designTemplates: [
    {
      id: '1',
      name: 'Classic White',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      borderStyle: '1px solid #e0e0e0',
      shadowStyle: '0 2px 8px rgba(0,0,0,0.1)',
      preview: '🎨'
    },
    {
      id: '2',
      name: 'Dark Theme',
      backgroundColor: '#2c3e50',
      textColor: '#ecf0f1',
      borderStyle: '1px solid #34495e',
      shadowStyle: '0 4px 12px rgba(0,0,0,0.3)',
      preview: '🌙'
    },
    {
      id: '3',
      name: 'Warm Beige',
      backgroundColor: '#f5f5dc',
      textColor: '#8b4513',
      borderStyle: '2px solid #d2b48c',
      shadowStyle: '0 3px 10px rgba(139,69,19,0.2)',
      preview: '☕'
    },
    {
      id: '4',
      name: 'Ocean Blue',
      backgroundColor: '#e8f4f8',
      textColor: '#2c3e50',
      borderStyle: '1px solid #3498db',
      shadowStyle: '0 2px 8px rgba(52,152,219,0.2)',
      preview: '🌊'
    }
  ]
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    await database.connect();
    
    // 기존 데이터 삭제
    console.log('🧹 Clearing existing data...');
    await DesignTemplate.deleteMany({});
    
    // 디자인 템플릿 생성
    console.log('🎨 Creating design templates...');
    await DesignTemplate.insertMany(seedData.designTemplates);
    console.log(`✅ Created ${seedData.designTemplates.length} design templates`);
    
    console.log('🎉 Database seeding completed successfully!');
    
    // 생성된 데이터 확인
    const templateCount = await DesignTemplate.countDocuments();
    
    console.log('📊 Final counts:');
    console.log(`   Templates: ${templateCount}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await database.close();
    process.exit(0);
  }
}

// 스크립트가 직접 실행될 때만 시드 실행
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedData, seedDatabase };
