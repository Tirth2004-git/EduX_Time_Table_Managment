import { saveAs } from 'file-saver';

export function exportTimetableToCSV(options) {
  const { title, filename, days, timeSlots, timetable } = options;

  let csvContent = `"${title}"\n\n`;
  csvContent += `"Time",${days.map(d => `"${d}"`).join(',')}\n`;

  timeSlots.forEach(slot => {
    const rowCells = [`"${slot}"`];
    days.forEach(day => {
      // Find entry matching day and slot
      const entry = timetable.find(
        (e) => e.day === day && (e.timeSlot === slot || e.timeSlot === slot)
      );
      if (entry) {
        const subject = entry.subjectId?.subject_name || entry.subject?.subject_name || '';
        const code = entry.subjectId?.subject_code || entry.subject?.subject_code || '';
        const faculty = entry.teacherId?.faculty_name || entry.teacher?.faculty_name || '';
        const room = entry.classroomId?.roomNumber || entry.classroom?.roomNumber || '';
        
        const cellText = `${subject} (${code})\nTeacher: ${faculty}\nRoom: ${room}`.replace(/"/g, '""');
        rowCells.push(`"${cellText}"`);
      } else {
        rowCells.push('""');
      }
    });
    csvContent += rowCells.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}
