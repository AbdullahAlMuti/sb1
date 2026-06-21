const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'ui', 'panel.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Remove !important incrementally by boosting selector specificity
// We'll wrap all main rules in a :root or body ancestor to naturally boost their power over legacy external styles.

let newCss = css.replace(/([^{]+)\s*\{([^}]+)\}/g, (match, selector, body) => {
    // Skip at-rules like @media
    if (selector.trim().startsWith('@')) return match;
    
    // Count important tags in this block
    const importantCount = (body.match(/!important/g) || []).length;
    
    if (importantCount > 0) {
        // Boost selector specificity (add :root if it doesn't have it)
        let boostedSelector = selector.split(',').map(s => {
            s = s.trim();
            if (s === ':root' || s.startsWith('@')) return s;
            return ':root ' + s;
        }).join(', ');
        
        // Remove !important from the body
        let cleanBody = body.replace(/\s*!important/g, '');
        
        return boostedSelector + ' {' + cleanBody + '}';
    }
    
    return match;
});

// Grouping and Variable application would follow here...
fs.writeFileSync(cssPath.replace('.css', '_clean.css'), newCss);
console.log('Cleaned CSS created with boosted specificities.');
