const http = require('http');
const fs = require('fs');
const path = require('path');
const { handler: aiForGoodHandler } = require('./netlify/functions/aiforgood.js');

const root = __dirname;
const port = process.env.PORT || 10000;
const buildId = process.env.RENDER_GIT_COMMIT || Date.now().toString();
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};

function addFreshnessHeaders(res, ext){
  if(ext === '.html' || ext === '.js' || ext === '.css') {
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
    res.setHeader('Surrogate-Control','no-store');
  } else {
    res.setHeader('Cache-Control','public, max-age=3600');
  }
  res.setHeader('X-Kampala-Hub-Build', buildId);
}

function versionHtml(html){
  return html
    .replace(/href="styles\.css(?:\?[^\"]*)?"/g, `href="styles.css?v=${buildId}"`)
    .replace(/href="responsive-fixes\.css(?:\?[^\"]*)?"/g, `href="responsive-fixes.css?v=${buildId}"`)
    .replace(/src="main\.js(?:\?[^\"]*)?"/g, `src="main.js?v=${buildId}"`)
    .replace(/src="config\.js(?:\?[^\"]*)?"/g, `src="config.js?v=${buildId}"`)
    .replace(/src="members\.js(?:\?[^\"]*)?"/g, `src="members.js?v=${buildId}"`)
    .replace(/src="feed\.js(?:\?[^\"]*)?"/g, `src="feed.js?v=${buildId}"`);
}

function sendFile(res, filePath){
  fs.readFile(filePath,(err,data)=>{
    if(err){res.statusCode=404;res.end('Not found');return;}
    const ext=path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type',mime[ext]||'application/octet-stream');
    addFreshnessHeaders(res, ext);
    if(ext === '.html') {
      res.end(versionHtml(data.toString('utf8')));
      return;
    }
    res.end(data);
  });
}

http.createServer(async (req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host}`);

  if(url.pathname === '/version') {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.end(JSON.stringify({ buildId }));
    return;
  }

  if(url.pathname==='/api/aiforgood' || url.pathname==='/.netlify/functions/aiforgood'){
    const queryStringParameters = Object.fromEntries(url.searchParams.entries());
    const out = await aiForGoodHandler({queryStringParameters});
    res.statusCode = out.statusCode || 200;
    Object.entries(out.headers||{}).forEach(([k,v])=>res.setHeader(k,v));
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Kampala-Hub-Build', buildId);
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
}).listen(port,()=>console.log(`Kampala Hub running on ${port} build ${buildId}`));
