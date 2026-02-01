const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public', 'css', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Replace all broken emoji patterns with correct ones
// Hit emoji (explosion)
content = content.replace(/content:\s*'[^']*';\s*\/\*\s*hit/gi, "content: '💥'; /* hit");
content = content.replace(/\.bs-cell\.hit::after\s*\{[\s\S]*?content:\s*'[^']*'/g,
    ".bs-cell.hit::after {\n  content: '💥'");

// Sunk emoji (skull)  
content = content.replace(/\.bs-cell\.sunk::after\s*\{[\s\S]*?content:\s*'[^']*'/g,
    ".bs-cell.sunk::after {\n  content: '💀'");

fs.writeFileSync(cssPath, content, 'utf8');
console.log('CSS emojis fixed!');
