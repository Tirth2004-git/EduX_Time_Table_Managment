const mongoose = require('mongoose');

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'admin' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function updateExistingUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable-scheduler');
    
    // Get all users and fix their name field
    const users = await User.find({});
    
    for (const user of users) {
      if (!user.name || user.name === '$username' || user.name.trim() === '') {
        user.name = user.username;
        await user.save();
        console.log(`Updated user: ${user.username} -> name: ${user.name}`);
      }
    }
    
    console.log('Update complete');
    
    // Display all users
    const allUsers = await User.find({}, 'username name email role');
    console.log('\nCurrent users:');
    allUsers.forEach(user => {
      console.log(`- ${user.username} (name: "${user.name}") - ${user.email}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
}

updateExistingUsers();