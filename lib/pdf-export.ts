import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportOptions {
  viewMode: 'class' | 'teacher' | 'subject';
  title: string;
  filename: string;
}

export async function exportTimetableToPDF(options: ExportOptions): Promise<void> {
  const { title, filename } = options;
  
  try {
    const container = document.getElementById('timetable-export-container');
    if (!container) {
      throw new Error('Timetable container not found');
    }

    // Clone container to render full grid without scroll constraints
    const clone = container.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.width = '1400px';
    clone.style.overflow = 'visible';
    document.body.appendChild(clone);

    // Render full grid to canvas
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    document.body.removeChild(clone);

    // A3 landscape (420mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
    });

    const pageWidth = 420;
    const pageHeight = 297;
    const margin = 15;
    const headerHeight = 25;
    const footerHeight = 10;
    const availableWidth = pageWidth - (2 * margin);
    const availableHeight = pageHeight - headerHeight - footerHeight - margin;

    // Header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, 15);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    pdf.text(`Generated on: ${currentDate}`, margin, 22);
    pdf.text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, pageWidth - margin - 60, 22);

    // Calculate scale to fit entire grid on single page
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const imgAspectRatio = imgWidth / imgHeight;

    let scaledWidth = availableWidth;
    let scaledHeight = scaledWidth / imgAspectRatio;

    if (scaledHeight > availableHeight) {
      scaledHeight = availableHeight;
      scaledWidth = scaledHeight * imgAspectRatio;
    }

    const xOffset = margin + (availableWidth - scaledWidth) / 2;
    const yOffset = headerHeight;

    pdf.addImage(
      canvas.toDataURL('image/png', 1.0),
      'PNG',
      xOffset,
      yOffset,
      scaledWidth,
      scaledHeight,
      undefined,
      'FAST'
    );

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(
      'Auto-Fitted Weekly Timetable — Single Page Layout',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    pdf.save(filename);
    
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
}