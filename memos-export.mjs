import fs from 'node:fs/promises';
import path from 'node:path';
export async function importMemOSExport(dataDir,input){
 const raw=JSON.parse(await fs.readFile(input,'utf8'));
 const records=Array.isArray(raw)?raw:Array.isArray(raw.memories)?raw.memories:null;
 if(!records||records.length>10000)throw Error('Expected MemOS JSON export array (max 10000)');
 const file=path.join(dataDir,'knowledge-graph','graph.json');
 let graph={nodes:[],edges:[]};
 try{graph=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 if(!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error('Invalid graph');
 const ids=new Set(graph.nodes.map(n=>n.id));let added=0;
 for(let i=0;i<records.length&&graph.nodes.length<2000;i++){
  const item=records[i];
  const content=typeof item==='string'?item:typeof item?.content==='string'?item.content:typeof item?.text==='string'?item.text:null;
  if(!content||!content.trim())continue;
  const id='memos:'+String(item?.id??i).slice(0,100);
  if(ids.has(id))continue;
  graph.nodes.push({id,label:content.slice(0,120),description:content.slice(0,2000),group:'MemOS'});
  ids.add(id);added++;
 }
 graph.updatedAt=new Date().toISOString();
 await fs.mkdir(path.dirname(file),{recursive:true});
 await fs.writeFile(file+'.import',JSON.stringify(graph));
 await fs.rename(file+'.import',file);
 return {added,total:graph.nodes.length};
}
