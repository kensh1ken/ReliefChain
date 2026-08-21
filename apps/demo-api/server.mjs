import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PORT ?? 4000);
const now = () => new Date().toISOString();
const proof = () => ({ transactionId: randomUUID().replaceAll('-', ''), blockNumber: null, committedAt: now(), status: 'VALID', ledgerMode: 'DEMO' });
const disasterId = '10000000-0000-4000-8000-000000000001';
const cashScheme = { id:'20000000-0000-4000-8000-000000000001', disaster_id:disasterId, name:'Emergency Family Cash Assistance' };
const housingScheme = { id:'20000000-0000-4000-8000-000000000002', disaster_id:disasterId, name:'Flood Home Recovery Grant' };
const stateSource = { id:'30000000-0000-4000-8000-000000000001', disaster_id:disasterId, name:'Assam State Flood Relief Fund', source_type:'STATE_GOVERNMENT', owner_msp:'GovernmentMSP', amount_paise:1500000000, allocated_paise:750000000, proof:proof(), created_at:now() };
const ngoSource = { id:'30000000-0000-4000-8000-000000000002', disaster_id:disasterId, name:'North East Community Relief Pool', source_type:'NGO', owner_msp:'NgoMSP', amount_paise:500000000, allocated_paise:300000000, proof:proof(), created_at:now() };
const govAllocation = { id:'40000000-0000-4000-8000-000000000001', source_id:stateSource.id, scheme_id:cashScheme.id, district_code:'AS-KAM', owner_msp:'GovernmentMSP', amount_paise:750000000, reserved_paise:0, disbursed_paise:5000000, proof:proof(), created_at:now() };
const ngoAllocation = { id:'40000000-0000-4000-8000-000000000002', source_id:ngoSource.id, scheme_id:housingScheme.id, district_code:'AS-BRP', owner_msp:'NgoMSP', amount_paise:300000000, reserved_paise:0, disbursed_paise:7500000, proof:proof(), created_at:now() };
const state = {
  disasters:[{id:disasterId,name:'Assam Flood Response 2026',state_code:'AS',created_at:now()}], schemes:[cashScheme,housingScheme],
  sources:[stateSource,ngoSource], allocations:[govAllocation,ngoAllocation], beneficiaries:[], disbursements:[], events:[]
};
for(let i=0;i<6;i++) state.beneficiaries.push({id:`70000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,beneficiary_ref:`ben_${String(i+1).padStart(64,'a')}`,district_code:i<3?'AS-KAM':'AS-BRP',scheme_id:i<3?cashScheme.id:housingScheme.id,promised_paise:2500000,created_at:now()});
for(let i=0;i<6;i++){
  const settled=i!==2, allocation=i<3?govAllocation:ngoAllocation, p=proof();
  const item={id:`80000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,public_reference:`RC-2026-DEMO000${i+1}`,allocation_id:allocation.id,beneficiary_id:state.beneficiaries[i].id,amount_paise:2500000,status:settled?'SETTLED':'FAILED',bank_reference:settled?`SIMBANK-DEMO${i+1}`:null,failure_reason:settled?null:'Simulated bank rejection',proof:p,created_at:now(),updated_at:now()};
  state.disbursements.push(item);state.events.push({sequence:i+1,event_name:settled?'DisbursementSettled':'DisbursementFailed',entity_type:'disbursement',entity_id:item.id,payload:item,transaction_id:p.transactionId,block_number:null,committed_at:p.committedAt});
}

