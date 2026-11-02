import fs from 'node:fs/promises';
import path from 'node:path';
export function graphApi(dataDir){
 const file=path.join(dataDir,'knowledge-graph','graph.json');
 return async (req,res,url,send)=>{
  if(url.pathname!=='/api/graph'||req.method!=='GET')return send(res,404,{error:'Not found'});
  try{return send(res,200,JSON.parse(await fs.readFile(file,'utf8')))}
  catch(e){if(e.code==='ENOENT')return send(res,200,{nodes:[],edges:[],updatedAt:null});throw e}
 };
}
