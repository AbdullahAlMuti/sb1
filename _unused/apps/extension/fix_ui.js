const fs = require('fs');
let content = fs.readFileSync('common/ui.js', 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('common/ui.js', content);
console.log('Fixed syntax errors');
