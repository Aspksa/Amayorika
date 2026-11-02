import fs from 'node:fs/promises';
import path from 'node:path';
export function agents(dataDir){
 const file=path.join(dataDir,'agents','tasks.jsonl');
 let chain=Promise.resolve();
 const serial=fn=>{const result=chain.then(fn);chain=result.catch(()=>{});return result};
 async function all(){
  try{return (await fs.readFile(file,'utf8')).split('\n').filter(Boolean).map(x=>JSON.parse(x))}
  catch(e){if(e.code==='ENOENT')return [];throw e}
 }
 async function submit(type,text){
  if(!['analyze','organize','review'].includes(type)||typeof text!=='string'||!text.trim()||text.length>4000)throw Error('Invalid task');
  return serial(async()=>{
   const records=await all();
   const item={id:'task-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),type,text,createdAt:new Date().toISOString(),status:'done'};
   const tokens=[...new Set(text.toLowerCase().match(/[a-zа-яё]{5,}/gi)||[])];
   item.result=type==='analyze'?{characters:text.length,words:text.split(/\s+/).filter(Boolean).length}:type==='organize'?{keywords:tokens.slice(0,15)}:{duplicates:tokens.length===0?0:text.toLowerCase().match(/\b([a-zа-яё]{5,})\b(?=.*\b\1\b)/gi)?.length||0};
   records.push(item);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,records.map(x=>JSON.stringify(x)).join('\n')+'\n');
   return item;
  });
 }
 return {submit,all};
}
