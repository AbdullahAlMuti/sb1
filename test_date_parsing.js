
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  console.log(`Parsing: "${dateStr}"`);

  try {
    // 1. Try standard Date parsing first (handles ISO 8601, some standard formats)
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.toISOString();

    // 2. Handle "Jan-25-26" or "25-Jan-26" (common eBay formats: MMM-dd-yy or dd-MMM-yy)
    // Matches: (Jan|Feb|...)[- ](\d{1,2})[- ](\d{2,4}) OR (\d{1,2})[- ](Jan|Feb|...)[- ](\d{2,4})
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    const cleanStr = dateStr.trim().toLowerCase().replace(/,/g, '');
    const parts = cleanStr.split(/[- /]+/);

    if (parts.length >= 3) {
      let day, month, year;

      // Check for Month-Day-Year (Jan 25 26)
      if (months[parts[0]] !== undefined) {
        month = months[parts[0]];
        day = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } 
      // Check for Day-Month-Year (25 Jan 26)
      else if (months[parts[1]] !== undefined) {
        day = parseInt(parts[0]);
        month = months[parts[1]];
        year = parseInt(parts[2]);
      }

      if (day && month !== undefined && year) {
        // Adjust 2-digit year
        if (year < 100) year += 2000; 
        
        const d = new Date(Date.UTC(year, month, day));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
    
    return null;
  } catch (e) {
    console.error("Error parsing", e);
    return null;
  }
};

// Test cases
const cases = [
  "Jan-25-26",
  "25-Jan-26",
  "Jan 25, 2026",
  "2026-01-25",
  "01/25/2026", // potentially ambiguous MM/DD vs DD/MM, relying on JS default for now or assuming US
  "Invalid Date Here"
];

cases.forEach(c => console.log(`Result: ${parseDate(c)}\n`));
