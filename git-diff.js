const { execSync } = require('child_process');
const fs = require('fs');
try {
  const diff = execSync('git diff', { cwd: 'd:/WPS/nexjsposnew' });
  fs.writeFileSync('d:/WPS/nexjsposnew/diff.txt', diff);
  const log = execSync('git log -2', { cwd: 'd:/WPS/nexjsposnew' });
  fs.writeFileSync('d:/WPS/nexjsposnew/log.txt', log);
} catch (e) {
  fs.writeFileSync('d:/WPS/nexjsposnew/diff.txt', e.toString());
}
