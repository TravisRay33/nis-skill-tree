/* NIS Skill Tree: data layer and sign-in.
   DemoAPI keeps everything in the browser (sample data). LiveAPI talks to Supabase.
   Both expose the same actions, so the screens in app.js don't care which one is running. */
const CFG = window.NIS_CONFIG || {mode:"demo"};
const LIVE = CFG.mode === "live";
const sb = LIVE && window.supabase && CFG.supabaseUrl && CFG.supabaseAnonKey
  ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;

/* ============ DEMO (in-browser) ============ */
const DemoAPI = {
  async loadAll(){},
  async signOut(){},
  async requestSignoff(sid){ const u=me();
    if(has(u.id,sid)) throw new Error("You already hold this skill.");
    if(pendingReq(u.id,sid)) throw new Error("You already requested this sign-off.");
    S.requests.push({id:reqSeq++,pid:u.id,sid,status:"requested",date:nowISO(),reviewer:null,note:""});
    addLog(`${u.name} requested sign-off: ${SKILLS[sid].name}`); },
  async withdraw(id){ const r=S.requests.find(x=>x.id===id); if(r) r.status="withdrawn"; },
  async review(id,approve,note){ const u=me(), r=S.requests.find(x=>x.id===id);
    if(!r||r.status!=="requested") throw new Error("That request was already handled.");
    Object.assign(r,{reviewer:u.id,note,status:approve?"approved":"returned"});
    if(approve) certify(r.pid,r.sid,u.id,"approval");
    addLog(`${u.name} ${approve?"approved":"returned"} ${person(r.pid).name}: ${SKILLS[r.sid].name}`); },
  async grant(pid,sid){ const u=me(); if(has(pid,sid)) return; certify(pid,sid,u.id,"override");
    const r=pendingReq(pid,sid); if(r) Object.assign(r,{status:"approved",reviewer:u.id,note:"Granted by admin"});
    addLog(`Override: ${u.name} granted ${person(pid).name} ${SKILLS[sid].name}`); },
  async revoke(pid,sid){ const u=me(); revoke(pid,sid,u.id); addLog(`Override: ${u.name} removed ${SKILLS[sid].name} from ${person(pid).name}`); },
  async grantTier(pid,area,tier){ const u=me(), T=AREAS[area].tiers[tier];
    [...live(T.req),...live(T.el),T.cap].forEach(s=>{ if(!has(pid,s)) grant(pid,s,u.id,"override",nowISO()); });
    addLog(`Override: ${u.name} granted ${person(pid).name} all of ${AREAS[area].name} ${TIER_NAME[tier]}`); },
  async setInterest(sid,on){ const k=key(me().id,sid); on?S.interests.add(k):S.interests.delete(k); },
  async addSkill(area,tier,kind){ const a=AREAS[area], id=newId(area+"-"+tier);
    SKILLS[id]={id,area,tier,kind,name:"New "+(kind==="req"?"required":"elective")+" skill",desc:"Describe what this skill covers.",steps:["Read the NIS procedure","Watch a certified holder do it","Do it with a holder watching","Request sign-off"],time:"About 1 hr"};
    a.tiers[tier][kind].push(id); addLog(`${me().name} added a ${TIER_NAME[tier]} skill in ${a.name}`); return id; },
  async saveSkill(sid,f){ const sk=SKILLS[sid], old=sk.name; Object.assign(sk,{name:f.name,desc:f.desc,steps:f.steps,time:f.time});
    if(sk.kind!=="cap" && (f.kind!==sk.kind||f.tier!==sk.tier)){ const T=AREAS[sk.area].tiers; T[sk.tier][sk.kind]=T[sk.tier][sk.kind].filter(x=>x!==sid); T[f.tier][f.kind].push(sid); sk.kind=f.kind; sk.tier=f.tier; }
    addLog(old!==sk.name?`${me().name} renamed "${old}" to "${sk.name}"`:`${me().name} edited "${sk.name}"`); },
  async setRetired(sid,on){ const sk=SKILLS[sid]; sk.retired=on;
    if(on) S.requests.forEach(r=>{ if(r.sid===sid&&r.status==="requested") Object.assign(r,{status:"returned",note:"Skill retired",reviewer:me().id}); });
    addLog(`${me().name} ${on?"retired":"restored"} "${sk.name}"`); },
  async saveArea(id,name,lead){
    if(!id){ id=newId("area"); AREAS[id]={id,name:name||"New area",lead,tiers:{},rules:{bronze:{el:2},silver:{el:2},gold:{el:2}}};
      TIERS.forEach(t=>{ const cid=id+"-"+t+"-cap"; SKILLS[cid]={id:cid,area:id,tier:t,kind:"cap",name:{bronze:"Teach the new area SOP",silver:"Lead an advanced workshop",gold:"Develop a new workshop"}[t],desc:"Describe the capstone.",steps:["Plan","Deliver with the area lead present","Request sign-off"],time:"TBD"}; AREAS[id].tiers[t]={req:[],el:[],cap:cid}; });
      addLog(`${me().name} added a new area`); }
    else { const a=AREAS[id]; a.name=name||a.name; a.lead=lead; addLog(`${me().name} updated area ${a.name}`); }
    const ld=person(lead); if(ld&&ld.role==="intern") ld.role="lead"; return id; },
  async setRule(area,tier,n){ AREAS[area].rules[tier].el=n; addLog(`${me().name} set ${AREAS[area].name} ${TIER_NAME[tier]} to need ${n} electives`); },
  async addPerson(f){ PEOPLE.push({id:newId("p"),name:f.name,role:f.role,home:f.home,end:null,active:true}); addLog(`${me().name} added ${f.name}`); },
  async updatePerson(pid,f){ if(pid===S.user && (f.role!=="admin"||!f.active)) throw new Error("You cannot remove your own admin access.");
    Object.assign(person(pid),{name:f.name,role:f.role,home:f.home,end:f.end,active:f.active}); },
  async resetPassword(){ throw new Error("Passwords only exist on the live site."); }
};

