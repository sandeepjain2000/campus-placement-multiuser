import http from 'http';

function get(u) {
  return new Promise((res, rej) => {
    http
      .get(u, (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => res({ s: r.statusCode, d }));
      })
      .on('error', rej);
  });
}

const login = await get('http://localhost:3000/login');
console.log('login', login.s);
const uniq = [...new Set([...login.d.matchAll(/\/_next\/static\/css\/[^"']+/g)].map((x) => x[0]))];
for (const c of uniq) {
  const css = await get(`http://localhost:3000${c}`);
  console.log('css', c.slice(-48), 'len', css.d.length);
  for (const k of ['bg-primary', 'sr-only', 'max-w-lg', 'h-9', 'shadow-xs', 'flex{']) {
    console.log(' ', k, css.d.split(k).length - 1);
  }
}
