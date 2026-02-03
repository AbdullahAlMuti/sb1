
const parseCsv = (text) => {
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (inQuotes) {
            if (ch === '"' && next === '"') { cur += '"'; i++; continue; }
            if (ch === '"') { inQuotes = false; continue; }
            cur += ch;
            continue;
        }
        if (ch === '"') { inQuotes = true; continue; }
        if (ch === ',') { row.push(cur); cur = ''; continue; }
        if (ch === '\n') { row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; continue; }
        if (ch === '\r') continue;
        cur += ch;
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows[0].map(h => (h || '').trim());
    return rows.slice(1).map(r => {
        const obj = {};
        for (let i = 0; i < headers.length; i++) obj[headers[i] || `col_${i}`] = r[i] ?? '';
        return obj;
    });
};

const sampleCsv = `Order number,Buyer name,Item title,Price,Date sold
12345,"Smith, John","Blue Widget, Large",10.99,2026-01-25
67890,Jane Doe,"Red Widget, ""Super"" Edition",15.50,25-Jan-26
`;

const result = parseCsv(sampleCsv);
console.log(JSON.stringify(result, null, 2));

if (result.length === 2 && result[0]['Buyer name'] === 'Smith, John' && result[1]['Item title'] === 'Red Widget, "Super" Edition') {
    console.log("PASS: CSV Parser works for quoted commas and escaped quotes.");
} else {
    console.log("FAIL: CSV Parser has issues.");
}
