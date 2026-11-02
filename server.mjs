import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=path.join(root,'data');
const configPath=path.join(dataDir,'cloudru-settings.json');
const port=Number(process.env.PORT||57474);
const host='127.0.0.1';
const readJson=async p=>{try{return JSON.parse(await fs.readFile(p,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>1000000)throw Error('Request too large')}return JSON.parse(s||'{}')}
const safeConfig=c=>({endpoint:c.endpoint||'',model:c.model||'',hasKey:!!c.apiKey});
const validEndpoint=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
async function api(req,res,url){
 if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{ok:true,version:'0.1.0'});
 if(req.method==='GET'&&url.pathname==='/api/settings')return send(res,200,safeConfig(await readJson(configPath)));
 if(req.method==='POST'&&url.pathname==='/api/settings'){
  const b=await body(req),old=await readJson(configPath);
  const endpoint=String(b.endpoint??old.endpoint??'').trim(),model=String(b.model??old.model??'').trim();
  if(endpoint&&!validEndpoint(endpoint))return send(res,400,{error:'HTTPS endpoint required'});
  if(model.length>200)return send(res,400,{error:'Model name too long'});
  const apiKey=typeof b.apiKey==='string'&&b.apiKey.trim()?b.apiKey.trim():old.apiKey||'';
  await fs.mkdir(dataDir,{recursive:true});
  await fs.writeFile(configPath,JSON.stringify({endpoint,model,apiKey},null,2),{mode:0o600});
  return send(res,200,safeConfig({endpoint,model,apiKey}));
 }
 if(req.method==='POST'&&(url.pathname==='/api/chat'||url.pathname==='/api/test-connection')){
  const c=await readJson(configPath);
  if(!c.endpoint||!c.model||!c.apiKey)return send(res,400,{error:'Configure endpoint, model and API key first'});
  if(!validEndpoint(c.endpoint))return send(res,400,{error:'Invalid endpoint'});
  const b=url.pathname==='/api/chat'?await body(req):{};
  const messages=url.pathname==='/api/chat'?b.messages:[{role:'user',content:'Ответь одним словом: готово'}];
  if(!Array.isArray(messages)||messages.length>40||!messages.every(m=>['user','assistant','system'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=12000))return send(res,400,{error:'Invalid messages'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
   const r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.apiKey},body:JSON.stringify({model:c.model,messages,stream:false}),signal:controller.signal});
   const result=await r.json().catch(()=>({}));
   if(!r.ok)return send(res,502,{error:'Provider returned HTTP '+r.status,detail:JSON.stringify(result).slice(0,400)});
   return send(res,200,{reply:result.choices?.[0]?.message?.content||'',model:result.model||c.model});
  }finally{clearTimeout(timer)}
 }
 return send(res,404,{error:'Not found'});
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/'))return await api(req,res,url);
  if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
  const file=({ '/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'})[url.pathname];
  if(!file)return send(res,404,{error:'Not found'});
  const content=await fs.readFile(path.join(root,'public',file));
  res.writeHead(200,{'Content-Type':mime[path.extname(file)],'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(content);
 }catch(e){console.error(new Date().toISOString(),e.message);send(res,500,{error:'Internal server error'})}
});
server.listen(port,host,()=>console.log('Amayorika ready: http://'+host+':'+port));
