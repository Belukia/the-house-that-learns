import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {configured,improve,ROOT} from './scripts/trueforge.mjs';
import {validatePolicy} from './dist/engine.mjs';
const PORT=Number(process.env.PORT||4173),HOST='127.0.0.1',dist=resolve(ROOT,'dist');let busy=false;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json'};
const json=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://${HOST}:${PORT}`);
  if(req.headers.host!==`${HOST}:${PORT}`&&req.headers.host!==`localhost:${PORT}`)return json(res,403,{error:'Local host only.'});
  if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{configured:configured(),mode:configured()?'trueforge':'local'});
  if(url.pathname==='/api/learn'&&req.method==='POST'){
   const origin=req.headers.origin;if(origin&&![`http://${HOST}:${PORT}`,`http://localhost:${PORT}`].includes(origin))return json(res,403,{error:'Same-origin requests only.'});
   if(!configured())return json(res,503,{error:'TrueForge is not configured.'});
   if(busy)return json(res,409,{error:'A learning session is already running.'});
   let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)return json(res,413,{error:'Trace too large.'});}
   const payload=JSON.parse(body),policy=validatePolicy(payload.policy),ep=payload.episode;
   if(!ep||!['escaped','caught','abandoned'].includes(ep.outcome)||!Array.isArray(ep.actions)||ep.actions.length>100||!Array.isArray(ep.route)||ep.route.length>100)return json(res,400,{error:'A completed game trace is required.'});
   busy=true;try{const output=await improve(ep,policy);json(res,200,{policy:output.policy,sessionId:output.sessionId});}finally{busy=false;}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
  const target=resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!target.startsWith(dist+'/'))return json(res,403,{error:'Forbidden.'});
  const file=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:file);
 }catch(e){if(!res.headersSent)json(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found.':'Request failed. See the local terminal.'});console.error(e.message);}
});
server.listen(PORT,HOST,()=>console.log(`The House That Learns · http://${HOST}:${PORT}`));
