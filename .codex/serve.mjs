import http from 'node:http';
import { readFile, stat, writeFile, rename, mkdir, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { validateProject } from '../app/config/validation.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.EK_PORT || 4177);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
Object.assign(mime, { '.svg':'image/svg+xml', '.jpeg':'image/jpeg', '.gif':'image/gif', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ogg':'audio/ogg', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf' });
let writing = false;
const json = (res, code, value) => { res.writeHead(code, {'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); };
async function body(req, limit = 12000000) {
  let result = '', size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Error('Request too large.'); result += chunk; }
  return JSON.parse(result);
}
async function assets(folder, prefix) {
  const result = [];
  for (const entry of await readdir(folder,{withFileTypes:true}).catch(()=>[])) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) result.push(...await assets(path.join(folder,entry.name),`${prefix}/${entry.name}`));
    else if (/\.(png|jpe?g|webp|gif|mp3|wav|ogg|woff2?|ttf)$/i.test(entry.name)) result.push({id:`${prefix}/${entry.name}`,name:entry.name,path:`${prefix}/${entry.name}`,kind:/\.(mp3|wav|ogg)$/i.test(entry.name)?'audio':/\.(woff2?|ttf)$/i.test(entry.name)?'font':'image'});
  }
  return result;
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/__health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ app: 'exploding-kittens-original-local', port }));
    }
    if (url.pathname.startsWith('/__editor/')) {
      // Local tooling only. Reject cross-origin browser writes and DNS rebinding.
      if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) return json(res,403,{error:'Use the loopback address.'});
      if (req.method === 'POST' && (![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin) || !req.headers['content-type']?.startsWith('application/json'))) return json(res,403,{error:'Same-origin JSON requests only.'});
      try {
        if (url.pathname === '/__editor/config' && req.method === 'POST') {
          if (writing) return json(res,409,{error:'Another save is in progress.'});
          writing=true;
          try {
            const {project, base} = await body(req,2000000); validateProject(project);
            const target=path.join(root,'app/config/project.json'), previous=await readFile(target,'utf8');
            if (base !== previous) return json(res,409,{error:'Configuration changed on disk. Reload the dashboard before saving.'});
            await mkdir(path.join(root,'.codex/editor-backups'),{recursive:true});
            const backup=`.codex/editor-backups/${Date.now()}-${randomUUID()}.json`;
            await writeFile(path.join(root,backup),previous);
            const next=JSON.stringify(project,null,2)+'\n';
            await writeFile(target+'.tmp',next); await rename(target+'.tmp',target);
            return json(res,200,{text:next,backup});
          } finally { writing=false; }
        }
        if (url.pathname === '/__editor/assets' && req.method === 'GET') return json(res,200,await assets(path.join(root,'Assets'),'/Assets').then(async list=>[...list,...await assets(path.join(root,'app/config/uploads'),'/app/config/uploads')]));
        if (url.pathname === '/__editor/source' && req.method === 'GET') {
          const file=url.searchParams.get('file');
          if (!(file==='index.html' || file==='app/config/project.json' || /^app\/[\w/-]+\.(js|css)$/.test(file||'')) || file.includes('..')) return json(res,403,{error:'Source path not allowed.'});
          return json(res,200,{file,text:await readFile(path.join(root,file),'utf8')});
        }
        if (url.pathname === '/__editor/upload' && req.method === 'POST') {
          const upload=await body(req); const ext=path.extname(upload.name||'').toLowerCase();
          if (!['.png','.jpg','.jpeg','.webp','.gif','.wav','.mp3','.ogg','.woff','.woff2','.ttf'].includes(ext) || !/^[A-Za-z0-9+/=]+$/.test(upload.data||'')) throw new Error('Upload an image, audio or font file (up to 8 MB).');
          const data=Buffer.from(upload.data,'base64'); if(data.length>8000000)throw new Error('Upload maximum is 8 MB.');
          const name=`${randomUUID()}${ext}`; await mkdir(path.join(root,'app/config/uploads'),{recursive:true});
          await writeFile(path.join(root,'app/config/uploads',name),data,{flag:'wx'});
          return json(res,200,{path:`/app/config/uploads/${name}`,originalName:upload.name});
        }
        return json(res,404,{error:'Unknown editor endpoint.'});
      } catch(error) { return json(res,400,{error:error.message}); }
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const name = decodeURIComponent(url.pathname);
    if (name.includes('\\') || name.includes('\0')) { res.writeHead(400); return res.end(); }
    // Expose only game files and referenced originals, never internal logs/scripts.
    if (name !== '/' && name !== '/index.html' && !name.startsWith('/app/') && !name.startsWith('/Assets/')) { res.writeHead(404); return res.end('Not found'); }
    const filename = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    if (filename !== path.join(root, 'index.html') && !filename.startsWith(path.join(root, 'app') + path.sep) && !filename.startsWith(path.join(root, 'Assets') + path.sep)) { res.writeHead(403); return res.end(); }
    if (!(await stat(filename)).isFile()) { res.writeHead(404); return res.end(); }
    const fileBody = await readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : fileBody);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(`Cannot start the game on port ${port}: ${error.message}`); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log(`Exploding Kittens: http://127.0.0.1:${port}`));
