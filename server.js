const http = require('http');
const fs = require('fs');
const path = require('path');
const { handler: aiForGoodHandler } = require('./netlify/functions/aiforgood.js');

const root = __dirname;
const port = process.env.PORT || 10000;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};

function sendFile(res, filePath){
  fs.readFile(filePath,(err,data)=>{
    if(err){res.statusCode=404;res.end('Not found');return;}
    const ext=path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type',mime[ext]||'application/octet-stream');
    res.end(data);
  });
}

http.createServer(async (req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host}`);
  if(url.pathname==='/api/aiforgood' || url.pathname==='/.netlify/functions/aiforgood'){
    const queryStringParameters = Object.fromEntries(url.searchParams.entries());
    const out = await aiForGoodHandler({queryStringParameters});
    res.statusCode = out.statusCode || 200;
    Object.entries(out.headers||{}).forEach(([k,v])=>res.setHeader(k,v));
    res.end(out.body||'');
    return;
  }
  let requested = decodeURIComponent(url.pathname);
  if(requested==='/' ) requested='/index.html';
  const normalized = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(root, normalized);
  if(!filePath.startsWith(root)){res.statusCode=403;res.end('Forbidden');return;}
  fs.stat(filePath,(err,stat)=>{
    if(!err && stat.isFile()) return sendFile(res,filePath);
    if(!path.extname(filePath)) return sendFile(res,filePath+'.html');
    res.statusCode=404;res.end('Not found');
  });
}).listen(port,()=>console.log(`Kampala Hub running on ${port}`));
