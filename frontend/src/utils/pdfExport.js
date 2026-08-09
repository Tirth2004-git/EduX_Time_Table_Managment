import jsPDF from 'jspdf';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const valueId = (value) => (value && typeof value === 'object' ? value._id : value);
const present = (value) => value !== undefined && value !== null && value !== '';

export async function exportTimetableToPDF({
  timetable = [], subjects = [], teachers = [], department, semester, division,
  classroom, academicYear, filename = 'timetable.pdf',
}) {
  if (!timetable.length) throw new Error('No timetable data to export');

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pageWidth = 420;
  const pageHeight = 297;
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const resolve = (entry, field, collection) => {
    const raw = entry[field];
    if (raw && typeof raw === 'object') return raw;
    return collection.find((item) => String(item._id) === String(raw));
  };
  const subjectFor = (entry) => resolve(entry, 'subjectId', subjects) || entry.subject || {};
  const teacherFor = (entry) => resolve(entry, 'teacherId', teachers) || entry.teacher || {};
  const typeFor = (entry) => entry.isLab || entry.slot_type === 'LAB' ? 'LAB' : (entry.slot_type || entry.type || 'THEORY').replace('LECTURE', 'THEORY');
  const slotFor = (entry) => entry.timeSlot || entry.slot || entry.period || '';
  const entriesFor = (day, slot) => timetable.filter((entry) => entry.day === day && slotFor(entry) === slot);
  const slots = [...new Set(timetable.map(slotFor).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const line = (text, x, y, width, options = {}) => {
    const lines = pdf.splitTextToSize(String(text || '—'), width);
    pdf.text(lines, x, y, options);
    return lines.length;
  };
  const footer = () => {
    pdf.setDrawColor(210, 218, 230);
    pdf.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('EduX Planner • University Timetable', margin, pageHeight - 6);
    pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  };
  const page = () => { footer(); pdf.addPage(); };

  // Header
  pdf.setFillColor(30, 64, 175);
  pdf.roundedRect(margin, margin, usableWidth, 31, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22); pdf.text('EduX Planner', margin + 8, 26);
  pdf.setFontSize(12); pdf.text('Weekly Timetable', margin + 8, 35);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9); pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin - 8, 31, { align: 'right' });
  pdf.setTextColor(30, 41, 59);

  const metadata = [
    ['Department', department], ['Semester', semester], ['Division', division],
    ['Classroom', classroom], ['Academic Year', academicYear],
  ];
  let metadataY = 54;
  metadata.forEach(([label, value], index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + column * (usableWidth / 3);
    const y = metadataY + row * 12;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.text(`${label}:`, x, y);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(15, 23, 42); pdf.text(String(value || '—'), x + 25, y);
  });

  let y = 82;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(30, 41, 59); pdf.text('Weekly Timetable Grid', margin, y);
  y += 5;
  const timeWidth = 39;
  const dayWidth = (usableWidth - timeWidth) / DAYS.length;
  const headerHeight = 10;
  pdf.setFillColor(30, 64, 175); pdf.rect(margin, y, usableWidth, headerHeight, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
  pdf.text('TIME', margin + 3, y + 6.5);
  DAYS.forEach((day, index) => pdf.text(day.slice(0, 3).toUpperCase(), margin + timeWidth + dayWidth * index + dayWidth / 2, y + 6.5, { align: 'center' }));
  y += headerHeight;
  slots.forEach((slot, rowIndex) => {
    const rowHeight = 27;
    const fill = rowIndex % 2 ? [248, 250, 252] : [255, 255, 255];
    pdf.setFillColor(...fill); pdf.rect(margin, y, usableWidth, rowHeight, 'F');
    pdf.setDrawColor(203, 213, 225); pdf.rect(margin, y, usableWidth, rowHeight);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 41, 59); pdf.setFontSize(8); line(slot, margin + 2.5, y + 7, timeWidth - 5);
    DAYS.forEach((day, index) => {
      const x = margin + timeWidth + dayWidth * index;
      pdf.line(x, y, x, y + rowHeight);
      const entries = entriesFor(day, slot);
      if (!entries.length) return;
      const entry = entries[0]; const subject = subjectFor(entry);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(15, 23, 42); pdf.setFontSize(7.2);
      line(subject.subject_name || subject.name || 'Subject', x + 2, y + 6, dayWidth - 4);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(71, 85, 105); pdf.setFontSize(6.8);
      line(subject.subject_code || subject.code || '—', x + 2, y + 14, dayWidth - 4);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 64, 175); pdf.setFontSize(6.7);
      pdf.text(typeFor(entry), x + 2, y + 23);
    });
    y += rowHeight;
  });
  footer();

  // Supporting tables start on a clean page so the grid is never cropped.
  page();
  y = margin + 9;
  const drawSection = (title, headers, rows, widths) => {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(30, 41, 59); pdf.text(title, margin, y); y += 6;
    const headerH = 9;
    pdf.setFillColor(30, 64, 175); pdf.rect(margin, y, usableWidth, headerH, 'F');
    let x = margin; pdf.setTextColor(255, 255, 255); pdf.setFontSize(8);
    headers.forEach((header, i) => { pdf.text(header, x + 2, y + 5.8); x += widths[i]; }); y += headerH;
    rows.forEach((row, index) => {
      const textLines = row.map((value, i) => pdf.splitTextToSize(String(value || '—'), widths[i] - 4));
      const rowH = Math.max(10, ...textLines.map((lines) => lines.length * 4 + 5));
      if (y + rowH > pageHeight - 18) { page(); y = margin + 9; }
      pdf.setFillColor(...(index % 2 ? [248, 250, 252] : [255, 255, 255])); pdf.rect(margin, y, usableWidth, rowH, 'F');
      pdf.setDrawColor(203, 213, 225); pdf.rect(margin, y, usableWidth, rowH);
      x = margin; pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 41, 59); pdf.setFontSize(7.5);
      textLines.forEach((lines, i) => { pdf.text(lines, x + 2, y + 5.5); pdf.line(x, y, x, y + rowH); x += widths[i]; });
      y += rowH;
    });
    y += 13;
  };
  const usedFaculty = new Map();
  timetable.forEach((entry) => {
    const teacher = teacherFor(entry); const subject = subjectFor(entry); const id = valueId(entry.teacherId) || teacher._id;
    if (present(id) && !usedFaculty.has(String(id))) usedFaculty.set(String(id), [teacher.teacher_id || teacher.teacherId || teacher.employee_id || '—', teacher.faculty_name || teacher.name || '—', subject.subject_name || subject.name || '—', subject.subject_code || subject.code || '—', teacher.email || '—']);
  });
  drawSection('Faculty Allocation Details', ['Faculty ID', 'Faculty Name', 'Subject Assigned', 'Subject Code', 'Email'], [...usedFaculty.values()], [55, 76, 105, 45, 111]);
  const subjectSummary = new Map();
  timetable.forEach((entry) => {
    const subject = subjectFor(entry); const code = subject.subject_code || subject.code || String(valueId(entry.subjectId) || '—');
    const type = typeFor(entry); const key = `${code}:${type}`;
    const existing = subjectSummary.get(key) || [code, subject.subject_name || subject.name || '—', type, 0];
    existing[3] += Number(entry.duration) || 1; subjectSummary.set(key, existing);
  });
  drawSection('Subject Period Summary', ['Code', 'Subject Name', 'Type', 'Total Periods'], [...subjectSummary.values()], [60, 190, 70, 72]);
  footer();
  pdf.save(filename);
}
