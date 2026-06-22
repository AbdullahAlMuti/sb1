const fs = require('fs');
const path = require('path');

const filePaths = [
  path.join(__dirname, 'apps/extension/ui/panel.html'),
  path.join(__dirname, 'apps/web/public/chrome_extension/ui/panel.html')
];

for (const filePath of filePaths) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find <style> and </style>
    const startIndex = content.indexOf('<style>');
    const endIndex = content.indexOf('</style>');
    
    if (startIndex !== -1 && endIndex !== -1) {
      // Remove everything between <style> and </style> inclusive, and replace with a link tag
      const before = content.substring(0, startIndex);
      const after = content.substring(endIndex + 8); // 8 is length of '</style>'
      
      content = before + '<link rel="stylesheet" href="panel.css">' + after;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    } else {
      console.log(`No <style> block found in ${filePath}`);
    }
  }
}
