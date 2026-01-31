const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public', 'css', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Fix corrupted emoji characters
content = content.replace(/content: 'рџ'Ґ';/g, "content: '💥';");
content = content.replace(/content: 'рџЌЉ';/g, "content: '🌊';");
content = content.replace(/content: 'рџЊЉ';/g, "content: '🌊';");
content = content.replace(/content: 'рџ'Ђ';/g, "content: '💀';");

fs.writeFileSync(cssPath, content, 'utf8');
console.log('CSS emoji fixed!');
