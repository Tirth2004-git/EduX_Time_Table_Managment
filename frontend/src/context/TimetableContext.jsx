import { createContext, useContext, useState, useEffect } from 'react';

const TimetableContext = createContext(null);

export const TimetableProvider = ({ children }) => {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [classroomId, setClassroomId] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [warnings, setWarnings] = useState([]);

  // Local storage dependency removed. State will solely rely on MongoDB via API.

  const clearTimetableState = () => {
    setTimetable([]);
    setSelectedSlot(null);
    setSelectedSubject('');
    setConflicts([]);
    setWarnings([]);
  };

  const resetOnSelectionChange = () => {
    setTimetable([]);
    setSelectedSlot(null);
    setSelectedSubject('');
    setConflicts([]);
    setWarnings([]);
    setClassroomId(null);
  };

  const handleSetSelectedSemester = (sem) => {
    setSelectedSemester(sem);
    resetOnSelectionChange();
  };

  const handleSetSelectedDivision = (div) => {
    setSelectedDivision(div);
    resetOnSelectionChange();
  };

  return (
    <TimetableContext.Provider
      value={{
        selectedProgram, setSelectedProgram,
        selectedClass, setSelectedClass,
        selectedSemester, setSelectedSemester: handleSetSelectedSemester,
        selectedDivision, setSelectedDivision: handleSetSelectedDivision,
        classroomId, setClassroomId,
        timetable, setTimetable,
        selectedSlot, setSelectedSlot,
        selectedSubject, setSelectedSubject,
        conflicts, setConflicts,
        warnings, setWarnings,
        clearTimetableState,
        resetOnSelectionChange
      }}
    >
      {children}
    </TimetableContext.Provider>
  );
};

export const useTimetable = () => {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
};
