# AI-Assisted Timetable Scheduling System

A complete full-stack timetable management system built with Next.js, MongoDB, Tailwind CSS, and ShadCN UI. Features intelligent conflict detection, real-time validation, and comprehensive CRUD operations for teachers, subjects, and timetables.

## 🚀 Features

- **Admin Authentication**: Secure login/register system with JWT and bcrypt
- **Timetable Builder**: Interactive weekly timetable grid with drag-and-drop functionality
- **Teacher Clash Detection**: Real-time conflict detection for teacher assignments
- **Auto Validation**: Automatic validation of lecture hours and periods
- **Workload Calculation**: Automatic calculation of teacher workload and remaining hours
- **CRUD Management**: Complete management panels for teachers, subjects, and timetables
- **Conflict Alerts**: Visual indicators for conflicts and warnings
- **Progress Tracking**: Real-time progress bars for remaining hours/periods

## 🛠 Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- ShadCN UI
- React Hook Form
- Zustand (State Management)
- Lucide React (Icons)

### Backend
- Next.js API Routes
- Mongoose ORM
- MongoDB
- JWT Authentication
- Bcrypt Password Hashing

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-timetable-scheduling-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/timetable-scheduler
   JWT_SECRET=your-secret-key-change-in-production
   ```

4. **Seed the database**
   ```bash
   npm run seed
   ```
   
   This will populate the database with the initial teacher data.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Database Models

### Teacher Model
- `teacherID`: Unique identifier
- `faculty_name`: Teacher's name
- `subject_name`: Subject they teach
- `department`: Department name
- `teaching_hours`: Total teaching hours
- `teacher_number`: Contact number
- `classroom`: Assigned classroom
- `assignedHours`: Currently assigned hours (auto-calculated)
- `remainingHours`: Remaining hours (auto-calculated)

### Subject Model
- `subject_name`: Subject name
- `subject_code`: Unique subject code
- `teacherId`: Reference to Teacher
- `requiredPeriods`: Total required periods
- `allottedPeriods`: Currently allotted periods (auto-calculated)
- `remainingPeriods`: Remaining periods (auto-calculated)

### Timetable Model
- `className`: Class identifier
- `day`: Day of the week
- `timeSlot`: Time slot (e.g., "09:00-10:00")
- `subjectId`: Reference to Subject
- `teacherId`: Reference to Teacher
- `status`: "valid" or "conflict"
- `createdBy`: Reference to User

## 🔐 API Routes

### Authentication
- `POST /api/auth/register` - Register new admin
- `POST /api/auth/login` - Login admin
- `POST /api/auth/logout` - Logout admin

### Teachers
- `GET /api/teachers` - Get all teachers
- `POST /api/teachers` - Create teacher
- `GET /api/teachers/[id]` - Get single teacher
- `PUT /api/teachers/[id]` - Update teacher
- `DELETE /api/teachers/[id]` - Delete teacher

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject
- `GET /api/subjects/[id]` - Get single subject
- `PUT /api/subjects/[id]` - Update subject
- `DELETE /api/subjects/[id]` - Delete subject

### Timetable
- `POST /api/timetable/add` - Add timetable entry
- `GET /api/timetable/list` - List timetable entries
- `POST /api/timetable/validate` - Validate timetable
- `DELETE /api/timetable/delete` - Delete timetable entry

## 🎯 Scheduling Rules

The system enforces the following validation rules:

1. **Teacher Conflict**: Teacher cannot be assigned to multiple classes at the same time slot
2. **Class Conflict**: Class cannot have multiple subjects at the same time slot
3. **Teaching Hours**: Teacher's assigned hours cannot exceed teaching hours
4. **Required Periods**: Subject's allotted periods cannot exceed required periods
5. **1 Hour = 1 Lecture**: Each timetable entry represents exactly 1 hour

## 📖 Usage Guide

### 1. Register/Login
- Navigate to `/register` to create an admin account
- Or login at `/login` if you already have an account

### 2. Manage Teachers
- Go to the "Teachers" tab
- Click "Add Teacher" to create new teachers
- Edit or delete existing teachers

### 3. Manage Subjects
- Go to the "Subjects" tab
- Click "Add Subject" to create new subjects
- Assign subjects to teachers
- Set required periods for each subject

### 4. Build Timetable
- Go to the "Timetable Builder" tab
- Enter a class name (e.g., "CS-101")
- Click on any time slot to add a subject
- Select a subject from the dropdown
- The system will automatically validate and show conflicts
- Use "Validate Timetable" to check all entries

## 🎨 UI Components

The project uses ShadCN UI components:
- Button
- Input
- Card
- Alert
- Custom timetable grid

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- Middleware for route protection
- HTTP-only cookies for tokens

## 📝 Project Structure

```
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard page
│   ├── login/            # Login page
│   ├── register/         # Register page
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # ShadCN UI components
│   ├── TimetableBuilder.tsx
│   ├── TeacherManagement.tsx
│   └── SubjectManagement.tsx
├── lib/
│   ├── mongodb.ts        # MongoDB connection
│   ├── auth.ts           # JWT utilities
│   ├── validation-engine.ts  # Scheduling rules
│   └── store.ts          # Zustand store
├── models/               # Mongoose models
├── scripts/
│   └── seed.js          # Database seed script
└── middleware.ts         # Route protection
```

## 🚧 Development

### Build for production
```bash
npm run build
npm start
```

### Run linting
```bash
npm run lint
```

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Support

For support, please open an issue in the repository.

---

Built with ❤️ using Next.js and MongoDB

