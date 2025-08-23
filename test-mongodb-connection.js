const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://absrasel:65tCTdX2QQ5Sg4xE@redxtrm.o0l67jz.mongodb.net/?retryWrites=true&w=majority&appName=redxtrm';

async function testConnection() {
  const client = new MongoClient(uri);
  
  try {
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test database access
    const db = client.db();
    const collections = await db.collections();
    console.log(`✅ Found ${collections.length} collections`);
    
    // Check users collection
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`✅ Found ${userCount} users in the database`);
    
    // List first few users (without password)
    const users = await usersCollection.find({}, { projection: { password: 0 } }).limit(5).toArray();
    console.log('\nUsers in database:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Role: ${user.role || 'member'}`);
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();
