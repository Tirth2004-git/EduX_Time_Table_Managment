import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { UNIVERSITY_BRANDING, fetchImageAsDataUrl } from '@/utils/branding';

function getEntry(timetable, day, timeSlot) {
  return timetable.find((e) => e.day === day && e.timeSlot === timeSlot);
}

export async function exportTimetableToExcel(options) {
  const { title, filename, days, timeSlots, timetable } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EduX Timetable Management';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Timetable', {
    properties: { defaultRowHeight: 18 },
    views: [{ state: 'frozen', xSplit: 1, ySplit: 6 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  // Default: lock everything; we will unlock only timetable grid cells.
  ws.getColumn(1).width = 16; // Time column
  for (let i = 0; i < days.length; i++) ws.getColumn(2 + i).width = 26;

  // Branding header rows (1..4)
  ws.mergeCells('C1', `${String.fromCharCode(66 + days.length)}1`); // C1..?
  ws.mergeCells('C2', `${String.fromCharCode(66 + days.length)}2`);
  ws.mergeCells('C3', `${String.fromCharCode(66 + days.length)}3`);

  ws.getCell('C1').value = UNIVERSITY_BRANDING.universityName;
  ws.getCell('C1').font = { bold: true, size: 18 };
  ws.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getCell('C2').value = UNIVERSITY_BRANDING.facultyName;
  ws.getCell('C2').font = { bold: false, size: 12 };
  ws.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getCell('C3').value = title;
  ws.getCell('C3').font = { bold: true, size: 12 };
  ws.getCell('C3').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 6;

  // Logo (top-left), locked - non-fatal if it fails
  try {
    const logoDataUrl = await fetchImageAsDataUrl(UNIVERSITY_BRANDING.logoUrl);
    const logoId = workbook.addImage({ base64: logoDataUrl, extension: 'png' });
    ws.addImage(logoId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 110, height: 60 },
    });
  } catch (e) {
    console.warn('Excel export: failed to load logo image, continuing without logo', e);
  }

  // Divider line row 5
  ws.mergeCells(5, 1, 5, 1 + days.length);
  ws.getRow(5).height = 4;
  ws.getCell(5, 1).border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };

  // Table header row 6
  const headerRow = 6;
  ws.getCell(headerRow, 1).value = 'Time';
  ws.getCell(headerRow, 1).font = { bold: true };
  ws.getCell(headerRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell(headerRow, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

  days.forEach((day, idx) => {
    const c = 2 + idx;
    const cell = ws.getCell(headerRow, c);
    cell.value = day;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  });
  ws.getRow(headerRow).height = 22;

  // Data rows (unlocked only for timetable grid cells)
  const firstDataRow = headerRow + 1;

  timeSlots.forEach((slot, rIdx) => {
    const rowNumber = firstDataRow + rIdx;
    const row = ws.getRow(rowNumber);
    row.height = 46;

    const timeCell = ws.getCell(rowNumber, 1);
    timeCell.value = slot;
    timeCell.font = { bold: true };
    timeCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    timeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

    days.forEach((day, cIdx) => {
      const colNumber = 2 + cIdx;
      const cell = ws.getCell(rowNumber, colNumber);
      const entry = getEntry(timetable, day, slot);

      const subject = entry?.subjectId?.subject_name ?? '';
      const code = entry?.subjectId?.subject_code ? `(${entry.subjectId.subject_code})` : '';
      const faculty = entry?.teacherId?.faculty_name ?? '';
      const room = entry?.classroomId && 'roomNumber' in entry.classroomId ? entry.classroomId.roomNumber ?? '' : '';

      const lines = [
        subject ? `${subject} ${code}`.trim() : '',
        faculty ? `Faculty: ${faculty}` : '',
        room ? `Room: ${room}` : '',
      ].filter(Boolean);

      cell.value = lines.join('\n');
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.font = { size: 11 };

      // Unlock only these data cells so they remain editable.
      cell.protection = { locked: false };
    });
  });

  // Borders for table area
  const lastRow = firstDataRow + timeSlots.length - 1;
  const lastCol = 1 + days.length;
  for (let r = headerRow; r <= lastRow; r++) {
    for (let c = 1; c <= lastCol; c++) {
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    }
  }

  // Lock branding + headers explicitly
  for (let r = 1; r <= headerRow; r++) {
    for (let c = 1; c <= lastCol; c++) {
      ws.getCell(r, c).protection = { locked: true };
    }
  }

  // Protect sheet: structure & branding locked; only unlocked grid cells editable.
  await ws.protect('ParulUniversity', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
}
