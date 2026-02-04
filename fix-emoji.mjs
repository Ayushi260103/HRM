import fs from 'fs';
const path = 'src/app/dashboard/admin/page.tsx';
let content = fs.readFileSync(path, 'utf8');
const regex = /aria-hidden>([^<]+)<\/span>/g;
let count = 0;
content = content.replace(regex, (_, char) => {
  count++;
  return count === 1 ? 'aria-hidden>📋</span>' : count === 2 ? 'aria-hidden>👥</span>' : 'aria-hidden>📊</span>';
});
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed', count, 'emojis');
