import {db,actor,json,config,defaultRewards,now,ineligible,originOk} from '@/lib/server';
export async function POST(req:Request){try{
 if(!originOk(req))return json({error:'Solicitud no permitida.'},403);const a=await actor(req);if(!a)return json({error:'Ingresá con tu cuenta.'},401);if(await ineligible(a)||!a.email)return json({error:'Los premios son exclusivos para jugadores con correo registrado. Los colaboradores no participan.'},403);
 const b:any=await req.json(),r=(await config('rewards',defaultRewards)).find(r=>r.id===b.id&&r.enabled);if(!r)return json({error:'Premio no disponible.'},404);if(a.points<r.points)return json({error:'Todavía no alcanzaste el puntaje requerido.'},400);
 const id=r.kind==='first'?'first:'+r.id:a.id+':'+r.id;
 await db().prepare('INSERT INTO reward_claims (id,reward_id,account_id,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,r.id,a.id,now()).run();const claim=await db().prepare('SELECT account_id FROM reward_claims WHERE id=?').bind(id).first<any>();if(claim.account_id!==a.id)return json({error:'El premio único ya tiene ganador.'},409);return json({ok:true});
}catch(e){return json({error:(e as Error).message},400)}}
