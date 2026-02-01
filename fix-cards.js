const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public', 'css', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Increase base card size: 70x98 -> 85x119
content = content.replace(/\.dk-card\s*\{[\s\S]*?width:\s*70px;/g, match =>
    match.replace('width: 70px;', 'width: 85px;'));
content = content.replace(/\.dk-card\s*\{[\s\S]*?height:\s*98px;/g, match =>
    match.replace('height: 98px;', 'height: 119px;'));

// Increase mobile card size: 48x67 -> 65x91
content = content.replace(/width:\s*48px;/g, 'width: 65px;');
content = content.replace(/height:\s*67px;/g, 'height: 91px;');

// Increase font sizes in mobile
content = content.replace(/font-size:\s*0\.75rem;/g, 'font-size: 0.9rem;');
content = content.replace(/font-size:\s*0\.6rem;/g, 'font-size: 0.75rem;');
content = content.replace(/font-size:\s*1\.4rem;/g, 'font-size: 1.8rem;');

// Fix dk-pair size
content = content.replace(/\.dk-pair\s*\{[\s\S]*?width:\s*70px;/g, match =>
    match.replace('width: 70px;', 'width: 85px;'));
content = content.replace(/\.dk-pair\s*\{[\s\S]*?height:\s*98px;/g, match =>
    match.replace('height: 98px;', 'height: 119px;'));

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Card sizes increased!');
