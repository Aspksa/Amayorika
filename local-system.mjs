import fs from 'node:fs/promises';
import path from 'node:path';
export function localSystem(dataDir){
 const archive=path.join(dataDir,'chats','archive.jsonl');
 const graph=path.join(dataDir,'knowledge-graph','graph.json');
 let lock=Promise.resolve();
 const queue=fn=>{const task=lock.then(fn);lock=task.catch(()=>{});return task};
 async function readGraph(){try{return JSON.parse(await fs.readFile(graph,'utf8'))}catch(e){if(e.code==='ENOENT')return {nodes:[],edges:[]};throw e}}
 async function record(messages,reply,engine){
  const user=[...messages].reverse().find(m=>m.role==='user');
  if(!user||!reply)return;
  return queue(async()=>{
   await fs.mkdir(path.dirname(archive),{recursive:true});
   await fs.mkdir(path.dirname(graph),{recursive:true});
   const id='dialog-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
   const entry={id,at:new Date().toISOString(),engine,question:user.content,answer:reply};
   await fs.appendFile(archive,JSON.stringify(entry)+'\n');
   const g=await readGraph();
   if(g.nodes.length<2000){
    g.nodes.push({id,label:user.content.slice(0,100),group:'Диалоги',description:entry.at});
    const terms=[...new Set((user.content+' '+reply).toLowerCase().match(/[a-zа-яё]{6,}/gi)||[])].slice(0,6);
    for(const term of terms){
     const key='term-'+term;
     if(!g.nodes.some(n=>n.id===key)&&g.nodes.length<2000)g.nodes.push({id:key,label:term,group:'Темы'});
     if(g.edges.length<5000)g.edges.push({source:id,target:key,label:'упоминает'});
    }
    g.updatedAt=entry.at;
    await fs.writeFile(graph+'.tmp',JSON.stringify(g));
    await fs.rename(graph+'.tmp',graph);
   }
  });
 }
 async function recall(query){
  let content='';
  try{content=await fs.readFile(archive,'utf8')}catch(e){if(e.code!=='ENOENT')throw e}
  const words=(query.toLowerCase().match(/[a-zа-яё]{5,}/gi)||[]).slice(0,12);
  return content.split('\n').filter(Boolean).slice(-500).map(line=>{try{return JSON.parse(line)}catch{return null}}).filter(Boolean).map(item=>({item,score:words.filter(w=>(item.question+' '+item.answer).toLowerCase().includes(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>({question:x.item.question.slice(0,350),answer:x.item.answer.slice(0,450)}));
 }
 async function status(){
  let count=0;try{count=(await fs.readFile(archive,'utf8')).split('\n').filter(Boolean).length}catch(e){if(e.code!=='ENOENT')throw e}
  const g=await readGraph();return {chats:count,nodes:g.nodes.length,edges:g.edges.length,local:true};
 }
 return {record,recall,status};
}
