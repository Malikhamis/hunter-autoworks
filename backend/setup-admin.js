require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hunterautoworks', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin account already exists!');
      process.exit(0);
    }
    
    // Create admin account
    const password = 'admin123'; // Default password - change this in production
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = new Admin({
      username: 'admin',
      password: hashedPassword
    });
    
    await admin.save();
    console.log('Admin account created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Please change the password after first login!');
    
  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    mongoose.disconnect();
  }
}

setupAdmin();
