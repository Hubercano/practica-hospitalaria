export type ExcelCellValue = string | number | boolean | null | undefined;

export async function exportToExcel(
  data: Array<Record<string, ExcelCellValue>>,
  baseFileName: string,
  sheetName = 'Datos'
): Promise<void> {
  const XLSX = await import('xlsx');

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const suffix = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const fileName = `${baseFileName}_${suffix}.xlsx`;

  // Yield to the UI thread before writing the file in large datasets.
  setTimeout(() => XLSX.writeFile(workbook, fileName), 0);
}
