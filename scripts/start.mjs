import {spawn} from 'node:child_process';
import {existsSync,cpSync,mkdirSync} from 'node:fs';
import {getDatabase} from '../server/database.mjs';
if(!process.env.ADMIN_KEY||process.env.ADMIN_KEY.length<24)throw Error('Configurá ADMIN_KEY con al menos 24 caracteres aleatorios en Coolify.');
if(!process.env.OWNER_EMAIL)throw Error('Configurá OWNER_EMAIL con tu correo.');
if(!process.env.PUBLIC_ORIGIN)throw Error('Configurá PUBLIC_ORIGIN con la dirección pública del juego.');
new URL(process.env.PUBLIC_ORIGIN);
getDatabase().close();let entry='./server.js';
if(!existsSync(entry)){
 entry='./.next/standalone/server.js';if(!existsSync(entry))throw Error('Primero ejecutá pnpm build.');
 mkdirSync('.next/standalone/.next',{recursive:true});
 for(const [from,to] of [['.next/static','.next/standalone/.next/static'],['public','.next/standalone/public'],['drizzle','.next/standalone/drizzle']])cpSync(from,to,{recursive:true});
}
const child=spawn(process.execPath,[entry],{stdio:'inherit',env:{...process.env,HOSTNAME:'0.0.0.0'}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code??1));
