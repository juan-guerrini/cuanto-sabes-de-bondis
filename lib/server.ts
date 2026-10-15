import {env} from '@/lib/runtime';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {countries,type Country} from '@/lib/game';
export const db=()=>{if(!env.DB)throw Error('Base de datos no disponible.');return env.DB};
export const now=()=>Math.floor(Date.now()/1000);
export const json=(v:any,status=200,headers:any={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function hash(value:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
function bytes(hex:string){return Uint8Array.from(hex.match(/../g)||[],v=>parseInt(v,16))}
export async function password(value:string,encoded?:string){const salt=encoded?encoded.split(':')[0]:crypto.randomUUID().replaceAll('-','');const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations:100000,hash:'SHA-256'},k,256);const h=Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');return `${salt}:${h}`;}
export function equal(a:string,b:string){if(!a||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
export async function rate(key:string,limit:number,seconds:number){const bucket=Math.floor(now()/seconds);await db().prepare('INSERT INTO throttles (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1').bind(key+':'+bucket,now()+seconds).run();const r=await db().prepare('SELECT count FROM throttles WHERE id = ?').bind(key+':'+bucket).first<any>();if(r.count>limit)throw Error('Demasiados intentos. Volvé a intentar más tarde.');if(Math.random()<.02)await db().prepare('DELETE FROM throttles WHERE expires < ?').bind(now()).run()}
export async function config<T>(id:string,fallback:T):Promise<T>{const r=await db().prepare('SELECT value FROM settings WHERE id = ?').bind(id).first<any>();return r?JSON.parse(r.value):fallback}
export const cs=()=>config<Country[]>('countries',countries);
export const defaultRewards=[{id:'maquetas',name:'Descuento en maquetas',kind:'discount',points:5000,percent:10,enabled:false},{id:'llaveros',name:'Descuento en llaveros',kind:'discount',points:10000,percent:15,enabled:false},{id:'bondi3d',name:'Una maqueta 3D gratis',kind:'first',points:50000,percent:100,enabled:false}];
export type Actor={id:string;email:string|null;name:string;username:string;owner:boolean;role:string;points:number;attempts:number;hits:number;must_change_password?:number};
export async function actor(req:Request):Promise<Actor|null>{
 const ownerEmail=String((env as any).OWNER_EMAIL||'').toLowerCase();
 if(equal(req.headers.get('x-admin-key')||'',String((env as any).ADMIN_KEY||'')))return {id:'owner',email:ownerEmail,name:'Juan',username:'Juan',owner:true,role:'owner',points:0,attempts:0,hits:0};
 const cookies=req.headers.get('cookie')||'',m=cookies.match(/(?:^|;\s*)bondis_session=([^;]+)/);
 if(m){const a=await db().prepare('SELECT a.* FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token = ? AND s.expires > ? AND a.active=1').bind(await hash(m[1]),now()).first<any>();if(a){const ownerId=await config<string|null>('owner-account',null);return {...a,owner:a.id===ownerId};}}
 const u=await getChatGPTUser();if(u&&ownerEmail&&u.email.toLowerCase()===ownerEmail)return {id:'owner',email:ownerEmail,name:'Juan',username:'Juan',owner:true,role:'owner',points:0,attempts:0,hits:0};return null;
}
export async function progress(a:Actor|null){if(!a)return null;const r=await db().prepare('SELECT question_id,correct FROM answers WHERE account_id = ?').bind(a.id).all();const fresh=a.id==='owner'?a:await db().prepare('SELECT points,attempts,hits FROM accounts WHERE id = ?').bind(a.id).first<any>();return {points:fresh.points,attempts:fresh.attempts,hits:fresh.hits,seen:r.results.map((x:any)=>x.question_id),won:r.results.filter((x:any)=>x.correct===1).map((x:any)=>x.question_id)}}
export function publicActor(a:Actor|null){return a?{id:a.id,name:a.name,username:a.username,email:a.email,role:a.role,owner:a.owner,mustChangePassword:a.role==='contributor'&&a.must_change_password===1}:null}
export async function issueSession(accountId:string){const token=crypto.randomUUID()+crypto.randomUUID();await db().prepare('INSERT INTO sessions (token,account_id,expires) VALUES (?,?,?)').bind(await hash(token),accountId,now()+30*86400).run();return {'Set-Cookie':`bondis_session=${token}; HttpOnly; ${process.env.COOKIE_SECURE==='false'?'':'Secure; '}SameSite=Lax; Path=/; Max-Age=2592000`}}
export const originOk=(r:Request)=>r.headers.get('origin')===new URL(process.env.PUBLIC_ORIGIN||r.url).origin;
export async function ineligible(a:Actor){if(a.role!=='player')return true;if(a.email){const r=await db().prepare('SELECT email FROM contributors WHERE lower(email)=?').bind(a.email.toLowerCase()).first();if(r)return true;}return false}

export function managesContent(a:Actor|null){return !!a&&(a.owner||a.role==='admin');}
