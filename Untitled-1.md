You are a Principal Database Architect, MERN Stack Engineer, and AI Constraint Scheduling Expert.

You are designing the production database seed file for:

EduX – AI Smart Faculty & Timetable Planner


Technology:

MongoDB
Express.js
React.js
Node.js


Generate a complete Dataset.json file which can directly seed MongoDB.


The dataset must support:

- Admin timetable creation
- Teacher dashboard
- Subject management
- Teacher management
- AI timetable generation
- Conflict detection
- Workload analytics
- Teacher replacement
- Lab scheduling
- Semester filtering
- Division wise scheduling


================================================

DATABASE DESIGN


Generate these collections:


1. meta

2. departments

3. semesters

4. divisions

5. teachers

6. subjects

7. teacher_subject_mapping

8. classrooms

9. laboratories

10. timetable_rules

11. scheduling_constraints

12. timetable_generation_config


================================================

META


Create:


{
project_name:
"EduX AI Smart Faculty & Timetable Planner",

academic_year:
"2026-2027",

departments:[
"Information Technology",
"Computer Science Engineering"
],

semesters:[
1,2,3,4,5,6,7,8
]

}



================================================

DEPARTMENTS


Create:


{
department_id,

department_name,

short_name,

total_semesters:8

}


Departments:


IT

CSE



================================================

SEMESTERS


Create every semester 1-8.


Example:


{
semester_id:"IT_SEM6",

department_id:"IT",

semester_number:6,

academic_year:"2026-27",

divisions:[
"A",
"B",
"C",
"D",
"E",
"F"
]

}



================================================

DIVISIONS


Create:


{
division_id,

department,

semester,

division_name,

student_strength

}


Each semester:

A-F divisions.


================================================

TEACHERS


Generate minimum:

IT:
25 teachers


CSE:
25 teachers


Structure:


{
teacher_id,

name,

email,

mobile,


department,


designation,


experience_years,


min_hours_per_week:24,


max_hours_per_week:36,


current_assigned_hours:0,


remaining_capacity:36,


allowed_divisions:[

"A",
"B",
"C",
"D",
"E",
"F"

],


availability:{


Monday:{
available:true,

slots:[
1,2,3,4,5,6
]

}

},


blocked_slots:[],


preferred_slots:[],


status:"active"

}



IMPORTANT:

Do not store subjects inside teacher document.



================================================

SUBJECTS


Generate realistic IT and CSE curriculum.


Every semester:


8-12 Theory subjects

2-4 Lab subjects


Structure:


{
subject_id,

subject_code,

subject_name,


department,


semester,


type,


category,


credits,


weekly_periods minimum 24 maximum 36 ,


is_mandatory,

requires_lab,


lab_sessions_per_week,


lab_duration_slots,


required_room_type

}



Types:


Theory

Lab

Project

Seminar


Categories:


Core

Elective

Practical

Project



Subject codes must be unique.


Never create duplicate naming:

Wrong:

DBMS

Database Management System

Database Systems


Correct:

Database Management Systems

================================================

TEACHER SUBJECT MAPPING


Create separate relation.


Structure:


{
mapping_id,


teacher_id,


subject_id,


department,


semester,


allowed_divisions,


is_primary_teacher,


expertise_level,


experience_with_subject,


replacement_priority

}



Example:


replacement_priority:[


{
teacher_id:"T010",

priority_score:95,

reason:
"Same subject, same semester, available"

},


{
teacher_id:"T020",

priority_score:80,

reason:
"Same subject expertise"

}

]



Rules:

One teacher:

multiple subjects


One subject:

multiple teachers

================================================

CLASSROOMS


Generate:


30 classrooms


Structure:


{
room_id,

room_name,

capacity,

type,

available

}
================================================

LABORATORIES
Generate:

Structure:


{
lab_id,

lab_name,

capacity,

equipment,

available

}


================================================

TIMETABLE RULES


Create:


{

working_days:[

Monday,

Tuesday,

Wednesday,

Thursday,

Friday,

Saturday

],


periods_per_day:6,


period_slots:[


{
period:1,
start:"09:30",

end:"10:25"
period:2,
start:"10:25",

end:"11.20"     
period:3,
start:"12:20",

end:"01:25"
period:4,
start:"1:25",

end:"02:10"
period:5,
start:"02:30",

end:"03:25"
period:6,
start:"03:25",

end:"04:20"

break : [11:20 , 12:20 ],
        [2:10 , 2:30]
}


],


lab_requires_consecutive_slots:true

}



================================================

SCHEDULING CONSTRAINTS


Hard constraints:


- Same teacher cannot teach multiple divisions at same time

- Same classroom cannot have multiple classes

- Same lab cannot have multiple sessions

- Teacher workload cannot exceed 36 hours

- Minimum teacher workload target 24 hours

- Lab requires consecutive periods

- Division cannot have duplicate subject in same day



Soft constraints:


- Balance teacher workload

- Spread subjects through week

- Avoid consecutive heavy lectures

- Prefer teacher availability

- Prefer primary teacher

- Use replacement teacher automatically if required



================================================

REPLACEMENT TEACHER AI LOGIC


Generate replacement mapping based on:


Priority 1:

Same subject

Same department

Same semester


Priority 2:

Same subject

Different semester


Priority 3:

Similar subject expertise


Replacement selection must consider:


- Availability

- Current workload

- Maximum hours limit

- Division permission



================================================

TIMETABLE GENERATION CONFIG


Create:


{

generation_modes:[

"Full Rebuild",

"Fill Remaining"

],


allow_subject_selection:true,


allow_teacher_selection:true,


allow_lab_selection:true,


allow_manual_period_selection:true,


allow_ai_generation:true,


conflict_detection:true

}



================================================

FINAL OUTPUT


Return ONLY JSON.


Format:


{

meta:{},

departments:[],

semesters:[],

divisions:[],

teachers:[],

subjects:[],

teacher_subject_mapping:[],

classrooms:[],

laboratories:[],

timetable_rules:{},

scheduling_constraints:{},

timetable_generation_config:{}

}



The JSON must be directly importable into MongoDB.

No explanation.

Only production-ready Dataset.json.