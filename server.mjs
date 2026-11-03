import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {configured as tfConfigured,improve as tfImprove,ROOT} from './scripts/trueforge.mjs';
import {validatePolicy,validateEpisode,replayEpisode,EPISODE_LIMITS} from './dist/engine.mjs';
const HOST='127.0.0.1',dist=resolve(ROOT,'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json'};
const json=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
// `improve` and `configured` are injectable so tests can drive /api/learn with a controlled adapter.
export function createServer({improve=tfImprove,configured=tfConfigured}={}){
 let busy=false;
 const server=http.createServer(async(req,res)=>{
  try{
   const port=server.address().port,local=[`${HOST}:${port}`,`localhost:${port}`];
   const url=new URL(req.url,`http://${HOST}:${port}`);
   if(!local.includes(req.headers.host))return json(res,403,{error:'Local host only.'});
   if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{configured:configured(),mode:configured()?'trueforge':'local'});
   if(url.pathname==='/api/learn'&&req.method==='POST'){
    const origin=req.headers.origin;if(origin&&!local.map(h=>'http://'+h).includes(origin))return json(res,403,{error:'Same-origin requests only.'});
    if(!configured())return json(res,503,{error:'TrueForge is not configured.'});
    if(busy)return json(res,409,{error:'A learning session is already running.'});
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>EPISODE_LIMITS.maxBytes)return json(res,413,{error:'Trace too large.'});chunks.push(chunk);}
    let policy,episode;
    try{const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));policy=validatePolicy(payload.policy);episode=replayEpisode(policy,validateEpisode(payload.episode));}
    catch(e){return json(res,400,{error:e.message});}
    busy=true;try{const output=await improve(episode,policy);json(res,200,{policy:output.policy,sessionId:output.sessionId,status:'candidate'});}finally{busy=false;}return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
   const target=resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(!target.startsWith(dist+'/'))return json(res,403,{error:'Forbidden.'});
   const file=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:file);
  }catch(e){if(!res.headersSent)json(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found.':'Request failed. See the local terminal.'});console.error(e.message);}
 });
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const PORT=Number(process.env.PORT||4173);createServer().listen(PORT,HOST,()=>console.log(`ROB ME AGAIN · http://${HOST}:${PORT}`));}
