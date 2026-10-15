import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'bondis-http-')),origin='http://127.0.0.1:3188',key='portable-test-key-0000000000000000';let cookie='';
const child=spawn(process.execPath,['scripts/start.mjs'],{env:{...process.env,ADMIN_KEY:key,PUBLIC_ORIGIN:origin,OWNER_EMAIL:'owner@example.com',DATABASE_PATH:join(dir,'db.sqlite'),COOKIE_SECURE:'false',PORT:'3188'},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
async function post(path,body,admin=false){return fetch(origin+path,{method:'POST',headers:{'content-type':'application/json',origin,cookie,...(admin?{'x-admin-key':key}:{})},body:JSON.stringify(body)})}
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready,logs);
 let r=await post('/api/account',{action:'register',name:'Prueba',username:'prueba',email:'owner@example.com',password:'testing-password'});assert.equal(r.status,200,await r.clone().text());cookie=r.headers.get('set-cookie').split(';')[0];
 let d=await(await fetch(origin+'/api/account',{headers:{cookie}})).json();assert.equal(d.user.role,'player');const id=d.user.id;
 r=await post('/api/game',{action:'link-owner',id},true);assert.equal(r.status,200,await r.clone().text());
 r=await post('/api/game',{action:'save',question:{id:'qa',country:'ar',prompt:'Pregunta de prueba',options:['A','B','C','D'],correct:1,difficulty:'Fácil'}},true);assert.equal(r.status,200,await r.clone().text());
 r=await post('/api/game',{action:'answer',id:'qa',choice:1});assert.equal(r.status,200,await r.clone().text());d=await r.json();assert.equal(d.progress.points,10);
 r=await post('/api/game',{action:'answer',id:'qa',choice:1});assert.equal(r.status,409);
 d=await(await fetch(origin+'/api/game')).json();assert.equal(d.questions[0].authorName,undefined);
 await post('/api/account',{action:'logout'});cookie='';r=await post('/api/account',{action:'login',username:'prueba',password:'testing-password'});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];d=await(await fetch(origin+'/api/account',{headers:{cookie}})).json();assert.equal(d.progress.points,10);
 console.log('HTTP real correcto: salud, registro, sesiones, propietario, preguntas, puntuación persistente y no repetición.');
}catch(e){console.error(logs);throw e}finally{child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));rmSync(dir,{recursive:true,force:true})}
