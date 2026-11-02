import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {memoryEngine} from '../memory-engine.mjs';
import {backups} from '../backups.mjs';
import {agents} from '../agents-local.mjs';
test('local chat archive, graph and recall',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'amayorika-'));
 try{
  const memory=memoryEngine(dir);
  await memory.save([{role:'user',content:'Расскажи про архитектуру'}],'Архитектура важна','cloud');
  const s=await memory.status();
  assert.equal(s.chats,1);assert.ok(s.nodes>0);assert.ok(s.edges>0);
  assert.ok((await memory.recall('архитектуру')).length>0);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('backup and restore protect original data',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'amayorika-'));
 try{
  const file=path.join(dir,'chats','archive.jsonl');await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.writeFile(file,'original\n');
  const service=backups(dir),saved=await service.create();
  await fs.writeFile(file,'changed\n');
  const restored=await service.restore(saved.id);
  assert.equal(await fs.readFile(file,'utf8'),'original\n');
  assert.ok(restored.safetyBackup);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('agents execute and persist bounded tasks',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'amayorika-'));
 try{
  const a=agents(dir),result=await a.submit('analyze','один два три');
  assert.equal(result.status,'done');assert.equal(result.result.words,3);
  assert.equal((await a.all()).length,1);
  await assert.rejects(()=>a.submit('shell','whoami'));
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
