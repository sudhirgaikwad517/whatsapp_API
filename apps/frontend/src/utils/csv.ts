/**
 * RFC4180-ish CSV line splitter — unlike a naive `line.split(',')`, this
 * respects a comma INSIDE a quoted field (e.g. a business name like
 * "Sharma Enterprises, Mumbai") instead of treating it as a column
 * separator. Without this, one comma inside any quoted value shifts every
 * later column's index for that entire row — which is exactly how a
 * business name/address ended up landing in the phone number column and
 * overflowing its DB column length on a real campaign launch (a plain
 * `split(',')` has no way to tell "a comma that ends a field" apart from
 * "a comma that's part of a field's own text").
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++; // consume the escaped quote's second character too
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
