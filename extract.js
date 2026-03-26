const fs = require('fs');
const lines = fs.readFileSync('app/globals.css', 'utf8').split('\n');
const startIdx = 6617;
const endIdx = 7058;
const extracted = lines.slice(startIdx, endIdx);
fs.writeFileSync('app/login/login.css', extracted.join('\n'));
const newGlobals = [...lines.slice(0, startIdx), ...lines.slice(endIdx)];
fs.writeFileSync('app/globals.css', newGlobals.join('\n'));
console.log('Extracted ' + extracted.length + ' lines.');
