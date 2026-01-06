# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/timetable-scheduler
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

### Step 3: Start MongoDB
Make sure MongoDB is running on your system. If using MongoDB Atlas, update the `MONGODB_URI` in `.env.local`.

### Step 4: Seed Database
```bash
npm run seed
```

This will populate your database with 6 sample teachers.

### Step 5: Run Development Server
```bash
npm run dev
```

### Step 6: Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 7: Create Admin Account
1. Click "Register" or navigate to `/register`
2. Create your admin account
3. You'll be automatically logged in

## 📝 Next Steps

1. **Add Subjects**: Go to the "Subjects" tab and create subjects for each teacher
2. **Build Timetable**: Go to the "Timetable Builder" tab
   - Enter a class name (e.g., "CS-101")
   - Click on time slots to add subjects
   - The system will automatically validate for conflicts

## 🎯 Example Workflow

1. **Register/Login** → Create admin account
2. **Manage Teachers** → View seeded teachers (6 teachers already added)
3. **Create Subjects** → For each teacher, create a subject:
   - Subject Name: "Data Structures"
   - Subject Code: "CS301"
   - Teacher: Select "Dr. R. Sharma"
   - Required Periods: 6
4. **Build Timetable** → 
   - Enter class name: "CS-101"
   - Click Monday 09:00-10:00
   - Select a subject
   - System validates automatically

## ⚠️ Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod` or check MongoDB service
- Verify `MONGODB_URI` in `.env.local`
- For MongoDB Atlas, check network access settings

### Port Already in Use
- Change port: `PORT=3001 npm run dev`
- Or kill the process using port 3000

### Seed Script Fails
- Ensure MongoDB is running
- Check `.env.local` file exists
- Verify MongoDB connection string is correct

## 🔑 Default Data

The seed script adds 6 teachers:
- T001: Dr. R. Sharma (Data Structures, 6 hours)
- T002: Prof. Neha Patel (Database Management Systems, 5 hours)
- T003: Mr. Ankit Verma (Operating Systems, 4 hours)
- T004: Ms. Priya Nair (Computer Networks, 6 hours)
- T005: Dr. Kunal Mehta (Artificial Intelligence, 5 hours)
- T006: Prof. Sneha Desai (Software Engineering, 4 hours)

## 📚 Learn More

See [README.md](./README.md) for detailed documentation.