/* ============ LIVE (Supabase) ============ */
async function rpc(fn,args){ const {data,error}=await sb.rpc(fn,args); if(error) throw new Error(error.message); return data; }
async function fetchAll(table,order){ let out=[]; for(let from=0;;from+=1000){
  const {data,error}=await sb.from(table).select("*").order(order,{ascending:true}).range(from,from+999);
  if(error) throw new Error(error.message); out=out.concat(data); if(data.length<1000) return out; } }
async function manageUsers(body){ const {data,error}=await sb.functions.invoke("manage-users",{body});
  if(error){
    if(error.name==="FunctionsFetchError"||/failed to send/i.test(error.message))
      throw new Error('Couldn\'t reach the "manage-users" function. In Supabase > Edge Functions, check it is deployed with exactly that name and that "Verify JWT" is turned off.');
    let msg=error.message; try{ const j=await error.context.json(); msg=j.error||msg; }catch(_){} throw new Error(msg); }
  if(data&&data.error) throw new Error(data.error); return data; }
const toLocal = ts=>ts?isoLocal(new Date(ts)):null;
let lastLoad=0;

const LiveAPI = {
  async loadAll(){
    const [areas,rules,skills,people,certs,events,requests,interests,log]=await Promise.all([
      fetchAll("areas","sort"),fetchAll("tier_rules","area"),fetchAll("skills","sort"),fetchAll("people","name"),
      fetchAll("certifications","at"),fetchAll("events","id"),fetchAll("requests","id"),fetchAll("interests","person"),
      sb.from("activity_log").select("*").order("id",{ascending:false}).limit(50)]);
    Object.keys(AREAS).forEach(k=>delete AREAS[k]); Object.keys(SKILLS).forEach(k=>delete SKILLS[k]); PEOPLE.length=0;
    areas.forEach(a=>{ AREAS[a.id]={id:a.id,name:a.name,lead:a.lead,tiers:{},rules:{}}; TIERS.forEach(t=>{ AREAS[a.id].tiers[t]={req:[],el:[],cap:null}; AREAS[a.id].rules[t]={el:2}; }); });
    rules.forEach(r=>{ if(AREAS[r.area]) AREAS[r.area].rules[r.tier]={el:r.electives_needed}; });
    skills.forEach(s=>{ const T=AREAS[s.area]?.tiers[s.tier]; if(!T) return;
      SKILLS[s.id]={id:s.id,area:s.area,tier:s.tier,kind:s.kind,name:s.name,desc:s.description,steps:Array.isArray(s.steps)?s.steps:[],time:s.est_time,retired:s.retired};
      if(s.kind==="cap") T.cap=s.id; else T[s.kind].push(s.id); });
    Object.values(AREAS).forEach(a=>{ if(TIERS.some(t=>!a.tiers[t].cap)) delete AREAS[a.id]; });   // skip areas missing a capstone
    people.forEach(p=>PEOPLE.push({id:p.id,name:p.name,role:p.role,home:p.home_area,end:p.end_date,active:p.active,username:p.username,mustChange:p.must_change_password}));
    S.certs=new Map(certs.map(c=>[key(c.person,c.skill),{by:c.approved_by,at:toLocal(c.at),source:c.source}]));
    S.events=events.map(e=>({pid:e.person,sid:e.skill,type:e.type,at:toLocal(e.at),by:e.by,source:e.source}));
    S.requests=requests.map(r=>({id:r.id,pid:r.person,sid:r.skill,status:r.status,date:toLocal(r.created_at),reviewer:r.reviewer,note:r.note}));
    S.interests=new Set(interests.map(i=>key(i.person,i.skill)));
    S.log=(log.data||[]).map(l=>({date:toLocal(l.at),text:l.text}));
    lastLoad=Date.now();
  },
  async signIn(username,password){ const email=`${username.trim().toLowerCase()}@${CFG.usernameDomain}`;
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error) throw new Error(/invalid/i.test(error.message)?"Username or password is incorrect.":error.message); return data.user.id; },
  async signOut(){ await sb.auth.signOut(); S.user=null; renderLogin("You are signed out."); },
  async changePassword(pw){ const {error}=await sb.auth.updateUser({password:pw}); if(error) throw new Error(error.message); await rpc("password_changed",{}); },
  requestSignoff: sid=>rpc("request_signoff",{p_skill:sid}),
  withdraw: id=>rpc("withdraw_request",{p_id:id}),
  review: (id,approve,note)=>rpc("review_request",{p_id:id,p_approve:approve,p_note:note||""}),
  grant: (pid,sid)=>rpc("grant_skill",{p_person:pid,p_skill:sid}),
  revoke: (pid,sid)=>rpc("revoke_skill",{p_person:pid,p_skill:sid}),
  grantTier: (pid,area,tier)=>rpc("grant_tier",{p_person:pid,p_area:area,p_tier:tier}),
  setInterest: (sid,on)=>rpc("set_interest",{p_skill:sid,p_on:on}),
  addSkill: (area,tier,kind)=>rpc("add_skill",{p_area:area,p_tier:tier,p_kind:kind}),
  saveSkill: (sid,f)=>rpc("save_skill",{p_id:sid,p_name:f.name,p_desc:f.desc,p_steps:f.steps,p_time:f.time,p_kind:f.kind,p_tier:f.tier}),
  setRetired: (sid,on)=>rpc("set_retired",{p_id:sid,p_retired:on}),
  saveArea: (id,name,lead)=>rpc("save_area",{p_id:id,p_name:name,p_lead:lead||null}),
  setRule: (area,tier,n)=>rpc("set_rule",{p_area:area,p_tier:tier,p_n:n}),
  addPerson: f=>manageUsers({action:"create",username:f.username,name:f.name,role:f.role,home_area:f.home||null}),
  updatePerson: (pid,f)=>rpc("update_person",{p_id:pid,p_name:f.name,p_role:f.role,p_home:f.home||null,p_end:f.end||null,p_active:f.active}),
  resetPassword: pid=>manageUsers({action:"reset",person_id:pid})
};
const API = LIVE ? LiveAPI : DemoAPI;

