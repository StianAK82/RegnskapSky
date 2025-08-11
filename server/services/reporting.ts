// Time reporting service for Excel and PDF exports
export interface TimeEntryReport {
  id: string;
  clientName: string;
  userName: string;
  taskName?: string;
  description: string;
  timeSpent: number;
  date: Date;
  billable: boolean;
}

class ReportService {
  async generateTimeReport(timeEntries: TimeEntryReport[], format: 'excel' | 'pdf'): Promise<Buffer> {
    if (format === 'excel') {
      return this.generateExcelReport(timeEntries);
    } else {
      return this.generatePdfReport(timeEntries);
    }
  }

  private async generateExcelReport(timeEntries: TimeEntryReport[]): Promise<Buffer> {
    // Mock Excel generation - in production, use libraries like ExcelJS
    const csvContent = [
      'Dato,Klient,Ansatt,Oppgave,Beskrivelse,Timer,Fakturerbar',
      ...timeEntries.map(entry => [
        entry.date.toISOString().split('T')[0],
        entry.clientName,
        entry.userName,
        entry.taskName || 'Ingen oppgave',
        entry.description,
        entry.timeSpent,
        entry.billable ? 'Ja' : 'Nei'
      ].join(','))
    ].join('\n');
    
    return Buffer.from(csvContent, 'utf-8');
  }

  private async generatePdfReport(timeEntries: TimeEntryReport[]): Promise<Buffer> {
    // Mock PDF generation - in production, use libraries like PDFKit or Puppeteer
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.timeSpent, 0);
    const billableHours = timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.timeSpent, 0);
    
    const reportContent = `
TIMEREGISTRERING RAPPORT
========================

Total timer: ${totalHours}
Fakturerbare timer: ${billableHours}
Ikke-fakturerbare timer: ${totalHours - billableHours}

Detaljer:
${timeEntries.map(entry => 
  `${entry.date.toISOString().split('T')[0]} - ${entry.clientName} - ${entry.userName} - ${entry.timeSpent}t - ${entry.description}`
).join('\n')}
    `;
    
    return Buffer.from(reportContent, 'utf-8');
  }
}

export const reportService = new ReportService();