const ExcelJS = require('exceljs');
const path = require('path');
(async ()=>{
  const file = path.resolve(process.argv[2]);
  if (!file) { console.error('Usage: node count_codes.js <file>'); process.exit(1); }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.getWorksheet(1);
  const codes = new Map();
  let totalRows = 0;
  sheet.eachRow((row, rowNumber)=>{
    if (rowNumber===1) return;
    totalRows++;
    const code = row.getCell(1).value;
    if (!code) return;
    const s = String(code).trim();
    codes.set(s, (codes.get(s)||0)+1);
  });
  console.log('totalRows (excluding header):', totalRows);
  console.log('uniqueCodes:', codes.size);
  const dups = [...codes.entries()].filter(([k,v])=>v>1).sort((a,b)=>b[1]-a[1]);
  console.log('duplicate codes count:', dups.length);
  console.log('top duplicates (code -> occurrences):', dups.slice(0,20));
})();