/* ============ SIGN-IN SCREENS (live only) ============ */
function bare(html){ $("#nav").innerHTML=""; $("#who").innerHTML=""; S.selected=null; $("#drawer").classList.remove("open"); $("#main").innerHTML=`<div style="max-width:420px;margin:40px auto">${html}</div>`; }
function renderLogin(msg){
  bare(`<form class="card" id="loginForm" style="display:grid;gap:12px">
    <h2>Sign in</h2>
    <div class="muted" style="font-size:13px">Use your NIS username. First time? Use the starter password your supervisor gave you.</div>
    ${msg?`<div class="card" style="padding:10px;font-size:13px">${esc(msg)}</div>`:""}
    <label>Username<br><input id="lgUser" autocomplete="username" style="width:100%" required></label>
    <label>Password<br><input id="lgPw" type="password" autocomplete="current-password" style="width:100%" required></label>
    <button class="btn primary" type="submit">Sign in</button>
  </form>`);
  $("#lgUser").focus();
  $("#loginForm").addEventListener("submit",async e=>{ e.preventDefault(); const btn=e.target.querySelector("button"); btn.disabled=true; btn.textContent="Signing in…";
    try{ const uid=await API.signIn($("#lgUser").value,$("#lgPw").value); await startSession(uid); }
    catch(err){ renderLogin(err.message); } });
}
function renderChangePassword(forced){
  bare(`<form class="card" id="pwForm" style="display:grid;gap:12px">
    <h2>${forced?"Choose your own password":"Change password"}</h2>
    <div class="muted" style="font-size:13px">${forced?"You signed in with the starter password. Pick a new one only you know.":"Pick a new password."} At least 8 characters.</div>
    <div id="pwMsg"></div>
    <label>New password<br><input id="pw1" type="password" autocomplete="new-password" style="width:100%" required minlength="8"></label>
    <label>Type it again<br><input id="pw2" type="password" autocomplete="new-password" style="width:100%" required minlength="8"></label>
    <div style="display:flex;gap:8px"><button class="btn primary" type="submit">Save password</button>${forced?"":`<button class="btn" type="button" id="pwCancel">Cancel</button>`}</div>
  </form>`);
  $("#pw1").focus();
  if(!forced) $("#pwCancel").addEventListener("click",()=>{ renderUserSel(); render(); });
  $("#pwForm").addEventListener("submit",async e=>{ e.preventDefault(); const a=$("#pw1").value, b=$("#pw2").value;
    const say=m=>$("#pwMsg").innerHTML=`<div class="card" style="padding:10px;font-size:13px;border-color:var(--bad)">${esc(m)}</div>`;
    if(a.length<8) return say("Use at least 8 characters."); if(a!==b) return say("The two passwords don't match.");
    try{ await API.changePassword(a); await API.loadAll(); renderUserSel(); render(); toast("Password saved"); } catch(err){ say(err.message); } });
}
function renderSetupNeeded(){
  bare(`<div class="card"><h2>Almost there</h2><p class="muted">This copy is set to live mode, but the Supabase address and key are missing from <b>js/config.js</b>. See SETUP-GUIDE.md, step 6.</p></div>`);
}
async function startSession(uid){
  try{ await API.loadAll(); }catch(e){ return renderLogin("Could not load the skill tree: "+e.message); }
  const u=person(uid);
  if(!u){ await sb.auth.signOut(); return renderLogin("Your sign-in works, but you haven't been added to the skill tree yet. Ask an admin."); }
  if(!u.active){ await sb.auth.signOut(); return renderLogin("Your account is deactivated. Ask an admin if this is a mistake."); }
  S.user=u.id; S.area=(u.home&&AREAS[u.home])?u.home:(Object.keys(AREAS)[0]||null);
  renderUserSel();
  if(CFG.forcePasswordChange!==false && u.mustChange) return renderChangePassword(true);
  render();
}

/* keep the details panel below the header so Sign out and the menu stay clickable */
function fitHeader(){ const h=document.querySelector("header"); if(h) document.documentElement.style.setProperty("--hdr",h.offsetHeight+"px"); }
window.addEventListener("resize",fitHeader); new MutationObserver(fitHeader).observe(document.querySelector("header"),{childList:true,subtree:true});
/* ============ START ============ */
async function boot(){
  fitHeader();
  if(!LIVE){ seed(); renderUserSel(); S.area=me().home; render(); return; }
  document.querySelector(".sample")?.remove();
  if(!sb) return renderSetupNeeded();
  const {data:{session}}=await sb.auth.getSession();
  if(!session) return renderLogin();
  await startSession(session.user.id);
  // pick up other people's changes when someone comes back to the tab
  document.addEventListener("visibilitychange",async()=>{ if(document.visibilityState!=="visible"||!S.user||Date.now()-lastLoad<20000||(S.edit&&S.selected)) return;
    try{ await API.loadAll(); renderUserSel(); render(); }catch(_){} });
}
boot();