const accounts={
  'gov@reliefchain.demo':{password:'Relief@123',displayName:'Assam Relief Officer',role:'GOVERNMENT',orgMsp:'GovernmentMSP'},
  'ngo@reliefchain.demo':{password:'Relief@123',displayName:'Relief NGO Coordinator',role:'NGO',orgMsp:'NgoMSP'},
  'auditor@reliefchain.demo':{password:'Relief@123',displayName:'CAG Demo Auditor',role:'AUDITOR',orgMsp:'AuditorMSP'}
};
const tokens=new Map();
function send(res,status,data,type='application/json'){res.writeHead(status,{'Content-Type':type,'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(type==='application/json'?JSON.stringify(data):data)}
function auth(req){const token=req.headers.authorization?.replace('Bearer ','');return token?tokens.get(token):null}
async function body(req){let raw='';for await(const chunk of req)raw+=chunk;return raw?JSON.parse(raw):{}}
function event(name,type,id,payload){const p=proof();state.events.push({sequence:state.events.length+1,event_name:name,entity_type:type,entity_id:id,payload,transaction_id:p.transactionId,block_number:null,committed_at:p.committedAt});return p}
function sourceFor(id){return state.sources.find(x=>x.id===id)}

createServer(async(req,res)=>{
  if(req.method==='OPTIONS')return send(res,204,'','text/plain');
  const url=new URL(req.url??'/',`http://${req.headers.host}`),path=url.pathname;
  try{
    if(path==='/api/v1/health')return send(res,200,{status:'ok',ledgerMode:'demo',timestamp:now()});
    if(path==='/api/v1/auth/login'&&req.method==='POST'){const input=await body(req),account=accounts[String(input.email).toLowerCase()];if(!account||account.password!==input.password)return send(res,401,{message:'Invalid credentials'});const token=randomUUID();tokens.set(token,account);return send(res,200,{accessToken:token,user:{displayName:account.displayName,role:account.role,organization:account.orgMsp}})}
    if(path==='/api/v1/auth/otp/request'&&req.method==='POST')return send(res,200,{accepted:true,maskedPhone:'+91••••••••',expiresInSeconds:300});
    if(path==='/api/v1/auth/otp/verify'&&req.method==='POST'){const input=await body(req);if(input.otp!==process.env.MOCK_OTP)return send(res,401,{message:'Incorrect code'});const token=randomUUID();tokens.set(token,{role:'BENEFICIARY',beneficiaryId:state.beneficiaries[0].id});return send(res,200,{accessToken:token})}
    if(path==='/api/v1/public/summary'){const received=state.sources.reduce((n,x)=>n+x.amount_paise,0),allocated=state.allocations.reduce((n,x)=>n+x.amount_paise,0),pending=state.disbursements.filter(x=>x.status==='PENDING').reduce((n,x)=>n+x.amount_paise,0),paid=state.disbursements.filter(x=>x.status==='SETTLED').reduce((n,x)=>n+x.amount_paise,0),failed=state.disbursements.filter(x=>x.status==='FAILED').reduce((n,x)=>n+x.amount_paise,0);return send(res,200,{received_paise:received,allocated_paise:allocated,pending_paise:pending,disbursed_paise:paid,failed_paise:failed,remaining_paise:received-paid-pending,last_indexed_at:now(),source:'FABRIC_INDEX'})}
    if(path==='/api/v1/public/districts'){const rows=['AS-KAM','AS-BRP'].map(code=>{const items=state.disbursements.filter(d=>state.allocations.find(a=>a.id===d.allocation_id)?.district_code===code),a=state.allocations.find(x=>x.district_code===code),s=state.schemes.find(x=>x.id===a.scheme_id),src=sourceFor(a.source_id);return{district_code:code,scheme_name:s.name,source_type:src.source_type,beneficiary_count:items.length,disbursed_paise:items.filter(x=>x.status==='SETTLED').reduce((n,x)=>n+x.amount_paise,0),pending_paise:items.filter(x=>x.status==='PENDING').reduce((n,x)=>n+x.amount_paise,0)}});return send(res,200,rows)}
    if(path.startsWith('/api/v1/public/proof/')){const ref=decodeURIComponent(path.split('/').pop()),d=state.disbursements.find(x=>x.public_reference===ref);if(!d)return send(res,200,{found:false});const a=state.allocations.find(x=>x.id===d.allocation_id),s=state.schemes.find(x=>x.id===a.scheme_id),src=sourceFor(a.source_id);return send(res,200,{...d,district_code:a.district_code,scheme_name:s.name,source_type:src.source_type})}
    const user=auth(req);if(!user)return send(res,401,{message:'Please sign in again'});
    if(path==='/api/v1/operator/context'){const own=x=>x.owner_msp===user.orgMsp,allocations=state.allocations.filter(own);return send(res,200,{disasters:state.disasters,schemes:state.schemes,sources:state.sources.filter(own),allocations,beneficiaries:state.beneficiaries,disbursements:state.disbursements.filter(d=>allocations.some(a=>a.id===d.allocation_id))})}
    if(path==='/api/v1/operator/fund-sources'&&req.method==='POST'){const input=await body(req),id=randomUUID(),p=event('FundSourceCreated','fundSource',id,input),item={id,disaster_id:input.disasterId,name:input.name,source_type:input.sourceType,owner_msp:user.orgMsp,amount_paise:input.amountPaise,allocated_paise:0,proof:p,created_at:now()};state.sources.push(item);return send(res,201,{...item,proof:p})}
    if(path==='/api/v1/operator/allocations'&&req.method==='POST'){const input=await body(req),src=sourceFor(input.sourceId);if(!src||src.owner_msp!==user.orgMsp)return send(res,403,{message:'Fund belongs to another organization'});if(src.allocated_paise+input.amountPaise>src.amount_paise)return send(res,400,{message:'Allocation exceeds balance'});const id=randomUUID(),p=event('FundsAllocated','allocation',id,input),item={id,source_id:input.sourceId,scheme_id:input.schemeId,district_code:input.districtCode,owner_msp:user.orgMsp,amount_paise:input.amountPaise,reserved_paise:0,disbursed_paise:0,proof:p,created_at:now()};src.allocated_paise+=input.amountPaise;state.allocations.push(item);return send(res,201,item)}
    if(path==='/api/v1/operator/beneficiaries'&&req.method==='POST'){const input=await body(req),id=randomUUID(),p=event('BeneficiaryCommitted','beneficiaryCommitment',id,{districtCode:input.districtCode,schemeId:input.schemeId}),item={id,beneficiary_ref:`ben_${randomUUID().replaceAll('-','')}`,district_code:input.districtCode,scheme_id:input.schemeId,promised_paise:input.promisedPaise,proof:p,created_at:now()};state.beneficiaries.push(item);return send(res,201,item)}
    if(path==='/api/v1/operator/disbursements'&&req.method==='POST'){const input=await body(req),a=state.allocations.find(x=>x.id===input.allocationId),b=state.beneficiaries.find(x=>x.id===input.beneficiaryId);if(!a||!b||a.owner_msp!==user.orgMsp)return send(res,400,{message:'Choose an eligible allocation and beneficiary'});const id=randomUUID(),ref=`RC-2026-${randomUUID().slice(0,8).toUpperCase()}`,p=event('DisbursementInitiated','disbursement',id,{publicReference:ref,status:'PENDING'}),item={id,public_reference:ref,allocation_id:a.id,beneficiary_id:b.id,amount_paise:input.amountPaise,status:'PENDING',proof:p,created_at:now(),updated_at:now()};state.disbursements.unshift(item);a.reserved_paise+=input.amountPaise;setTimeout(()=>{a.reserved_paise-=input.amountPaise;item.status=input.simulatedOutcome;item.updated_at=now();if(item.status==='SETTLED')a.disbursed_paise+=item.amount_paise;item.proof=event(item.status==='SETTLED'?'DisbursementSettled':'DisbursementFailed','disbursement',id,{publicReference:ref,status:item.status})},1200);return send(res,201,item)}
    if(path==='/api/v1/audit/events'&&user.role==='AUDITOR')return send(res,200,[...state.events].reverse());
    if(path==='/api/v1/audit/reconciliation'&&user.role==='AUDITOR')return send(res,200,state.sources.map(src=>{const aa=state.allocations.filter(a=>a.source_id===src.id),paid=aa.reduce((n,a)=>n+a.disbursed_paise,0),pending=aa.reduce((n,a)=>n+a.reserved_paise,0);return{id:src.id,name:src.name,source_type:src.source_type,amount_paise:src.amount_paise,allocated_paise:src.allocated_paise,disbursed_paise:paid,pending_paise:pending,remaining_paise:src.amount_paise-paid-pending}}));
    if(path==='/api/v1/audit/export.csv'&&user.role==='AUDITOR'){const rows=['reference,amount_paise,status,transaction_id',...state.disbursements.map(d=>`${d.public_reference},${d.amount_paise},${d.status},${d.proof.transactionId}`)];return send(res,200,rows.join('\n'),'text/csv')}
    if(path==='/api/v1/beneficiary/me'&&user.role==='BENEFICIARY'){const b=state.beneficiaries[0],payments=state.disbursements.filter(d=>d.beneficiary_id===b.id);return send(res,200,{name:'Demo Beneficiary',districtCode:b.district_code,schemeName:cashScheme.name,promisedPaise:b.promised_paise,payments})}
    return send(res,404,{message:'Endpoint not found'});
  }catch(error){return send(res,500,{message:error instanceof Error?error.message:'Demo API error'})}
}).listen(port,'0.0.0.0',()=>console.log(`ReliefChain demo API ready at http://localhost:${port}/api/v1`));
