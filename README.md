# 📅 Edux - Smart Faculty & Timetable Planner

> **An Enterprise-Grade, AI-Assisted Academic Timetable Scheduling System with Dynamic Constraint Validation, Real-Time Conflict Resolution, and Multi-Role Portals.**

---

> [!IMPORTANT]
> **Architecture Update:** This project has been fully migrated to use a strictly enforced Local MongoDB database (mongodb://127.0.0.1:27017/timetable-scheduler). All legacy static JSON data flows and mock datasets have been completely eradicated from the runtime. The frontend and backend are 100% database-driven.



[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)](https://jwt.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green.svg?style=for-the-badge)](#project-status)

---

## 🎯 Project Overview

### Problem Statement
In modern academic institutions, drafting a conflict-free timetable manually is a monumental challenge. Administrators face a multi-dimensional constraint-satisfaction puzzle: coordinating hundreds of faculty members, matching subject curricula with specific weekly periods, ensuring physical classrooms are not double-booked, and managing faculty leave or sudden absences. Doing this manually or via static spreadsheets leads to:
- **Scheduling Clashes:** Teachers assigned to multiple locations or divisions in the same time slot.
- **Resource Underutilization:** Classrooms sitting empty while others are overloaded.
- **Data Inconsistencies:** Out-of-sync workloads where teachers are assigned more hours than their contractual limits.
- **Administrative Delays:** Rescheduling due to leaves or substitutions takes hours of coordination.

### Solution
**EduX** is a sophisticated, full-stack scheduling workspace that combines a **real-time relational validation engine** with **AI-assisted heuristic generators** (including Google Gemini models) to automatically produce conflict-free, optimized timetables. Built on top of a highly normalized MongoDB schema design, EduX computes schedules and workloads dynamically, guaranteeing absolute data integrity.

### Why This Project Matters
Unlike simple static builders that allow users to save invalid state and debug it later, EduX enforces a **preventative architecture**. Its core validation engine acts as a transaction-guard: no invalid entry (clashing rooms, teachers, or exceeded hours) can ever be persisted to the database. The system scales effortlessly, providing interactive drag-and-drop builders for admins and a dedicated self-service portal for faculty members to manage leaves, preferences, and substitutions.

### Real-World Use Cases
- **Departmental Timetable Builders:** Used by departmental heads to build, validate, and manage weekly class slots.
- **Automated Substitution Planner:** Resolves sudden faculty absences by finding and suggesting eligible replacement teachers using Google Gemini AI models.
- **Dynamic Resource Trackers:** Analyzes real-time utilization rates of physical classrooms to prevent allocation clashes.
- **Faculty Preference Self-Service:** Teachers log in to submit leave applications, specify their preferred teaching slots, or mark unavailable times.

---

## 🔗 Live Demo
* [Launch EduX Timetable Planner Portal (Placeholder)](https://edux-timetable-planner.example.com)
* *Credentials for Testing:*
  - **Admin:** `admin@edux.local` / `AdminPass123`
  - **Teacher:** `teacher1@edux.local` / `TeacherPass123`

---

## 📸 Screenshots

| Screen | Description | Placeholder |
| --- | --- | --- |
| **Admin Dashboard Overview** | Modern analytics showing health score, workload distribution, and room utilization. | ![Dashboard Screenshot](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80) |
| **Interactive Timetable Builder** | Visual grid with drag-and-drop slots, color-coded lab cards, and conflict warnings. | ![Timetable Builder Screenshot](https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80) |
| **Teacher Management Portal** | Admin interface to configure faculty teaching limits and import bulk data. | ![Teacher Management Screenshot](https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80) |
| **PDF & Excel Export Engine** | Output preview fitting complete timetables on a single landscape A3 page with PU Branding. | ![PDF Export Screenshot](https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80) |
| **Auth & Security Portal** | Login screen featuring multi-factor cookie-based JWT flow and OTP verification. | ![Login Portal Screenshot](https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80) |

---

## 🛠️ Tech Stack

### Core Technology Layers
| Layer | Technologies | Usage & Description |
| --- | --- | --- |
| **Frontend SPA** | React.js (Vite), React Router Dom v6 | High-performance single-page app architecture with declarative routing. |
| **Backend API** | Node.js, Express.js | Modular REST API routes, custom error handlers, and middleware wrappers. |
| **Database** | MongoDB Atlas, Mongoose | Cloud-hosted document database, compound indexing, and strict schema validation. |
| **State Management**| React Context API | Contextual state propagation (`AuthContext`, `TimetableContext`) with persistent LocalStorage synchronizers. |
| **Styling** | Tailwind CSS, Framer Motion | Curated HSL color palette, responsive layout, glassmorphic accents, and micro-animations. |
| **AI Integration** | Google Generative AI SDK | Integrates Gemini 1.5 Flash / Pro models to dynamically evaluate and suggest optimal substitution faculty. |
| **Exports & Printing** | ExcelJS, FileSaver, jsPDF, html2canvas | Client-side Excel builder with protected cells and high-resolution A3 landscape PDF exports. |

---

## 🚀 Features

### 👑 Admin Features
* **Interactive Drag-and-Drop Grid:** Drag subjects and teachers across slots using `@dnd-kit/core` with real-time target clash previewing.
* **Bulk Data Importers:** Upload Excel spreadsheets (`.xlsx`) to batch create/update teachers, subjects, classrooms, and assignments in seconds.
* **Holiday Management:** Mark days as holidays (via `WeeklyConfig`) to automatically clear and lock timetable columns in the builder.
* **Consolidated Analytics:** Visual charts (recharts) representing classroom utilization percentages, subject workloads, and schedule health scores.
* **Substitution Resolver:** Single-click utility to find substitute teachers during leaves, integrated with Google Gemini AI reasoning.
* **Timeline Undo/Redo:** Chronological action tracking (`HistoryState` model) allowing admins to revert or repeat changes in the builder.

### 👨‍🏫 Teacher Features
* **Personalized Dashboard:** Clean interface showing weekly schedules, current workloads, and real-time notification alerts.
* **Availability Planner:** Configure preferred days/times and mark unavailable slots that the generators will respect.
* **Leave Management:** Request leave dates, monitor approval status (Pending/Approved/Rejected), and view admin feedback.
* **Substitution Requests:** Self-service requests to assign class slots to available colleagues.
* **Live Notifications:** Read/unread status indicators for schedule shifts, leave reviews, and substitution approvals.

### ⚙️ System Features
* **Deterministic Greedy Auto-Generator:** Fills empty slots using a randomized greedy algorithm matching teacher limits and class constraints.
* **Smart Priority Generator:** Algorithmic builder that places library/free periods first, schedules 2-hour lab blocks consecutively, and finishes with preferred lecture slots.
* **Multi-View Global Previews:** View aggregated timetables sorted by **Division** (class grid), **Teacher** (individual workloads), or **Subject** (utilization).
* **Branded Document Exports:** Exports styled schedules including university name, logos, and locked/protected columns using ExcelJS.

### 🔒 Security Features
* **Token Rotation (Access/Refresh JWT):** Implements short-lived access tokens (15m) and long-lived refresh tokens (7d) in secure HTTP-only cookies.
* **Role-Based Routing (RBAC):** Middleware checks mapping route permissions specifically to `admin` or `teacher` users.
* **Smart Rate Limiting:** Prevent denial-of-service and brute force logins using scoped rate limiters (login: 5 requests/15m, save: 30 requests/1m).
* **Secure OTP Verification:** Mandates email OTP verification upon registration before account access is activated.

---

## 📂 Folder Structure

```
EduX-Timetable-Management/
├── backend/                       # Express.js REST API Server
│   ├── config/
│   │   └── db.js                  # MongoDB Atlas Mongoose connection pooler
│   ├── controllers/
│   │   ├── aiController.js        # Gemini AI substitution recommender
│   │   ├── analyticsController.js # MongoDB aggregation-based dashboards
│   │   ├── authController.js      # Register, verify, login, and token manager
│   │   ├── classroomController.js  # Classroom CRUD logic
│   │   ├── importController.js    # Excel data parser and database upsert engine
│   │   ├── subjectController.js   # Subject CRUD logic
│   │   ├── substitutionController.js # Teacher substitution approvals
│   │   ├── teacherController.js   # Teacher CRUD & file importer
│   │   ├── teacherLeaveController.js # Leave review & workflow manager
│   │   ├── teacherPortalController.js # Teacher-facing dashboards
│   │   └── timetableController.js # Timetable planner, moves, copies, and history
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT cookie validation & verification check
│   │   ├── errorHandler.js        # Express global error handler
│   │   ├── rateLimiter.js         # IP-scoped request throttling limiters
│   │   └── roleMiddleware.js      # RBAC permission check (admin/teacher)
│   ├── models/
│   │   ├── AuditLog.js            # Admin builder audit tracking
│   │   ├── Classroom.js           # Program, semester, division, room data
│   │   ├── HistoryState.js        # Builder undo/redo state container
│   │   ├── Notification.js        # Teacher alerts and notifications
│   │   ├── SharedLink.js          # Public read-only hash tokens
│   │   ├── Subject.js             # Subject code, periods, and defaults
│   │   ├── SubstitutionRequest.js # Absentee replacement logs
│   │   ├── Teacher.js             # Teacher workload, limits, and preferences
│   │   ├── TeacherAssignment.js   # Teacher-division contextual mapping
│   │   ├── TeacherLeave.js        # Leave date logs and approval statuses
│   │   ├── Timetable.js           # Individual slot entries (references only)
│   │   ├── User.js                # Core auth credentials & status fields
│   │   ├── WeeklyConfig.js        # Division holiday parameters
│   │   └── WeeklyTimetable.js     # Division aggregate timetables
│   ├── routes/                    # API Endpoints mounts
│   ├── services/
│   │   ├── autoGenerator.js       # Greedy auto-scheduler
│   │   ├── emailService.js        # Nodemailer template transporter (OTP/Alerts)
│   │   ├── smartGenerator.js      # Priority-based smart scheduler
│   │   ├── validationEngine.js    # Transactional conflict and validation engine
│   │   └── workloadCompute.js     # Runtime workload counting helpers
│   ├── utils/
│   │   └── constants.js           # Time slot configuration lists
│   └── server.js                  # Main server listener and mounts
│
├── frontend/                      # React SPA client application
│   ├── public/                    # Static assets (favicons, logos)
│   ├── src/
│   │   ├── assets/                # Styling variables and images
│   │   ├── components/            # Reusable sub-components
│   │   │   ├── ui/                # Styled ShadCN/Base custom UI components
│   │   │   ├── ClassroomManagement.jsx # Room configuration tables
│   │   │   ├── DashboardOverview.jsx   # Metrics, charts, and health logs
│   │   │   ├── GlobalTimetablePreview.jsx # Multi-view builder panels
│   │   │   ├── SubjectManagement.jsx  # Curriculum managers
│   │   │   ├── TeacherLeaveManagement.jsx # Admin leave review desk
│   │   │   ├── TeacherManagement.jsx  # Faculty roster panels
│   │   │   └── TimetableBuilder.jsx   # Interactive scheduling workspace
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Authentication state provider
│   │   │   └── TimetableContext.jsx # Timetable workspace state provider
│   │   ├── lib/                   # Utility helpers (ShadCN cn merger)
│   │   ├── pages/                 # Full application route pages
│   │   │   ├── Analytics.jsx      # Admin visual metric dashboard
│   │   │   ├── Dashboard.jsx      # Admin landing dashboard tabs
│   │   │   ├── ForgotPassword.jsx # Request reset code
│   │   │   ├── GlobalTimetable.jsx # All schedules preview page
│   │   │   ├── Home.jsx           # Public splash landing router
│   │   │   ├── Import.jsx         # Bulk excel upload desk
│   │   │   ├── Login.jsx          # Secure credential input
│   │   │   ├── Register.jsx       # Register with verification checks
│   │   │   ├── ResetPassword.jsx  # Password reset executor
│   │   │   ├── SharedTimetable.jsx # Read-only public view page
│   │   │   ├── TeacherDashboard.jsx # Self-service teacher panel
│   │   │   └── Timetable.jsx      # Timetable route container
│   │   ├── routes/
│   │   │   └── ProtectedRoute.jsx # Route guards for auth & RBAC checks
│   │   ├── utils/
│   │   │   ├── branding.js        # Branding assets (Parul University)
│   │   │   ├── csvExport.js       # Comma-separated exporter
│   │   │   ├── excelExport.js     # Protected spreadsheet exporter (ExcelJS)
│   │   │   └── pdfExport.js       # Landscape A3 single page PDF exporter
│   │   ├── App.css                # Global components override
│   │   ├── index.css              # Tailwind base utilities and custom colors
│   │   ├── main.jsx               # Client initialization script
│   │   └── App.jsx                # Main react router switchboard
│   ├── package.json               # Client dependencies configs
│   ├── vite.config.js             # Vite development server and API proxy config
│   └── tailwind.config.js         # Tailwind layout grids configurations
│
├── scripts/
│   ├── seed.js                    # Core seed script (creates sample teachers & admin)
│   ├── seed-users.js              # Generates sample user accounts
│   └── update-users.js            # Utility script to clean up user references
├── package.json                   # Root package manager script wrapper
└── README.md                      # Project documentation file
```

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    %% Client Layer
    subgraph Client [React SPA Frontend]
        UI[Tailwind & ShadCN UI]
        State[React Context API & LocalStorage]
        DND[@dnd-kit/core Drag & Drop]
        Export[jsPDF / ExcelJS Exporter]
    end

    %% Web Layer
    subgraph Server [Express.js Backend API]
        Proxy[Vite Dev Server Proxy]
        RL[Rate Limiter Middleware]
        Auth[Auth Middleware Cookie/JWT]
        RBAC[RBAC Role Middleware]
        Route[REST Api Route Handlers]
    end

    %% Services Layer
    subgraph Services [Core Application Logic]
        VE[Validation Engine]
        SG[Smart Priority Generator]
        AG[Greedy Auto-Generator]
        WC[Workload Compute Engine]
        Gemini[Google Gemini API Gateway]
        Mail[Nodemailer Email Service]
    end

    %% Database Layer
    subgraph Database [Storage & External Services]
        DB[(MongoDB Atlas Database)]
        SMTP[Gmail SMTP Server]
    end

    %% Client and Server Communication
    UI --> State
    State --> DND
    UI --> Export
    State -- Axios HTTPS Requests --> Proxy
    Proxy --> RL
    RL --> Auth
    Auth --> RBAC
    RBAC --> Route

    %% Server and Services Communication
    Route --> VE
    Route --> SG
    Route --> AG
    Route --> Gemini
    
    VE --> WC
    SG --> VE
    AG --> VE
    
    %% Services and DB Communication
    VE --> DB
    SG --> DB
    AG --> DB
    WC --> DB
    Route --> Mail
    Mail --> SMTP
```

---

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Teacher / Admin
    participant Client as React Client (Axios)
    participant Server as Express Server
    participant DB as MongoDB Atlas
    participant Email as Nodemailer / SMTP

    Note over User, Client: Registration Flow
    User->>Client: Enters Registration Details
    Client->>Server: POST /api/auth/register
    Server->>DB: Check if username/email exists
    DB-->>Server: No duplicates found
    Server->>Server: Hash Password (bcryptjs) & Generate 6-digit OTP
    Server->>DB: Save User (isVerified: false, otp, otpExpiry)
    Server->>Email: Send OTP email (async)
    Email-->>User: Delivers OTP Code (Gmail/Console log fallback)
    Server-->>Client: 201 Created (Prompt for OTP validation)
    Client-->>User: Displays OTP screen

    Note over User, Client: OTP Verification Flow
    User->>Client: Submits OTP Code
    Client->>Server: POST /api/auth/verify-otp
    Server->>DB: Check OTP match & expiry
    DB-->>Server: Valid Match
    Server->>DB: Update User (isVerified: true, otp: null)
    Server-->>Client: 200 OK (Verification successful)

    Note over User, Client: Login Flow (Access / Refresh Token)
    User->>Client: Submits Email & Password
    Client->>Server: POST /api/auth/login
    Server->>DB: Fetch User + password hash
    DB-->>Server: Return User details
    Server->>Server: Verify bcrypt.compare() password
    Server->>Server: Generate Access Token (15m) & Refresh Token (7d)
    Server->>Client: Send HTTP-Only Cookie (Access/Refresh Tokens) + JSON Profile
    Client-->>User: Redirects to Dashboard (Admin or Teacher Portal)
```

---

## 📅 Timetable Generation Workflow

```mermaid
flowchart TD
    Start([Initiate Smart Generator Request]) --> Context[Extract context parameters: Program, Class, Semester, Division]
    Context --> Clean[Delete old entries if 'Full' mode / Keep old entries if 'Fill' mode]
    Clean --> LoadHolidays[Fetch holidays from WeeklyConfig & lock holiday slots]
    
    %% Free slots
    LoadHolidays --> FreeCheck{Free slots requested > 0?}
    FreeCheck -- Yes --> LibrarySlot[Select 'Library Period' subject & default Teacher]
    LibrarySlot --> DistributeFree[Distribute free periods in afternoon slots based on preference order]
    DistributeFree --> SaveFree[Save library slots & add to reserved slots list]
    SaveFree --> LabCheck
    FreeCheck -- No --> LabCheck{Lab slots requested > 0?}

    %% Lab slots
    LabCheck -- Yes --> LoadLabs[Load lab subjects & default teachers]
    LoadLabs --> PairSlots[Find consecutive time slot pairs on active days without break periods]
    PairSlots --> CheckAvailability{Are consecutive slots free & teacher available?}
    CheckAvailability -- Yes --> PlaceLab[Schedule 2-hour duration lab entry]
    PlaceLab --> SaveLab[Save entries & add to reserved slots list]
    SaveLab --> LoopLabs{All labs scheduled?}
    LoopLabs -- No --> PairSlots
    LoopLabs -- Yes --> LectureCheck
    CheckAvailability -- No --> SkipLab[Log warning: Lab skipped] --> LoopLabs
    LabCheck -- No --> LectureCheck[Load regular subjects & default teachers]

    %% Lecture slots
    LectureCheck --> FetchGrid[Create remaining open slots list]
    FetchGrid --> Prioritize[Sort subjects: Teacher preferred slots first, then remaining required periods desc]
    Prioritize --> SelectSlot[Pick next open slot]
    SelectSlot --> CheckConstraints{Validate: Teacher busy? Division workload limit? Subject periods limit?}
    CheckConstraints -- Passed --> PlaceLecture[Assign lecture slot & decrement subject/teacher limits]
    PlaceLecture --> SaveLecture[Save to Database]
    CheckConstraints -- Failed --> NextSubject[Try next priority subject]
    SaveLecture --> LoopGrid{More open slots available?}
    NextSubject --> LoopGrid
    LoopGrid -- Yes --> SelectSlot
    LoopGrid -- No --> Summary([Build report: generated count, skipped slots, limits reached])
```

---

## ⚡ Validation Engine Workflow

```mermaid
flowchart TD
    Start([Receive Timetable Slot validation request]) --> CheckBreak{Is the slot a break or recess period?}
    CheckBreak -- Yes --> Reject[Return invalid status: cannot assign during break]
    
    CheckBreak -- No --> CheckRoom{Check Room Conflict: Is classroom occupied by another division at this time?}
    CheckRoom -- Yes --> Block[Return invalid status: room occupied]
    
    CheckRoom -- No --> CheckTeacherBusy{Check Teacher Busy: Is teacher already scheduled in another division?}
    CheckTeacherBusy -- Yes --> Block
    
    CheckTeacherBusy -- No --> CheckTeacherLeave{Check Teacher Leave: Is target day within teacher's approved leave range?}
    CheckTeacherLeave -- Yes --> Block
    
    CheckTeacherLeave -- No --> CheckClassSlot{Check Class Slot: Is division occupied by another lecture?}
    CheckClassSlot -- Yes --> CheckLab{Is it a Lab slot?}
    CheckLab -- Yes --> CheckLabLimits{Is current slot a normal lecture or already has 3 lab batches?}
    CheckLabLimits -- Yes --> Block
    CheckLabLimits -- No --> CheckConsecutive{Are consecutive slots available without breaks?}
    CheckConsecutive -- No --> Block
    CheckConsecutive -- Yes --> CheckTeacherWorkload
    CheckLab -- No --> Block
    
    CheckClassSlot -- No --> CheckTeacherWorkload{Check Workload Limit: Will assigning slot exceed teacher's division weekly limit?}
    CheckTeacherWorkload -- Yes --> Block
    
    CheckTeacherWorkload -- No --> CheckSubjectPeriods{Check Subject Limit: Will slot exceed required periods for subject?}
    CheckSubjectPeriods -- Yes --> Block
    
    CheckSubjectPeriods -- No --> Allow[Return valid status: slot approved for scheduling]
```

---

## 🗄️ Database Design

```mermaid
erDiagram
    users ||--o| teachers : "linked to (teacherId)"
    teachers ||--o{ subjects : "teaches (teacherId)"
    teachers ||--o{ timetables : "assigned_to (teacherId)"
    teachers ||--o{ teacherassignments : "context_assigned (teacherId)"
    teachers ||--o{ teacherleaves : "requests (teacherId)"
    teachers ||--o{ substitutionrequests : "absentee / substitute (teacherId)"
    teachers ||--o{ notifications : "receives (teacherId)"
    
    subjects ||--o{ timetables : "allotted_to (subjectId)"
    classrooms ||--o{ timetables : "placed_in (classroomId)"
    users ||--o{ timetables : "created_by (createdBy)"
    
    timetables ||--o{ weeklytimetables : "grouped_in (timetableEntries)"
    timetables ||--o| auditlogs : "audited_in (timetableId)"
    timetables ||--o{ substitutionrequests : "rescheduled_in (timetableId)"

    users {
        ObjectId _id PK
        String username "unique"
        String email "unique"
        String password "hashed"
        String role "admin | teacher | user"
        ObjectId teacherId FK "nullable"
        Boolean isVerified
        String otp "nullable"
        Date otpExpiry "nullable"
        String name
        String resetPasswordToken "nullable"
        Date resetPasswordExpiry "nullable"
    }

    teachers {
        ObjectId _id PK
        String teacherID "unique"
        String faculty_name
        String subject_name
        String department
        Number teaching_hours "weekly allocation limit"
        String teacher_number
        String classroom
        Number assignedHours "hook calculated"
        Number remainingHours "hook calculated"
        Array workload "nested objects"
        Array allowedDivisions
        Object preferences "preferred/unavailable slots"
    }

    subjects {
        ObjectId _id PK
        String subject_name
        String subject_code "unique"
        ObjectId teacherId FK
        Number requiredPeriods "weekly periods"
        Number allottedPeriods "hook calculated"
        Number remainingPeriods "hook calculated"
        String type "theory | lab"
    }

    classrooms {
        ObjectId _id PK
        String program
        String className "FY | SY | TY"
        Number semester "1-6"
        String division "A | B | C"
        String roomNumber
        String year
    }

    timetables {
        ObjectId _id PK
        String program
        String className
        Number semester
        String division
        String day
        String timeSlot
        ObjectId subjectId FK
        ObjectId teacherId FK
        ObjectId classroomId FK "nullable"
        String status "valid | conflict"
        Boolean isLab
        Number duration "1 | 2"
        ObjectId createdBy FK
    }

    weeklyconfigs {
        ObjectId _id PK
        String program
        String className
        Number semester
        String division
        Array holidays "list of locked days"
    }
```

---

## 📊 MongoDB Aggregation Pipeline Explanation

Because EduX enforces a **fully normalized schema**, derived aggregates (like current workloads, completed periods, or room availability schedules) are computed on the fly. This is done using high-performance MongoDB aggregation pipelines. Below is an explanation of the operators used and their real-world application inside the project:

### 1. `$lookup`
* **Concept:** Performs a left outer join to another collection in the same database to filter in documents from the "joined" collection for processing.
* **Usage in EduX:** Inside [analyticsController.js](file:///c:/Users/ozati/Desktop/EduX_Time_Table_Managment-master%20%281%29/backend/controllers/analyticsController.js#L14), it maps each `Teacher` or `Subject` to their corresponding active allocations in the `timetables` collection. Using `let` variables and a sub-pipeline `$match`, it filters only entries matching the parent ID with a status of `'valid'`.
* **Example:**
```javascript
$lookup: {
  from: 'timetables',
  let: { teacherId: '$_id' },
  pipeline: [
    { $match: { $expr: { $eq: ['$teacherId', '$$teacherId'] }, status: 'valid' } }
  ],
  as: 'assignedTimetables'
}
```

### 2. `$match`
* **Concept:** Filters documents to pass only those that match specified criteria to the next stage of the pipeline.
* **Usage in EduX:** Restricts calculations to active schedules (excluding drafts or flagged conflicts). For example, it is used to filter out schedules that are marked as `status: 'valid'`.

### 3. `$group`
* **Concept:** Groups input documents by a specified identifier expression and applies accumulator expressions (like `$sum`, `$avg`) to aggregate values.
* **Usage in EduX:** Inside [analyticsController.js](file:///c:/Users/ozati/Desktop/EduX_Time_Table_Managment-master%20%281%29/backend/controllers/analyticsController.js#L82), it counts distinct divisions scheduled across the system when calculating total available capacity:
```javascript
{ $group: { _id: { program: '$program', className: '$className', semester: '$semester', division: '$division' } } }
```

### 4. `$project`
* **Concept:** Reshapes documents in the pipeline by adding, renaming, or removing fields, and projecting calculated fields.
* **Usage in EduX:** Reshapes the aggregate workload summaries. It uses `$reduce` inside the projection stage to sum up the `duration` of each assigned slot (accommodating 1-hour lectures and 2-hour labs dynamically) to output `assignedHours` and `remainingHours` fields directly:
```javascript
$project: {
  name: '$faculty_name',
  totalHours: '$teaching_hours',
  assignedHours: {
    $reduce: {
      input: '$assignedTimetables',
      initialValue: 0,
      in: { $add: ['$$value', { $ifNull: ['$$this.duration', 1] }] }
    }
  }
}
```

### 5. `$unwind`
* **Concept:** Deconstructs an array field from the input documents to output a document for each element.
* **Usage in EduX:** While the core queries use the optimized `$reduce` block on joined arrays to prevent memory overhead, conceptual analytics reports (such as daily slot utilization or detailed program charts) use `$unwind` on populated workload arrays to inspect and filter individual class allocations.

---

## ⚡ Dynamic Workload Calculation

### Why Workload Is NOT Stored
In standard databases, developers often store a static counter like `currentAssignedHours` on the `Teacher` record, incrementing it during slot scheduling and decrementing it on delete. **EduX explicitly avoids this anti-pattern.** Instead, teacher workloads are calculated dynamically at query time by executing a `$count` query on the `timetables` collection matching the specific teacher and context.

### Benefits of Dynamic Workload Calculation
1. **Zero Data Inconsistency:** If a transaction fails mid-way, or a batch of schedules is cleared, a stored counter can easily drift from the actual number of timetable entries. Dynamic counts guarantee that the reported workload always matches the ground truth.
2. **Always Accurate:** Context-specific workloads (e.g., how many hours a teacher has assigned in division "A" vs division "B") are calculated on the fly, eliminating the need to sync nested counters.
3. **Normalized Architecture:** Storing only references and calculating aggregates dynamically keeps database records lean and prevents concurrent write locks on the `Teacher` or `Subject` collections.

---

## 📋 API Documentation

All endpoints are prefixed with `/api` and return a standardized response: `{ success: true/false, data: ..., error: '...' }`.

### Authentication & Portal APIs
| Method | Route | Description | Auth Required? | Roles Allowed |
| --- | --- | --- | --- | --- |
| **POST** | `/auth/register` | Register a new user account | No | All |
| **POST** | `/auth/send-otp` | Trigger/resend email verification OTP | No | All |
| **POST** | `/auth/verify-otp` | Verify OTP and activate account | No | All |
| **POST** | `/auth/login` | Authenticate user & issue HttpOnly JWT cookies | No | All |
| **POST** | `/auth/refresh` | Rotate expired access tokens | No | All |
| **POST** | `/auth/logout` | Clear cookie-based JWT session | Yes | All |
| **GET** | `/auth/me` | Fetch active user profile details | Yes | All |
| **PUT** | `/auth/profile` | Update account profile fields (name, email) | Yes | All |
| **PUT** | `/auth/change-password` | Change account password | Yes | All |
| **POST** | `/auth/forgot-password` | Request password reset token | No | All |
| **POST** | `/auth/reset-password` | Submit new password using reset token | No | All |
| **GET** | `/teacher-portal/dashboard` | Fetch teacher metrics & alerts | Yes | `teacher` |
| **GET** | `/teacher-portal/timetable` | Fetch scheduled slots for active teacher | Yes | `teacher` |
| **GET** | `/teacher-portal/workload` | Fetch dynamic workloads by division | Yes | `teacher` |
| **GET** | `/teacher-portal/profile` | Fetch teacher profile details | Yes | `teacher` |
| **GET** | `/teacher-portal/leaves` | Fetch submitted leave history | Yes | `teacher` |
| **POST** | `/teacher-portal/leaves` | Apply for new leave dates | Yes | `teacher` |
| **DELETE**| `/teacher-portal/leaves/:id` | Cancel pending leave application | Yes | `teacher` |
| **GET** | `/teacher-portal/preferences` | Fetch slot preferences and constraints | Yes | `teacher` |
| **PUT** | `/teacher-portal/preferences` | Update slot preferences and limits | Yes | `teacher` |
| **GET** | `/teacher-portal/substitutions` | Get teacher substitution requests | Yes | `teacher` |
| **POST** | `/teacher-portal/substitutions` | Request colleague to substitute a slot | Yes | `teacher` |
| **GET** | `/teacher-portal/notifications` | Fetch system alerts (leave, schedule changes) | Yes | `teacher` |
| **PUT** | `/teacher-portal/notifications/:id/read` | Mark system alert as read | Yes | `teacher` |

### Administration CRUD & Utility APIs
| Method | Route | Description | Auth Required? | Roles Allowed |
| --- | --- | --- | --- | --- |
| **GET** | `/teachers` | List all configured faculty | Yes | `admin` |
| **POST** | `/teachers` | Create new teacher profile | Yes | `admin` |
| **GET** | `/teachers/:id` | Get details for specific teacher | Yes | `admin` |
| **PUT** | `/teachers/:id` | Update teacher profile | Yes | `admin` |
| **DELETE**| `/teachers/:id` | Delete teacher profile | Yes | `admin` |
| **POST** | `/teachers/import` | Upload bulk CSV file of teachers | Yes | `admin` |
| **GET** | `/subjects` | List all subjects | Yes | `admin` |
| **POST** | `/subjects` | Create new subject profile | Yes | `admin` |
| **GET** | `/subjects/:id` | Get details for specific subject | Yes | `admin` |
| **PUT** | `/subjects/:id` | Update subject details | Yes | `admin` |
| **DELETE**| `/subjects/:id` | Delete subject profile | Yes | `admin` |
| **GET** | `/classrooms` | List all classrooms | Yes | `admin` |
| **POST** | `/classrooms` | Configure new classroom / room numbers | Yes | `admin` |
| **GET** | `/classrooms/:id` | Get details for specific classroom | Yes | `admin` |
| **PUT** | `/classrooms/:id` | Update classroom configuration | Yes | `admin` |
| **DELETE**| `/classrooms/:id` | Remove classroom configuration | Yes | `admin` |
| **POST** | `/import/excel` | Bulk upload complete configuration template | Yes | `admin` |
| **GET** | `/analytics` | Fetch aggregation analytics & dashboard data | Yes | `admin` |
| **POST** | `/ai/replacement` | Suggest optimal replacement using Gemini AI | Yes | `admin` |
| **GET** | `/leaves` | List all teacher leave requests | Yes | `admin` |
| **POST** | `/leaves` | Apply leave on behalf of a teacher | Yes | `admin` |
| **DELETE**| `/leaves/:id` | Delete leave entry | Yes | `admin` |
| **PUT** | `/leaves/:id/review` | Approve or reject teacher leave application | Yes | `admin` |
| **GET** | `/substitutions` | List all substitution requests | Yes | `admin` |
| **PUT** | `/substitutions/:id/assign` | Assign substitution to a teacher | Yes | `admin` |

### Timetable Core APIs
| Method | Route | Description | Auth Required? | Roles Allowed |
| --- | --- | --- | --- | --- |
| **GET** | `/timetable/shared/:token` | Public read-only view of a timetable | No | All (Public) |
| **GET** | `/timetable/list` | Filter slots by division / teacher / classroom | Yes | All |
| **GET** | `/timetable/global` | Consolidated grid showing all schedules | Yes | All |
| **GET** | `/timetable/preview` | Detailed grid preview for print layouts | Yes | All |
| **GET** | `/timetable/weekly-config` | Fetch holiday configurations | Yes | All |
| **POST** | `/timetable/add` | Manually insert a single timetable slot | Yes | `admin` |
| **DELETE**| `/timetable/delete` | Remove a timetable slot | Yes | `admin` |
| **GET** | `/timetable/save` | Get weekly timetable details | Yes | `admin` |
| **POST** | `/timetable/save` | Save/Publish active weekly schedule draft | Yes | `admin` |
| **DELETE**| `/timetable/reset` | Clear all slots in active grid | Yes | `admin` |
| **POST** | `/timetable/set-holiday` | Set holidays for a division | Yes | `admin` |
| **POST** | `/timetable/suggest-slot` | Suggest free slots for teacher/subject | Yes | `admin` |
| **POST** | `/timetable/validate` | Run validation check on division timetable | Yes | `admin` |
| **POST** | `/timetable/auto-generate` | Greedy auto-schedule empty slots | Yes | `admin` |
| **POST** | `/timetable/smart-generate` | Priority-based smart schedule generator | Yes | `admin` |
| **PATCH**| `/timetable/move` | Move entry from one slot to another (DND) | Yes | `admin` |
| **POST** | `/timetable/copy` | Copy entire timetable between divisions | Yes | `admin` |
| **PATCH**| `/timetable/update-teacher` | Replace scheduled teacher in active slots | Yes | `admin` |
| **POST** | `/timetable/share` | Generate public read-only link token | Yes | `admin` |
| **POST** | `/timetable/validate-change` | Pre-flight check before slot change | Yes | `admin` |
| **POST** | `/timetable/replacement-eligibility`| Find teachers available for replacement | Yes | `admin` |
| **POST** | `/timetable/move-check` | Quick collision check for drag-and-drop actions | Yes | `admin` |
| **POST** | `/timetable/suggest-fix` | Get recommendation to fix slot conflict | Yes | `admin` |
| **GET** | `/timetable/audit-logs` | Fetch admin action history logs | Yes | `admin` |
| **POST** | `/timetable/history/undo` | Undo last logged planner action | Yes | `admin` |
| **POST** | `/timetable/history/redo` | Redo previously undone planner action | Yes | `admin` |

---

## 📨 API Examples

### 1. Suggest Replacement Teacher (`POST /api/ai/replacement`)
Used by admins when a teacher is absent to find available colleagues.

* **Request Body:**
```json
{
  "absentTeacherId": "65894b9f2bf8f7e2a9000101",
  "program": "Information Technology",
  "semester": 5,
  "division": "A",
  "day": "Monday",
  "timeSlot": "10:25-11:20"
}
```

* **Response (Gemini AI Active):**
```json
{
  "suggested": {
    "name": "Prof. Rajesh Patel",
    "reason": "Prof. Rajesh Patel teaches in the same IT department and currently has the lowest workload (12 assigned / 28 remaining hours), leaving him fully available to take over this slot."
  },
  "otherOptions": [
    {
      "id": "65894b9f2bf8f7e2a9000105",
      "name": "Dr. Anjali Mehta",
      "department": "IT",
      "teaching_hours": 30,
      "assignedHours": 18,
      "remainingHours": 12,
      "subject_name": "Operating Systems"
    }
  ]
}
```

### 2. Move Timetable Slot (`PATCH /api/timetable/move`)
Triggered on the frontend when an admin drags and drops an active slot card.

* **Request Body:**
```json
{
  "entryId": "658a2d1d2bf8f7e2a9000214",
  "newDay": "Tuesday",
  "newTimeSlot": "12:20-13:15"
}
```

* **Response (Success):**
```json
{
  "success": true,
  "data": {
    "_id": "658a2d1d2bf8f7e2a9000214",
    "program": "Information Technology",
    "className": "TY",
    "semester": 6,
    "division": "A",
    "day": "Tuesday",
    "timeSlot": "12:20-13:15",
    "subjectId": "658a2cd82bf8f7e2a90001bc",
    "teacherId": "658a2c2c2bf8f7e2a90001a1",
    "classroomId": "658a2c912bf8f7e2a90001f0",
    "status": "valid",
    "isLab": false,
    "duration": 1,
    "createdBy": "65894a4c2bf8f7e2a9000001"
  }
}
```

* **Response (Conflict Error):**
```json
{
  "success": false,
  "error": "Teacher Prof. Rajesh Patel is already assigned to Software Engineering at Tuesday 12:20-13:15"
}
```

---

## 🔑 Authentication & Authorization

### JWT Security Flow
EduX uses a robust dual-token cookie-based JWT architecture for web authentication:
1. **Access Token (`auth-token`):** A short-lived token (15m expiration) signed with `JWT_SECRET` containing the user's ID, email, and role. Kept in HTTP-only, Secure (in production), SameSite: Lax cookies.
2. **Refresh Token (`refresh-token`):** A long-lived token (7d expiration) signed with `JWT_REFRESH_SECRET` stored in a separate HTTP-only cookie.
3. **Silent Throttling & Rotation:** When the access token expires, the client's Axios response interceptor automatically handles a 401 response by making a silent POST call to `/api/auth/refresh`, retrieving a fresh access token, and retrying the failed request without interrupting the user.

### Route Protection (RBAC)
Route security is enforced through two middleware layers:
- `protect(requireAdmin = false)`: Evaluates the incoming access token. Resolves the user, checks if the account is email-verified, and locks out requests if admin privileges are required but not present.
- `authorizeRoles(...roles)`: Performs strict role checks on the resolved user profile to restrict access to specialized portals (such as the teacher dashboard).

---

## 👥 Roles & Permissions

| Feature Area | Admin Role | Teacher Role | Guest / Student |
| --- | :---: | :---: | :---: |
| **View Division Timetables** | ✅ Read & Write | ✅ Read Only | ✅ Read Only |
| **Drag-and-Drop Slot Move** | ✅ Full Access | ❌ Access Denied | ❌ Access Denied |
| **Auto/Smart Schedule Run** | ✅ Full Access | ❌ Access Denied | ❌ Access Denied |
| **Request Leaves** | ❌ Not Applicable | ✅ Create/Cancel | ❌ Access Denied |
| **Review / Approve Leaves** | ✅ Full Access | ❌ Access Denied | ❌ Access Denied |
| **Request Substitutions** | ❌ Not Applicable | ✅ Create Requests | ❌ Access Denied |
| **Assign Substitution Colleague**| ✅ Full Access | ❌ Access Denied | ❌ Access Denied |
| **Configure Preferences** | ❌ Not Applicable | ✅ Read & Update | ❌ Access Denied |
| **Bulk Excel Import/Export** | ✅ Full Access | ❌ Access Denied | ❌ Access Denied |
| **Generate Shared Links** | ✅ Full Access | ❌ Access Denied | ❌ Access Denied |

---

## ⚡ Validation Rules

The core of the scheduler is its transactional validation logic. When building, moving, or updating slots, the engine checks the following rules:

1. **Break Time Isolation:** No scheduling is allowed during designated breaks (`11:20-12:20` and `14:10-14:30`).
2. **Teacher Clash Check:** A teacher cannot be assigned to two classes/divisions at the same time.
3. **Room Conflict Isolation:** Classrooms are mapped to divisions dynamically. The engine verifies that no two divisions sharing the same physical room are scheduled at the same time.
4. **Faculty Leave Interceptor:** The validator checks if the target date falls within the teacher's active approved leaves.
5. **Class Division Collision:** A division cannot have two scheduled theory lectures at the same time.
6. **Lab Batch Limits:** Lab/practical slots (duration: 2) can run concurrently for up to 3 batches in a division, provided they don't clash with theory lectures.
7. **Lab Block Integrity:** Practical lab slots must occupy 2 consecutive time slots without overlapping break slots.
8. **Weekly Teacher Workload Cap:** A teacher's total weekly workload in a division cannot exceed their contract limit (e.g. 40 hours).
9. **Curricular Subject Limits:** The total scheduled periods for a subject cannot exceed its required weekly count.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and configure the following variables:

| Variable Name | Description | Example / Value | Secret? |
| --- | --- | --- | :---: |
| `MONGO_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` | Yes |
| `JWT_SECRET` | Primary key used to sign access tokens | `d124b89b4f971ec8e32c81...` | Yes |
| `JWT_REFRESH_SECRET` | Secondary key used to sign refresh tokens | `a204b78cf391...` | Yes |
| `EMAIL_USER` | Gmail address used by Nodemailer | `scheduler@gmail.com` | Yes |
| `EMAIL_PASS` | Gmail App Password (not standard pass) | `abcd efgh ijkl mnop` | Yes |
| `GEMINI_API_KEY` | Google Generative AI Developer Key | `AIzaSyAlfEi4B...` | Yes |
| `NODE_ENV` | Active environment descriptor | `development` or `production` | No |
| `PORT` | Local express backend port | `5000` | No |
| `FRONTEND_URL` | Frontend address (used for password reset links)| `http://localhost:5173` | No |

---

## 🔧 Installation

Follow these steps to get your development environment running:

### Prerequisites
* [Node.js](https://nodejs.org/en) (v18.x or higher)
* [MongoDB Community Server](https://www.mongodb.com/try/download/community) locally or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Account.

### Step-by-Step Setup
1. **Clone the Repository:**
```bash
git clone https://github.com/your-username/edux-timetable-management.git
cd edux-timetable-management
```

2. **Install Root and Child Dependencies:**
The project uses a custom script to install packages in both the backend root and frontend client directory:
```bash
npm run install-all
```

3. **Configure Environment Files:**
Create a `.env.local` file in the root folder using `.env.example` as a template and fill in the required keys.

---

## 💻 Local Development

Run the concurrent development command in the root folder:
```bash
npm run dev
```
*This command uses the `concurrently` package to start both the Express backend server (on port `5000`) and the Vite React server (on port `5173`) simultaneously, with API proxying configured automatically.*

---

## 🗄️ Database Setup

Ensure your local MongoDB service is running or your MongoDB Atlas instance is accessible. The application connects automatically on boot using Mongoose. The database configuration [db.js](file:///c:/Users/ozati/Desktop/EduX_Time_Table_Managment-master%20%281%29/backend/config/db.js) implements connection pooling:
- `maxPoolSize: 10`
- `serverSelectionTimeoutMS: 5000`
- `socketTimeoutMS: 45000`

---

## 🌱 Seed Data

To populate the database with initial users, teachers, subjects, classrooms, and assignments, run the seed script:
```bash
npm run seed
```
This script creates:
* 1 Admin Account (`admin@edux.local` / password: `password123`)
* 6 Pre-configured Teacher records (with department mappings and workloads)
* Classrooms for IT FY, SY, TY (Divisions A, B, C)
* Associated subject structures

---

## ☁️ Deployment

### 1. Database (MongoDB Atlas)
- Deploy a free-tier Shared Cluster on MongoDB Atlas.
- Add your deployment server's IP to the Atlas Network Access whitelist (or whitelist `0.0.0.0/0`).
- Copy the connection URI and set it as `MONGO_URI` in your production environment settings.

### 2. Backend (Render / Railway / Vercel API Routes)
The backend is production-ready for deployment on Render, Railway, or Heroku:
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- Set `NODE_ENV=production` and configure your secret environment variables in the host dashboard.
- *Alternatively:* The API is structured to run as serverless function routes on platforms like Vercel (using Vercel API routes and custom `vercel.json` rewrite maps).

### 3. Frontend (Vercel / Netlify)
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- Set environment variables if needed (e.g. `VITE_API_URL` pointing to your hosted backend).

---

## ⚡ Performance Optimizations

1. **Dynamic Aggregation Pipelines:** Workloads and periods are not stored as static variables. They are compiled on the fly using Mongoose aggregation pipelines with indexes, keeping the database footprint lightweight.
2. **Database Indexing:** High-performance compound indexes are implemented on query-heavy paths, such as `TimetableSchema.index({ teacherId: 1, day: 1, timeSlot: 1 })`, ensuring search queries run in sub-millisecond times.
3. **Vite Dynamic Bundling:** The React SPA is bundled using Vite's tree-shaking compiler, keeping frontend load times minimal.
4. **Non-Blocking Email Dispatch:** Notifications and OTP dispatches are executed asynchronously, preventing email delays from blocking API responses.

---

## 🔮 Future Improvements

* **AI Timetable Optimization:** Integrate genetic algorithm constraint solvers to generate complete departmental timetables from scratch with minimal human input.
* **Automatic Rescheduling:** Automatically resolve schedule disruptions caused by sudden teacher leave requests.
* **Classroom Capacity Optimization:** Match classroom capacities with division sizes and subject requirements to optimize space usage.
* **Administrative Analytics Dashboard:** Add visual widgets showing utilization trends, teacher workload distribution, and schedule health scores over time.
* **Mobile Companion App:** Develop a cross-platform mobile app for students and teachers to view real-time schedules, submit preferences, and receive alerts.

---

## 📚 Learning Outcomes

* **Advanced MongoDB Aggregations:** Mastering `$lookup`, `$project`, `$reduce`, and custom conditional operators to calculate workloads dynamically without database desynchronization.
* **Multi-Role Authentication & Security:** Implementing double-cookie token rotation (Access + Refresh JWT) in secure, HTTP-only configurations.
* **Heuristic Solver Programming:** Writing priority-based schedulers that balance multiple rules (recess times, teacher availability, classroom double-booking).
* **AI Model Integration:** Working with Google's Generative AI SDK to parse unstructured availability data and generate recommendations.
* **Client-Side Document Builders:** Building complex Excel sheets with formatting rules and locked cells using ExcelJS.

---

## 💬 Interview Talking Points

1. **Why we chose dynamic calculations over stored counters:** I can explain how storing counters like `assignedHours` directly in MongoDB collections can lead to sync drift issues. I solved this by calculating workloads on the fly using MongoDB aggregation pipelines with compound indexes.
2. **How the Validation Engine works:** I designed a centralized validation system that verifies scheduling constraints (teacher availability, room conflicts, class double-booking, and approved leaves) before saving changes to the database.
3. **Role-Based Access Control (RBAC):** I implemented authorization check middleware to secure API endpoints based on user roles (`admin` or `teacher`), while matching these checks in the React frontend.
4. **Silent JWT Token Rotation:** I built an authentication system using short-lived access tokens and long-lived refresh tokens in HTTP-only cookies, with automatic refresh handling in Axios interceptors.
5. **Smart Priority Scheduling Algorithm:** I created a generator that prioritizes constraints—scheduling library periods first, then consecutive lab slots, and finally lectures based on teacher preferences.
6. **Classroom Conflict Resolution:** I solved room double-booking by querying active schedules across all divisions for matching room numbers at identical slots.
7. **Gemini AI Integration:** I integrated the Google Generative AI SDK to recommend substitute teachers during leaves, falling back to a lowest-workload algorithm if the API is offline.
8. **Dnd-Kit Drag and Drop Integration:** I added visual drag-and-drop scheduling to the React grid, checking slot validity before finalizing changes.
9. **Undo/Redo History Architecture:** I built a transactional undo/redo system using a `HistoryState` collection to track admin changes.
10. **ExcelJS Protection Mechanism:** I implemented a branded Excel exporter that protects administrative header rows while leaving schedule cells editable for teachers.
11. **High-Resolution PDF Rendering:** I solved browser page cutoff issues during PDF exports by cloning target DOM elements and rendering them to canvas at double scale before printing.
12. **Holiday Propagation Engine:** I configured a holiday manager that automatically clears and locks scheduled slots when an admin declares a holiday.
13. **Compound Index Optimization:** I optimized query times by indexing query-heavy fields like `(teacherId + day + timeSlot)` in MongoDB.
14. **Custom Global Error Middleware:** I created a central Express handler that hides debug stack traces in production while standardizing API error responses.
15. **Vite Proxy Configurations:** I configured Vite to route client API requests to the backend server during development, avoiding CORS issues.

---

## 📝 Resume Project Description

**EduX – Smart Faculty & Timetable Planner** | *MERN Stack Developer*
* Designed and built a full-stack timetable planner using React, Express, Node.js, and MongoDB Atlas.
* Created a validation engine that prevents scheduling clashes (teachers, classrooms, workloads) before saving changes to the database.
* Designed MongoDB aggregation pipelines using `$lookup` and `$project` to calculate workloads dynamically, avoiding data sync issues.
* Built a smart generator that schedules classes, library slots, and lab sessions while respecting teacher availability and preferences.
* Integrated the Google Generative AI SDK to analyze teacher schedules and suggest substitute cover for leaves.
* Implemented secure authentication using access and refresh tokens in HTTP-only cookies, with silent token rotation in Axios.
* Built client-side exporters to generate branded, protected Excel spreadsheets and high-resolution A3 landscape PDFs.

---

## 🚧 Challenges Faced

### 1. Teacher Clash Detection
* **Challenge:** Preventing teachers from being assigned to multiple classes at the same time, especially during consecutive lab slots.
* **Solution:** Built queries in the validation engine to scan all timetables at the target day and slot. For labs, the engine checks availability for both target slots.

### 2. Dynamic Workload Calculation
* **Challenge:** Traditional static counters on teacher documents frequently went out of sync during failed edits or resets.
* **Solution:** Replaced static counters with runtime aggregations using `$reduce` to count hours based on slot durations (1 for lectures, 2 for labs).

### 3. MongoDB Aggregation Performance
* **Challenge:** Complex joins between timetables, teachers, and classrooms slowed down dashboard analytics.
* **Solution:** Added compound indexes on query-heavy paths, bringing search times down to sub-milliseconds.

### 4. ObjectId Validation Issues
* **Challenge:** MongoDB validation errors when saving new slots using plain string IDs.
* **Solution:** Created helper functions using `mongoose.Types.ObjectId.isValid` to validate and convert string IDs before database queries.

### 5. Multi-Layered Validation Engine
* **Challenge:** Keeping the validation logic clean without cluttering route controllers.
* **Solution:** Centralized all validation rules into `validationEngine.js`, creating simple `isValid` validation functions that controllers can call.

---

## 🏁 Project Status
The system is **Production Ready** and verified for deployment. It features a complete test seed suite, responsive user interfaces, and robust error handling.

---

## 🤝 Contributing
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/NewFeature`).
3. Commit your Changes (`git commit -m 'Add some NewFeature'`).
4. Push to the Branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Tirth Oza**
* B.Tech Information Technology Student, Parul University (Graduating 2027)
* Email: [ozatirth51@gmail.com](mailto:ozatirth51@gmail.com)
* LinkedIn: [Tirth Oza](https://linkedin.com/in/tirth-oza)
* GitHub: [ozatirth51](https://github.com/ozatirth51)
