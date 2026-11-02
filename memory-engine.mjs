import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export function memoryEngine(dataDir){
 const archive=path.join(dataDir,'chats','archive.jsonl');
 const graphFile=path.join(dataDir,'knowledge-graph','graph.json');
 let chain=Promise.resolve();
 const serial=fn=>{const next=chain.then(fn);chain=next.catch(()=>{});return next};
 async function readGraph(){try{return JSON.parse(await fs.readFile(graphFile,'utf8'))}catch(e){if(e.code==='ENOENT')return {nodes:[],edges:[]};throw e}}
 async function save(messages,answer,engine){
  const question=[...messages].reverse().find(m=>m.role==='user')?.content;
  if(!question||typeof answer!=='string'||!answer.trim())return {saved:false};
  return serial(async()=>{
   const entry={id:randomUUID(),timestamp:new Date().toISOString(),engine,question,answer};
   await fs.mkdir(path.dirname(archive),{recursive:true});
   await fs.appendFile(archive,JSON.stringify(entry)+'\n','utf8');
   try{
    await fs.mkdir(path.dirname(graphFile),{recursive:true});
    const graph=await readGraph();
    if(!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error('Invalid graph');
    if(graph.nodes.length<2000){
     const nodeId='chat:'+entry.id;
     graph.nodes.push({id:nodeId,label:question.slice(0,120),group:'Диалоги',description:entry.timestamp});
     const terms=[...new Set((question+' '+answer).toLocaleLowerCase('ru').match(/[a-zа-яё]{6,}/gi)||[])].slice(0,8);
     const existing=new Set(graph.nodes.map(n=>n.id));
     for(const term of terms){
      const id='term:'+term;
      if(!existing.has(id)&&graph.nodes.length<2000){graph.nodes.push({id,label:term,group:'Темы'});existing.add(id)}
      if(existing.has(id)&&graph.edges.length<5000)graph.edges.push({source:nodeId,target:id,label:'упоминает'});
     }
     graph.updatedAt=entry.timestamp;
     const tmp=graphFile+'.'+entry.id+'.tmp';
     await fs.writeFile(tmp,JSON.stringify(graph),'utf8');
     await fs.rename(tmp,graphFile);
    }
   }catch(error){return {saved:true,graphUpdated:false,error:error.message}}
   return {saved:true,graphUpdated:true};
  });
 }
 async function recall(query){
  if(typeof query!=='string'||!query.trim())return [];
  let content='';try{content=await fs.readFile(archive,'utf8')}catch(e){if(e.code!=='ENOENT')throw e}
  const terms=[...new Set(query.toLocaleLowerCase('ru').match(/[a-zа-яё]{5,}/gi)||[])].slice(0,15);
  return content.split('\n').filter(Boolean).slice(-600).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}}).map(item=>({item,score:terms.filter(t=>(item.question+' '+item.answer).toLocaleLowerCase('ru').includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>({question:x.item.question.slice(0,300),answer:x.item.answer.slice(0,500)}));
 }
 async function status(){let chats=0;try{chats=(await fs.readFile(archive,'utf8')).split('\n').filter(Boolean).length}catch(e){if(e.code!=='ENOENT')throw e}const g=await readGraph();return {chats,nodes:g.nodes.length,edges:g.edges.length,local:true}}
 return {save,recall,status};
}
