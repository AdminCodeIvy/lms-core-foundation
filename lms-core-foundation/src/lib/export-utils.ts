import * as XLSX from 'xlsx';

interface ExportOptions {
  data: any[];
  filename: string;
  sheetName?: string;
  includeMetadata?: boolean;
  metadata?: {
    exportDate?: string;
    exportedBy?: string;
    filters?: string;
    totalRecords?: number;
  };
}

export function exportToExcel({
  data,
  filename,
  sheetName = 'Data',
  includeMetadata = true,
  metadata = {},
}: ExportOptions) {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add main data sheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Add metadata sheet if requested
    if (includeMetadata) {
      const metadataSheet = [
        ['Export Information', ''],
        ['Export Date', metadata.exportDate || new Date().toLocaleString()],
        ['Exported By', metadata.exportedBy || 'Unknown'],
        ['Total Records', metadata.totalRecords || data.length],
        ['Filters Applied', metadata.filters || 'None'],
      ];
      const metaWorksheet = XLSX.utils.aoa_to_sheet(metadataSheet);
      XLSX.utils.book_append_sheet(workbook, metaWorksheet, 'Export Info');
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Download file
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
