import {db,now,json,password,equal,hash,rate,actor,publicActor,progress,issueSession,originOk} from '@/lib/server';
export const dynamic='force-dynamic';
const username=(v:any)=>String(v||'').trim().toLowerCase();
const validEmail=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
export async function GET(req:Request){try{const a=await actor(req);return json({user:publicActor(a),progress:await progress(a)})}catch{return json({error:'No se pudo cargar tu cuenta.'},503)}}
export async function POST(req:Request){try{
 if(!originOk(req))return json({error:'Solicitud no permitida.'},403);const b:any=await req.json();const ip=req.headers.get('cf-connecting-ip')||'unknown';
 if(b.action==='logout'){const token=(req.headers.get('cookie')||'').match(/(?:^|;\s*)bondis_session=([^;]+)/)?.[1];if(token)await db().prepare('DELETE FROM sessions WHERE token = ?').bind(await hash(token)).run();return json({ok:true},200,{'Set-Cookie':`bondis_session=; HttpOnly; ${process.env.COOKIE_SECURE==='false'?'':'Secure; '}SameSite=Lax; Path=/; Max-Age=0`})}
 if(b.action==='register'){
 await rate('register:'+ip,10,3600);const u=username(b.username),email=String(b.email||'').trim().toLowerCase(),name=String(b.name||'').trim(),pw=String(b.password||'');
 if(!/^[a-z0-9][a-z0-9 _.-]{2,39}$/.test(u)||!validEmail(email)||!name||name.length>80||pw.length<8||pw.length>128)return json({error:'Completá nombre, usuario (3–40 caracteres), correo y contraseña de al menos 8 caracteres.'},400);
 if(await db().prepare('SELECT id FROM accounts WHERE username = ? OR email = ?').bind(u,email).first())return json({error:'Ese usuario o correo ya está registrado.'},409);
 const id=crypto.randomUUID();await db().prepare('INSERT INTO accounts (id,username,name,email,password,role,created_at,must_change_password) VALUES (?,?,?,?,?,?,?,0)').bind(id,u,name,email,await password(pw),'player',now()).run();return json({ok:true},200,await issueSession(id));
 }
 if(b.action==='login'){
 await rate('login:'+ip,25,900);const u=username(b.username);await rate('login-user:'+u,12,900);const a=await db().prepare('SELECT * FROM accounts WHERE username = ? AND active = 1').bind(u).first<any>();const pw=String(b.password||'');
 if(pw.length>128||!a||!equal(await password(pw,a.password),a.password))return json({error:'Usuario o contraseña incorrectos.'},401);return json({ok:true},200,await issueSession(a.id));
 }
 if(b.action==='recover'){
 await rate('recover:'+ip,5,3600);const email=String(b.email||'').trim().toLowerCase();const a=await db().prepare('SELECT id FROM accounts WHERE email = ? AND active = 1').bind(email).first<any>();if(a){const pending=await db().prepare('SELECT id FROM recoveries WHERE account_id=? AND used=0 AND requested > ?').bind(a.id,now()-86400).first();if(!pending)await db().prepare('INSERT INTO recoveries (id,account_id,requested) VALUES (?,?,?)').bind(crypto.randomUUID(),a.id,now()).run();}
 return json({ok:true,message:'Si el correo está registrado, Juan podrá revisar tu solicitud y enviarte un enlace de recuperación. El envío se gestiona manualmente.'});
 }
 if(b.action==='reset'){
 await rate('reset:'+ip,15,3600);const token=String(b.token||''),pw=String(b.password||'');if(pw.length<8||pw.length>128)return json({error:'La nueva contraseña debe tener entre 8 y 128 caracteres.'},400);
 const digest=await hash(token);const old=await db().prepare('SELECT a.password FROM accounts a JOIN recoveries r ON r.account_id=a.id WHERE r.token=? AND r.expires>? AND r.used=0').bind(digest,now()).first<any>();if(old&&equal(await password(pw,old.password),old.password))return json({error:'Elegí una contraseña diferente de la anterior.'},400);
 const encoded=await password(pw);const rows=await db().batch([
 db().prepare('UPDATE accounts SET password=?,must_change_password=0 WHERE id=(SELECT account_id FROM recoveries WHERE token=? AND expires>? AND used=0) RETURNING id').bind(encoded,digest,now()),
 db().prepare('DELETE FROM sessions WHERE account_id=(SELECT account_id FROM recoveries WHERE token=? AND expires>? AND used=0)').bind(digest,now()),
 db().prepare('UPDATE recoveries SET used=1 WHERE token=? AND expires>? AND used=0').bind(digest,now())
 ]);if(!rows[0].results.length)return json({error:'El enlace venció o ya fue usado.'},400);
 return json({ok:true,message:'Contraseña actualizada. Ya podés ingresar.'});
 }
 const a=await actor(req);if(!a||a.owner)return json({error:'Ingresá con tu cuenta.'},401);
 if(b.action==='credentials'){
 const row=await db().prepare('SELECT password FROM accounts WHERE id=? AND active=1').bind(a.id).first<any>();if(!row)return json({error:'Cuenta no disponible.'},401);
 const pw=String(b.newPassword||''),u=username(b.newUsername||a.username);
 if(pw.length<8||pw.length>128||!/^[a-z0-9][a-z0-9 _.-]{2,39}$/.test(u))return json({error:'La contraseña debe tener 8–128 caracteres y el usuario 3–40 caracteres.'},400);
 if(!a.must_change_password&&!equal(await password(String(b.currentPassword||''),row.password),row.password))return json({error:'La contraseña actual es incorrecta.'},400);
 if(equal(await password(pw,row.password),row.password))return json({error:'Elegí una contraseña diferente de la actual.'},400);
 if(await db().prepare('SELECT id FROM accounts WHERE username=? AND id<>?').bind(u,a.id).first())return json({error:'Ese nombre de usuario ya está ocupado.'},409);
 await db().batch([db().prepare('UPDATE accounts SET username=?,password=?,must_change_password=0 WHERE id=?').bind(u,await password(pw),a.id),db().prepare('DELETE FROM sessions WHERE account_id=?').bind(a.id)]);
 return json({ok:true,message:'Usuario y contraseña guardados. Tu nombre de autor no cambió.'},200,await issueSession(a.id));
 }
 if(a.role==='contributor'&&a.must_change_password===1)return json({error:'Primero cambiá tu contraseña inicial.',needsSetup:true},403);
 if(b.action==='profile'){
 const email=String(b.email||'').trim().toLowerCase();if(!validEmail(email))return json({error:'Ingresá un correo válido.'},400);
 // Once attached, recovery email is changed only by the owner after verification.
 if(a.email&&a.email!==email)return json({error:'Para cambiar el correo de recuperación, contactá a Juan.'},400);
 if(await db().prepare('SELECT id FROM accounts WHERE email=? AND id<>?').bind(email,a.id).first())return json({error:'Ese correo ya está registrado.'},409);
 await db().prepare('UPDATE accounts SET email=? WHERE id=?').bind(email,a.id).run();return json({ok:true});
 }
 return json({error:'Acción desconocida.'},400);
}catch(e){return json({error:(e as Error).message||'No se pudo completar la operación.'},400)}}
