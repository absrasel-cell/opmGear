const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = 'mongodb+srv://absrasel:65tCTdX2QQ5Sg4xE@redxtrm.o0l67jz.mongodb.net/?retryWrites=true&w=majority&appName=redxtrm';

async function createTestUser() {
  const client = new MongoClient(uri, {
    tls: true,
    // Temporarily allow invalid certificates for testing
    tlsAllowInvalidCertificates: true,
  });
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ email: 'absrasel@gmail.com' });
    if (existingUser) {
      console.log('✅ User absrasel@gmail.com already exists');
      console.log('User details:', {
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role || 'member'
      });
      return;
    }
    
    // Create new user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const result = await usersCollection.insertOne({
      email: 'absrasel@gmail.com',
      password: hashedPassword,
      name: 'Abs Rasel',
      role: 'admin',
      adminLevel: 'master',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ User created successfully!');
    console.log('Login credentials:');
    console.log('  Email: absrasel@gmail.com');
    console.log('  Password: password123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

createTestUser();
