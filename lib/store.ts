import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

// Timetable Entry Interface
interface TimetableEntry {
  _id: string;
  program: string;
  className: string;
  semester: number;
  division: string;
  day: string;
  timeSlot: string;
  subjectId: {
    _id: string;
    subject_name: string;
    subject_code: string;
    requiredPeriods: number;
    allottedPeriods: number;
    remainingPeriods: number;
  };
  teacherId: {
    _id: string;
    teacherID: string;
    faculty_name: string;
    department: string;
    teaching_hours: number;
    assignedHours: number;
    remainingHours: number;
  };
  status: string;
}

interface TimetableState {
  // Selection state
  selectedProgram: string;
  selectedClass: string;
  selectedSemester: number | '';
  selectedDivision: string;
  classroomId: string | null;
  
  // Timetable data
  timetable: TimetableEntry[];
  
  // UI state
  selectedSlot: { day: string; time: string } | null;
  selectedSubject: string;
  
  // Validation state
  conflicts: string[];
  warnings: string[];
  
  // Actions
  setSelectedProgram: (program: string) => void;
  setSelectedClass: (className: string) => void;
  setSelectedSemester: (semester: number | '') => void;
  setSelectedDivision: (division: string) => void;
  setClassroomId: (id: string | null) => void;
  setTimetable: (timetable: TimetableEntry[]) => void;
  setSelectedSlot: (slot: { day: string; time: string } | null) => void;
  setSelectedSubject: (subject: string) => void;
  setConflicts: (conflicts: string[]) => void;
  setWarnings: (warnings: string[]) => void;
  
  // Utility actions
  saveTimetableState: () => void;
  restoreTimetableState: () => void;
  clearTimetableState: () => void;
  
  // Reset on division/semester change
  resetOnSelectionChange: () => void;
}

const initialState = {
  selectedProgram: '',
  selectedClass: '',
  selectedSemester: '' as number | '',
  selectedDivision: '',
  classroomId: null,
  timetable: [],
  selectedSlot: null,
  selectedSubject: '',
  conflicts: [],
  warnings: [],
};

export const useTimetableStore = create<TimetableState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setSelectedProgram: (program) => set({ selectedProgram: program }),
      setSelectedClass: (className) => set({ selectedClass: className }),
      setSelectedSemester: (semester) => {
        set({ selectedSemester: semester });
        // Reset timetable when semester changes
        if (semester !== get().selectedSemester) {
          get().resetOnSelectionChange();
        }
      },
      setSelectedDivision: (division) => {
        set({ selectedDivision: division });
        // Reset timetable when division changes
        if (division !== get().selectedDivision) {
          get().resetOnSelectionChange();
        }
      },
      setClassroomId: (id) => set({ classroomId: id }),
      setTimetable: (timetable) => set({ timetable }),
      setSelectedSlot: (slot) => set({ selectedSlot: slot }),
      setSelectedSubject: (subject) => set({ selectedSubject: subject }),
      setConflicts: (conflicts) => set({ conflicts }),
      setWarnings: (warnings) => set({ warnings }),
      
      saveTimetableState: () => {
        // State is automatically persisted by Zustand persist middleware
      },
      
      restoreTimetableState: () => {
        // State is automatically restored by Zustand persist middleware
      },
      
      clearTimetableState: () => {
        set({
          ...initialState,
          // Keep program/class selection but clear timetable-specific data
          timetable: [],
          selectedSlot: null,
          selectedSubject: '',
          conflicts: [],
          warnings: [],
        });
      },
      
      resetOnSelectionChange: () => {
        set({
          timetable: [],
          selectedSlot: null,
          selectedSubject: '',
          conflicts: [],
          warnings: [],
          classroomId: null,
        });
      },
    }),
    {
      name: 'timetable-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        selectedProgram: state.selectedProgram,
        selectedClass: state.selectedClass,
        selectedSemester: state.selectedSemester,
        selectedDivision: state.selectedDivision,
        classroomId: state.classroomId,
        timetable: state.timetable,
        selectedSlot: state.selectedSlot,
        selectedSubject: state.selectedSubject,
        conflicts: state.conflicts,
        warnings: state.warnings,
      }),
    }
  )
);

