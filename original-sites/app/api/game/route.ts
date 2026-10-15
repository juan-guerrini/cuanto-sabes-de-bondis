import {validateQuestion} from '@/lib/game';
import {db,cs,json,actor,publicActor,progress,originOk as sameOrigin,config,defaultRewards,now,rate,ineligible,password,hash,managesContent} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const isAdmin=new URL(req.url).searchParams.get('admin')==='1',user=isAdmin?await actor(req):null;if(isAdmin&&(!user||(user.role==='player'&&!user.owner)))return json({error:'Ingresá con una cuenta autorizada o tu clave de administrador.'},401);
 if(isAdmin&&user?.must_change_password===1&&user.role==='contributor')return json({error:'Primero cambiá tu contraseña inicial desde Mi cuenta.',needsSetup:true},403);
 const query=isAdmin?(managesContent(user)?db().prepare('SELECT * FROM questions'):db().prepare('SELECT * FROM questions WHERE author_email = ? OR author_email = ?').bind(user!.email||user!.id,user!.id)):db().prepare('SELECT id,country,prompt,options,difficulty,category FROM questions WHERE active = 1');
 const list=await query.all();const members=isAdmin&&user!.owner?(await db().prepare("SELECT id,username,email,name,active,role FROM accounts ORDER BY name").all()).results:[];
 const player=isAdmin?user:await actor(req);const rewards=await config('rewards',defaultRewards);
 const claims=(await db().prepare('SELECT c.*,a.name AS player_name,a.email AS player_email FROM reward_claims c JOIN accounts a ON a.id=c.account_id'+(isAdmin&&managesContent(user)?'':' WHERE c.account_id=?')).bind(...(isAdmin&&managesContent(user)?[]:[player?.id||''])).all()).results;
 const winners=(await db().prepare("SELECT reward_id,account_id FROM reward_claims WHERE id LIKE 'first:%'").all()).results.map((x:any)=>({rewardId:x.reward_id,mine:x.account_id===player?.id}));
 const recoveries=isAdmin&&managesContent(user)?(await db().prepare('SELECT r.id,r.requested,r.expires,r.used,a.name,a.username,a.email FROM recoveries r JOIN accounts a ON a.id=r.account_id WHERE r.used=0 ORDER BY r.requested DESC').all()).results:[];
 return json({countries:await cs(),questions:list.results.map((q:any)=>({...q,authorName:isAdmin?q.author_name:undefined,authorEmail:isAdmin?q.author_email:undefined,options:JSON.parse(q.options)})),user:publicActor(player),progress:await progress(player),members,rewards:isAdmin&&managesContent(user)?rewards:rewards.filter(r=>r.enabled),claims,winners,recoveries});
}catch{return json({error:'No se pudo cargar el juego. Intentá de nuevo.'},503);}}
export async function POST(req:Request){try{
 if(!sameOrigin(req))return json({error:'Solicitud no permitida.'},403);
 const body:any=await req.json();
 if(body.action==='answer'){
 if(!Number.isInteger(body.choice)||body.choice<0||body.choice>3)return json({error:'Elegí una respuesta.'},400);
 const q=await db().prepare('SELECT correct,explanation,options,country FROM questions WHERE id = ? AND active = 1').bind(body.id).first<any>();if(!q)return json({error:'La pregunta ya no está disponible.'},404);
 const user=await actor(req),correct=body.choice===q.correct;let gain=0;
 if(user&&user.id!=='owner'){
 await rate('answer:'+user.id,120,3600);const c=(await cs()).find(c=>c.id===q.country);if(!c||c.status==='comingSoon'||user.points<c.points)return json({error:'Ese destino no está disponible para tu cuenta.'},403);
 if(user.role==='contributor'&&user.must_change_password===1)return json({error:'Primero cambiá tu contraseña inicial.',needsSetup:true},403);
 const answered=await db().prepare('SELECT id FROM answers WHERE account_id=? AND question_id=?').bind(user.id,body.id).first();if(answered)return json({error:'Ya respondiste esta pregunta.',alreadyAnswered:true,progress:await progress(user)},409);
 const before=user.points;
 const awardStatements=[];if(!await ineligible(user)&&user.email){for(const r of await config('rewards',defaultRewards)){if(r.enabled&&r.kind==='first')awardStatements.push(db().prepare("INSERT INTO reward_claims (id,reward_id,account_id,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE id=? AND role='player' AND active=1 AND points>=?) ON CONFLICT(id) DO NOTHING").bind('first:'+r.id,r.id,user.id,now(),user.id,r.points));}}
 const recorded=await db().batch([
 db().prepare('INSERT INTO answers (id,account_id,question_id,correct) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id').bind(user.id+':'+body.id,user.id,body.id,correct?1:0),
 db().prepare('UPDATE accounts SET points=(SELECT COALESCE(SUM(correct),0)*10 FROM answers WHERE account_id=?),attempts=attempts+1,hits=hits+? WHERE id=? AND changes()=1').bind(user.id,correct?1:0,user.id),...awardStatements
 ]);
 if(!recorded[0].results.length)return json({error:'Ya respondiste esta pregunta.',alreadyAnswered:true,progress:await progress(user)},409);
 const after=await db().prepare('SELECT points FROM accounts WHERE id=?').bind(user.id).first<any>();gain=after.points-before;

 }
 return json({correct,index:q.correct,explanation:q.explanation,answer:JSON.parse(q.options)[q.correct],gain,progress:await progress(user)});
 }
 const user=await actor(req);if(!user||(user.role==='player'&&!user.owner))return json({error:'Necesitás una cuenta de colaborador autorizada.'},401);
 if(user.role==='contributor'&&user.must_change_password===1)return json({error:'Primero cambiá tu contraseña inicial.',needsSetup:true},403);
 if(body.action==='save'){
 const q=validateQuestion(body.question,await cs());const old=await db().prepare('SELECT author_email FROM questions WHERE id = ?').bind(q.id).first<{author_email:string}>();
 if(old&&!managesContent(user)&&old.author_email!==user.id&&old.author_email!==user.email)return json({error:'Solo podés editar tus propias preguntas.'},403);
 await db().prepare('INSERT INTO questions (id,country,prompt,options,correct,difficulty,category,explanation,active,author_email,author_name) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET country=excluded.country,prompt=excluded.prompt,options=excluded.options,correct=excluded.correct,difficulty=excluded.difficulty,category=excluded.category,explanation=excluded.explanation,active=excluded.active').bind(q.id,q.country,q.prompt,JSON.stringify(q.options),q.correct,q.difficulty,q.category,q.explanation,q.active,user.owner?user.email:user.id,user.name).run();return json({ok:true});
 }
 if(body.action==='delete'){
 if(managesContent(user))await db().prepare('DELETE FROM questions WHERE id = ?').bind(String(body.id)).run();else await db().prepare('DELETE FROM questions WHERE id = ? AND (author_email = ? OR author_email = ?)').bind(String(body.id),user.email||user.id,user.id).run();return json({ok:true});}
 if(body.action==='set-role'){
 if(!user.owner)return json({error:'Solo Juan puede asignar roles.'},403);
 if(!['player','contributor','admin'].includes(body.role))return json({error:'Rol no válido.'},400);
 const target=await db().prepare('SELECT id FROM accounts WHERE id=?').bind(String(body.id)).first<any>();if(!target)return json({error:'Usuario no encontrado.'},404);
 const ownerId=await config<string|null>('owner-account',null);if(target.id===ownerId&&body.role!=='admin')return json({error:'Tu cuenta principal debe conservar su rol de administrador.'},400);
 await db().prepare('UPDATE accounts SET role=?,must_change_password=0 WHERE id=?').bind(body.role,target.id).run();return json({ok:true});
 }
 if(body.action==='link-owner'){
 if(!user.owner)return json({error:'Solo Juan puede vincular su cuenta principal.'},403);
 const target=await db().prepare('SELECT id,email FROM accounts WHERE id=?').bind(String(body.id)).first<any>();if(!target||target.email?.toLowerCase()!==user.email?.toLowerCase())return json({error:'La cuenta debe usar tu correo de propietario.'},400);
 await db().batch([db().prepare("UPDATE accounts SET role='admin' WHERE id=?").bind(target.id),db().prepare('INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('owner-account',JSON.stringify(target.id))]);return json({ok:true});
 }
 if(body.action==='member')return json({error:'Los usuarios deben registrarse por su cuenta. Asignales el rol desde Usuarios.'},400);
 if(!managesContent(user))return json({error:'Esta acción requiere el rol de administrador.'},403);
 if(body.action==='recovery-link'){
 const token=crypto.randomUUID()+crypto.randomUUID();
 await db().prepare('UPDATE recoveries SET token=?,expires=? WHERE id=? AND used=0').bind(await hash(token),now()+3600,body.id).run();return json({ok:true,link:new URL('/cuenta?reset='+token,req.url).href});
 }
 if(body.action==='reward-settings'){
 const rows=body.rewards;
 if(!Array.isArray(rows)||rows.length<1||rows.length>100||new Set(rows.map((r:any)=>r.id)).size!==rows.length||rows.some((r:any)=>!/^[-a-z0-9]{1,60}$/.test(r.id)||!['discount','first'].includes(r.kind)||!Number.isInteger(r.points)||r.points<100||r.points>1000000||!Number.isInteger(r.percent)||r.percent<1||r.percent>100||typeof r.enabled!=='boolean'||typeof r.name!=='string'||!r.name.trim()||r.name.length>100))return json({error:'Revisá los puntajes, porcentajes y nombres de los premios.'},400);
 const previous=await config('rewards',defaultRewards);if(previous.some(r=>!rows.some((n:any)=>n.id===r.id&&n.kind===r.kind)))return json({error:'Los premios existentes deben conservarse con su tipo. Podés desactivarlos y agregar nuevos.'},400);
 await db().prepare('INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('rewards',JSON.stringify(rows)).run();return json({ok:true});
 }
 if(body.action==='fulfill'){
 const coupon=String(body.coupon||'').trim().slice(0,150);if(!coupon)return json({error:'Ingresá el cupón real de la tienda o la referencia de entrega.'},400);
 await db().prepare("UPDATE reward_claims SET coupon=?,status='ready' WHERE id=?").bind(coupon,body.id).run();return json({ok:true});
 }
 if(body.action==='countries'){
 const list=body.countries;if(!Array.isArray(list)||list.length<1||list.length>100||!list.some((c:any)=>c.points===0)||new Set(list.map((c:any)=>c.id)).size!==list.length||list.some((c:any)=>!/^[-a-z0-9]{1,40}$/.test(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||typeof c.flag!=='string'||c.flag.length>20||!Number.isInteger(c.points)||c.points<0||c.points>100000||(c.status!==undefined&&!['active','comingSoon'].includes(c.status))))return json({error:'Revisá los países. Al menos uno debe empezar en 0 puntos.'},400);
 const qs=await db().prepare('SELECT DISTINCT country FROM questions').all();if(qs.results.some((q:any)=>!list.some((c:any)=>c.id===q.country)))return json({error:'No se puede quitar un país que tiene preguntas.'},400);
 await db().prepare('INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('countries',JSON.stringify(list)).run();return json({ok:true});
 }
 return json({error:'Acción desconocida.'},400);
}catch(e){return json({error:e instanceof Error?e.message:'No se pudo guardar.'},400);}}
