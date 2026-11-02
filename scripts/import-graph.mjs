import fs from 'node:fs/promises';
import path from 'node:path';
const input=process.argv[2];
if(!input){console.error('Usage: node scripts/import-graph.mjs export.json');process.exit(2)}
const data=JSON.parse(await fs.readFile(input,'utf8'));
if(!Array.isArray(data.nodes)||!Array.isArray(data.edges)||data.nodes.length>2000||data.edges.length>5000)throw Error('Invalid graph format or size');
const ids=new Set();
const nodes=data.nodes.map(n=>{
 if(typeof n.id!=='string'||!n.id||n.id.length>120||ids.has(n.id)||typeof n.label!=='string'||n.label.length>240)throw Error('Invalid node');
 ids.add(n.id);
 return {id:n.id,label:n.label,group:String(n.group||'Знания').slice(0,80),description:String(n.description||'').slice(0,2000)};
});
const edges=data.edges.map(e=>{
 if(!ids.has(e.source)||!ids.has(e.target))throw Error('Invalid edge');
 return {source:e.source,target:e.target,label:String(e.label||'').slice(0,100)};
});
const dest=path.resolve('data','knowledge-graph','graph.json');
await fs.mkdir(path.dirname(dest),{recursive:true});
await fs.writeFile(dest+'.tmp',JSON.stringify({nodes,edges,updatedAt:new Date().toISOString()},null,2));
await fs.rename(dest+'.tmp',dest);
console.log('Graph imported:',nodes.length,'nodes,',edges.length,'edges');
