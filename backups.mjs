import fs from 'node:fs/promises';
import path from 'node:path';
const included=['chats/archive.jsonl','knowledge-graph/graph.json','agents/tasks.jsonl'];
export function backups(dataDir){
 const root=path.join(dataDir,'backups');
 async function create(){
  const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+Math.random().toString(36).slice(2,7);
  const folder=path.join(root,id);await fs.mkdir(folder,{recursive:true});
  const files=[];
  for(const rel of included){
   try{const destination=path.join(folder,rel);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(path.join(dataDir,rel),destination);files.push(rel)}
   catch(e){if(e.code!=='ENOENT')throw e}
  }
  await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify({id,createdAt:new Date().toISOString(),files}));
  return {id,files};
 }
 async function list(){
  try{return (await fs.readdir(root,{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name).sort().reverse().slice(0,100)}
  catch(e){if(e.code==='ENOENT')return [];throw e}
 }
 async function restore(id){
  if(typeof id!=='string'||!/^\d{4}-[\w-]{15,80}$/.test(id))throw Error('Invalid backup id');
  const folder=path.join(root,id);
  const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
  if(manifest.id!==id||!Array.isArray(manifest.files)||manifest.files.some(x=>!included.includes(x)))throw Error('Invalid manifest');
  for(const rel of manifest.files){await fs.access(path.join(folder,rel))}
  const safety=await create();
  for(const rel of manifest.files){
   const target=path.join(dataDir,rel);await fs.mkdir(path.dirname(target),{recursive:true});
   await fs.copyFile(path.join(folder,rel),target+'.restore');
   await fs.rename(target+'.restore',target);
  }
  return {restored:id,safetyBackup:safety.id};
 }
 return {create,list,restore};
}
