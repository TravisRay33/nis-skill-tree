/* NIS Skill Tree: app state, logic, rendering, and events. Loads after data.js. */
/* ============ STATE ============ */
const S = {
  user:"travis", view:"tree", area:"wood", coverage:false, selected:null,
  certs:new Map(),   // key pid|sid -> {by,date,source}
  requests:[],       // {id,pid,sid,status,date,reviewer,note}
  interests:new Set(),
  events:[],        // {pid,sid,type:'earned'|'removed',at,by,source} - full history for growth reports
  log:[]
};
const key=(p,s)=>p+"|"+s;
let reqSeq=1;

/* seeded random */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const R = rng(20261024);
const today = new Date(); today.setHours(0,0,0,0);
function daysAgo(n){const d=new Date(today);d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);}
function isoLocal(d){const z=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:00`;}
const nowISO=()=>isoLocal(new Date());
function grant(p,s,by,src,at){ const rec={by,at:at||null,source:src||"seed"}; S.certs.set(key(p,s),rec); if(at) S.events.push({pid:p,sid:s,type:"earned",at,by,source:rec.source}); }
function revoke(p,s,by){ if(!S.certs.has(key(p,s))) return; revoke(p,s,u.id); S.events.push({pid:p,sid:s,type:"removed",at:nowISO(),by,source:"override"}); }
/* Sample timestamps: spread each person's skills between their start date and today; capstones land after their tier's skills. */
function seedDates(){
  const START={}; PEOPLE.forEach(p=>START[p.id]= p.role==="intern"? 120+Math.floor(R()*330) : 540); START.jordan=START.ben=700;
  const atDay=back=>{const d=new Date(today);d.setDate(d.getDate()-back);d.setHours(9+Math.floor(R()*8),Math.floor(R()*60));return d;};
  for(const [k,c] of S.certs){ const [p,sid]=k.split("|"); if(SKILLS[sid].kind!=="cap") c.at=isoLocal(atDay(3+Math.floor(R()*(START[p]-3)))); }
  for(const [k,c] of S.certs){ const [p,sid]=k.split("|"); const sk=SKILLS[sid]; if(sk.kind!=="cap") continue;
    const T=AREAS[sk.area].tiers[sk.tier]; const ds=[...T.req,...T.el].map(id=>S.certs.get(key(p,id))?.at).filter(Boolean).sort();
    const d=ds.length?new Date(ds[ds.length-1]):atDay(START[p]); d.setDate(d.getDate()+2+Math.floor(R()*12)); if(d>new Date()) d.setTime(Date.now()-864e5); c.at=isoLocal(d); }
  S.events=[...S.certs].map(([k,c])=>{const [pid,sid]=k.split("|");return {pid,sid,type:"earned",at:c.at,by:c.by,source:"seed"};}).sort((a,b)=>a.at<b.at?-1:1);
}

function seed(){
  PEOPLE.forEach(p=>{
    AREA_DEFS.forEach(a=>{
      const home = p.home===a.id;
      const T = AREAS[a.id].tiers;
      if(p.role==="lead" && a.lead===p.id){
        ["bronze","silver"].forEach(t=>{[...T[t].req,...T[t].el,T[t].cap].forEach(s=>grant(p.id,s,"travis"));});
        grant(p.id,T.gold.req[0],"travis");
        if(R()<.5) grant(p.id,T.gold.req[1],"travis");
        T.gold.el.forEach(s=>{if(R()<.35)grant(p.id,s,"travis");});
      } else if(p.role==="admin" && home){
        ["bronze","silver"].forEach(t=>{[...T[t].req,...T[t].el,T[t].cap].forEach(s=>grant(p.id,s,"priya"));});
      } else if(p.role==="intern" && home){
        T.bronze.req.forEach(s=>grant(p.id,s,a.lead));
        T.bronze.el.forEach(s=>{if(R()<.7)grant(p.id,s,a.lead);});
        if(capUnlocked(p.id,a.id,"bronze") && R()<.85) grant(p.id,T.bronze.cap,a.lead);
        T.silver.req.forEach(s=>{if(R()<.5)grant(p.id,s,a.lead);});
        T.silver.el.forEach(s=>{if(R()<.35)grant(p.id,s,a.lead);});
        if(capUnlocked(p.id,a.id,"silver") && R()<.6) grant(p.id,T.silver.cap,a.lead);
        T.gold.el.forEach(s=>{if(R()<.06)grant(p.id,s,a.lead);});
      } else {
        const pr = p.role==="admin"?.35:p.role==="lead"?.2:.12;
        [...T.bronze.req,...T.bronze.el].forEach(s=>{if(R()<pr)grant(p.id,s,a.lead);});
        if(p.role==="admin" && capUnlocked(p.id,a.id,"bronze")) grant(p.id,T.bronze.cap,a.lead);
      }
    });
  });
  // Jordan (leaving) is the extra Woodshop Gold holder to show graduation risk
  ["wood-gold-r1","wood-gold-e2","wood-silver-cap","wood-silver-r1","wood-silver-r2","wood-silver-e1","wood-silver-e3"].forEach(s=>grant("jordan",s,"dana"));
  ["metal-silver-r1","metal-silver-r2","metal-silver-e3","metal-silver-e2","metal-silver-cap","metal-gold-e1"].forEach(s=>grant("ben",s,"marcus"));
  // pending requests
  [["chris","wood-silver-r1"],["alexis","rp-silver-r1"],["maya","tex-silver-r2"],["avery","rp-bronze-e3"],["taylor","cer-silver-r1"],["riley","wood-bronze-r1"]]
    .forEach(([p,s],i)=>{ if(!has(p,s)) S.requests.push({id:reqSeq++,pid:p,sid:s,status:"requested",date:daysAgo(i+1),reviewer:null,note:""}); });
  seedDates();
  [["chris","wood-gold-r1"],["avery","rp-silver-r1"],["maya","des-bronze-r1"],["alexis","metal-bronze-r1"],["riley","rp-bronze-r1"]].forEach(([p,s])=>S.interests.add(key(p,s)));
}

/* ============ LOGIC ============ */
const person = id=>PEOPLE.find(p=>p.id===id);
const has = (p,s)=>S.certs.has(key(p,s));
const pendingReq = (p,s)=>S.requests.find(r=>r.pid===p&&r.sid===s&&r.status==="requested");
const leaving = p=>{ if(!p.end) return false; const d=(new Date(p.end)-today)/864e5; return d<=RISK_DAYS; };
const holders = s=>PEOPLE.filter(p=>p.active&&has(p.id,s));
const holdersAfter = s=>holders(s).filter(p=>!leaving(p));
const live = ids=>ids.filter(id=>!SKILLS[id].retired);
const areaList = ()=>Object.values(AREAS);
const liveSkills = ()=>Object.values(SKILLS).filter(s=>!s.retired && AREAS[s.area]);
function progress(pid,area,tier){
  const T=AREAS[area].tiers[tier], req=live(T.req), el=live(T.el);
  const elN=Math.min(AREAS[area].rules[tier].el, el.length);
  const r=req.filter(s=>has(pid,s)).length;
  const e=el.filter(s=>has(pid,s)).length;
  return {r, e:Math.min(e,elN), reqN:req.length, elN, unlocked: r>=req.length && e>=elN && (req.length+elN)>0, earned: has(pid,T.cap)};
}
const canEdit = (u,area)=> u.role==="admin" || (u.role==="lead" && AREAS[area]?.lead===u.id);
let idSeq=1; const newId = p=>`${p}-new${idSeq++}`;
const capUnlocked=(p,a,t)=>progress(p,a,t).unlocked;
function topTier(pid,area){ let top=null; TIERS.forEach(t=>{ if(has(pid,AREAS[area].tiers[t].cap)) top=t; }); return top; }
const me = ()=>person(S.user);
const leadName = areaId=>person(AREAS[areaId]?.lead)?.name||"the area lead";
const canApprove = (u,sid)=> u.role==="admin" || (u.role==="lead" && AREAS[SKILLS[sid].area].lead===u.id);
const initials = n=>n.split(" ").map(x=>x[0]).join("").slice(0,2);
const toDate = d=>new Date(String(d).length>10?d:d+"T00:00");
const fmt = d=>toDate(d).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
const fmtDT = d=>toDate(d).toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
function addLog(text){ S.log.unshift({date:new Date().toISOString().slice(0,10),text}); }

function certify(pid,sid,by,src){ grant(pid,sid,by,src,nowISO()); }

/* ============ RENDER: SHELL ============ */
const $ = s=>document.querySelector(s);
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function renderUserSel(){
  if(LIVE){ const u=me(); $("#who").innerHTML = u?`<span>Signed in as <b>${esc(u.name)}</b></span><button class="btn small" data-act="pwForm">Change password</button><button class="btn small" data-act="signout">Sign out</button>`:""; return; }
  $("#userSel").innerHTML = ["admin","lead","intern"].map(r=>`<optgroup label="${ROLE_NAME[r]}">`+
    PEOPLE.filter(p=>p.role===r&&p.active).map(p=>`<option value="${p.id}" ${p.id===S.user?"selected":""}>${esc(p.name)}${r==="lead"?" ("+AREAS[p.home].name+")":""}</option>`).join("")+`</optgroup>`).join("");
}
function queueFor(u){ return S.requests.filter(r=>r.status==="requested" && canApprove(u,r.sid)); }
function renderNav(){
  const u=me(); const items=[["tree","Skill tree"],["profile","My profile"]];
  if(u.role!=="intern") items.push(["approvals","Approvals"]);
  if(u.role==="admin") items.push(["admin","Coverage & admin"],["growth","Growth"]);
  if(!items.find(i=>i[0]===S.view)) S.view="tree";
  const q=queueFor(u).length;
  $("#nav").innerHTML = items.map(([v,l])=>`<button class="${S.view===v?"on":""}" data-view="${v}">${l}${v==="approvals"&&q?`<span class="ct">${q}</span>`:""}</button>`).join("");
}
function render(){ if(!areaList().length){ renderNav(); $("#main").innerHTML=`<div class="card empty">No areas yet. ${LIVE?"Run 2_starter_content.sql in Supabase, or ask an admin to add an area.":""}</div>`+(me()?.role==="admin"?`<div style="text-align:center;margin-top:10px"><button class="btn primary" data-act="addArea">+ Add the first area</button></div>`:""); return; }
  renderNav(); ({tree:renderTree,profile:renderProfile,approvals:renderApprovals,admin:renderAdmin,growth:renderGrowth})[S.view](); if(S.selected) renderDrawer(); }

/* ============ TREE ============ */
const BAND_W=388, GAP=14, PADX=10, ROWH=98, LEFT_W=256, CAP_W=106, BOX_X=10, BOX_TOP=58, HEAD=30;
function layout(a){
  // Two stacked boxes per tier (Required on top, Select N below) and a capstone box spanning both.
  let rq=1, el=1;
  TIERS.forEach(t=>{ rq=Math.max(rq,Math.ceil(live(a.tiers[t].req).length/2)); el=Math.max(el,Math.ceil(live(a.tiers[t].el).length/2)); });
  const req={y:BOX_TOP,h:HEAD+rq*ROWH+12}, elb={y:BOX_TOP+HEAD+rq*ROWH+12+14,h:HEAD+el*ROWH+12};
  const bottom=elb.y+elb.h, H=bottom+14, pos={};
  TIERS.forEach((t,ti)=>{
    const bx=PADX+ti*(BAND_W+GAP), T=a.tiers[t];
    const place=(ids,box)=>ids.forEach((id,i)=>{ pos[id]={x:bx+BOX_X+(i%2?LEFT_W*0.75:LEFT_W*0.25), y:box.y+HEAD+30+Math.floor(i/2)*ROWH}; });
    place(live(T.req),req); place(live(T.el),elb);
    pos[T.cap]={x:bx+BOX_X+LEFT_W+8+CAP_W/2, y:Math.round((BOX_TOP+bottom)/2-22)};
  });
  return {pos,H,req,elb,bottom};
}
function wrap(name,max=17,maxLines=3){
  const w=String(name).split(" "); const lines=[]; let cur="";
  w.forEach(x=>{ if((cur+" "+x).trim().length>max && cur){lines.push(cur);cur=x;} else cur=(cur+" "+x).trim(); });
  if(cur) lines.push(cur);
  if(lines.length>maxLines){ lines.length=maxLines; lines[maxLines-1]=lines[maxLines-1].replace(/.{0,2}$/,"")+"…"; }
  return lines;
}
function covColor(n){ return n===0?"var(--cov0)":n===1?"var(--cov1)":n===2?"var(--cov2)":"var(--cov3)"; }
function boxSVG(x,y,w,h,t,title,count,met){
  const stroke=met?`var(--${t})`:"var(--line)";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="var(--panel)" fill-opacity=".72" stroke="${stroke}" stroke-width="${met?2:1.5}"/>
    <text x="${x+12}" y="${y+20}" font-size="11" font-weight="800" letter-spacing="1" fill="var(--muted)">${title}</text>
    ${count?`<text x="${x+w-12}" y="${y+20}" text-anchor="end" font-size="11.5" font-weight="700" fill="${met?`var(--${t})`:"var(--muted)"}">${met?"✓ ":""}${count}</text>`:""}`;
}

function renderTree(){
  if(!AREAS[S.area]) S.area=areaList()[0].id;
  const a=AREAS[S.area], u=me(), editable=canEdit(u,a.id);
  if(!editable) S.edit=false;
  const tabs = areaList().map(x=>{const tt=topTier(u.id,x.id);return `<button class="${x.id===S.area?"on":""}" data-area="${x.id}">${esc(x.name)}${tt?`<span class="chip ${tt}" style="padding:0 6px;font-size:10px">${TIER_NAME[tt][0]}</span>`:""}</button>`}).join("")
     + (S.edit && u.role==="admin" ? `<button data-act="addArea" style="border-style:dashed">+ New area</button>`:"");
  const retired = Object.values(SKILLS).filter(s=>s.area===a.id && s.retired);
  $("#main").innerHTML = `
   <div class="toolrow">
     <div><h2>${esc(a.name)}</h2><div class="muted">Area lead: ${esc(person(a.lead)?.name||"none")} · Each tier: all required skills + the set number of electives unlock the capstone. Tiers can be earned in any order.</div></div>
     <div style="display:flex;gap:12px;align-items:center">
       ${S.edit?"":`<label class="switch"><input type="checkbox" id="covT" ${S.coverage?"checked":""}> Show team coverage</label>`}
       ${editable?`<button class="btn ${S.edit?"primary":""}" data-act="toggleEdit">${S.edit?"Done editing":"Edit tree"}</button>`:""}
     </div>
   </div>
   <div class="tabs">${tabs}</div>
   ${S.edit?editPanel(a,u,retired):""}
   <div class="mapwrap" ${S.edit?'style="outline:2px dashed var(--accent);outline-offset:-2px"':""}>${treeSVG(a,u)}</div>
   <div class="legend" style="margin-top:10px">
     ${S.edit ? `<span><b>Edit mode:</b> click any node to rename it, change its details, switch required/elective, or retire it. Renames update everyone's records automatically.</span>`
     : S.coverage
       ? `<span><i style="background:var(--cov0);border-color:var(--cov0)"></i>0 holders</span><span><i style="background:var(--cov1);border-color:var(--cov1)"></i>1 holder (needs coverage)</span><span><i style="background:var(--cov2);border-color:var(--cov2)"></i>2</span><span><i style="background:var(--cov3);border-color:var(--cov3)"></i>3+</span>`
       : `<span><i style="background:var(--bronze);border-color:var(--bronze)"></i>Earned by ${esc(u.name.split(" ")[0])}</span><span><i style="border-color:var(--pending)"></i>Sign-off requested</span><span><i></i>Not yet earned</span><span><i style="border-width:4px"></i>Required (circle)</span><span><i style="border-radius:3px"></i>Elective (square)</span><span>Hexagon = capstone</span>`}
   </div>`;
}
function editPanel(a,u,retired){
  const staff=PEOPLE.filter(p=>p.active&&p.role!=="intern");
  return `<div class="card" style="margin-bottom:12px;border-color:var(--accent)">
    <div class="toolrow"><h3 style="margin:0">Editing ${esc(a.name)}</h3><span class="muted" style="font-size:12px">Changes go live immediately for everyone.</span></div>
    ${u.role==="admin"?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
       <label>Area name <input id="areaName" value="${esc(a.name)}"></label>
       <label>Area lead <select id="areaLead">${staff.map(p=>`<option value="${p.id}" ${p.id===a.lead?"selected":""}>${esc(p.name)}</option>`).join("")}</select></label>
       <button class="btn small" data-act="saveArea">Save area</button></div>`:""}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
      ${TIERS.map(t=>{const T=a.tiers[t];const nEl=live(T.el).length;return `<div style="background:var(--${t}-soft);border-radius:10px;padding:10px">
        <b style="color:var(--${t})">${TIER_NAME[t]}</b> <span class="muted" style="font-size:12px">${live(T.req).length} required · ${nEl} electives</span>
        <div style="margin:8px 0;font-size:13px">Electives needed <input type="number" min="0" max="${nEl}" value="${Math.min(a.rules[t].el,nEl)}" data-rule="${t}" style="width:60px"> of ${nEl}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn small" data-act="add" data-tier="${t}" data-kind="req">+ Required skill</button><button class="btn small" data-act="add" data-tier="${t}" data-kind="el">+ Elective skill</button></div></div>`}).join("")}
    </div>
    ${retired.length?`<div class="sect"><h3>Retired skills (${retired.length})</h3><div class="muted" style="font-size:12px;margin-bottom:6px">Hidden from the tree but kept on the records of people who earned them.</div>
      <ul class="plist">${retired.map(s=>`<li><span class="grow">${esc(s.name)} <span class="pill ${s.tier}">${TIER_NAME[s.tier]}</span><span class="muted" style="font-size:12px">${PEOPLE.filter(p=>has(p.id,s.id)).length} on record</span></span><button class="btn small" data-act="restore" data-sid="${s.id}">Restore</button></li>`).join("")}</ul></div>`:""}
  </div>`;
}
function treeSVG(a,u){
  const W = PADX*2 + BAND_W*3 + GAP*2; const L=layout(a), {pos,H}=L;
  const showMine = !S.coverage && !S.edit;
  let s=`<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(a.name)} skill tree">`;
  TIERS.forEach((t,ti)=>{
    const bx=PADX+ti*(BAND_W+GAP), T=a.tiers[t], pr=progress(u.id,a.id,t);
    const nReq=live(T.req).length, nEl=live(T.el).length, need=pr.elN;
    s+=`<rect x="${bx}" y="8" width="${BAND_W}" height="${H-12}" rx="14" fill="var(--${t}-soft)" opacity=".75"/>`;
    s+=`<text x="${bx+14}" y="38" font-weight="800" font-size="16" fill="var(--${t})" letter-spacing="1.5">${TIER_NAME[t].toUpperCase()}</text>`;
    const lx=bx+BOX_X, cx=lx+LEFT_W+8;
    s+=boxSVG(lx,L.req.y,LEFT_W,L.req.h,t,"REQUIRED", showMine?`${pr.r}/${nReq}`:`${nReq}`, showMine&&nReq>0&&pr.r>=nReq);
    s+=boxSVG(lx,L.elb.y,LEFT_W,L.elb.h,t,`SELECT ${need} OF ${nEl}`, showMine?`${pr.e}/${need}`:"", showMine&&pr.e>=need&&nEl>0);
    s+=boxSVG(cx,L.req.y,CAP_W,L.bottom-L.req.y,t,"CAPSTONE","", showMine&&pr.earned);
    if(!nReq) s+=`<text x="${lx+LEFT_W/2}" y="${L.req.y+HEAD+34}" text-anchor="middle" font-size="12" fill="var(--muted)">No required skills</text>`;
    if(!nEl) s+=`<text x="${lx+LEFT_W/2}" y="${L.elb.y+HEAD+34}" text-anchor="middle" font-size="12" fill="var(--muted)">No electives</text>`;
    // arrows from each box into the capstone box
    [L.req.y+L.req.h/2, L.elb.y+L.elb.h/2].forEach(y=>{ s+=`<polygon points="${lx+LEFT_W+1},${y-6} ${lx+LEFT_W+8},${y} ${lx+LEFT_W+1},${y+6}" fill="var(--${t})" opacity=".8"/>`; });
  });
  TIERS.forEach(t=>{
    const T=a.tiers[t];
    [...live(T.req),...live(T.el)].forEach(id=>s+=nodeSVG(id,pos[id],u));
    s+=capSVG(T.cap,pos[T.cap],u);
  });
  return s+`</svg>`;
}
function nodeSVG(id,p,u){
  const sk=SKILLS[id], t=sk.tier, n=holders(id).length;
  const mine=has(u.id,id), pend=pendingReq(u.id,id);
  const r=24;
  let fill="var(--node-bg)", stroke=`var(--${t})`, inner="";
  if(S.edit){ inner=`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--${t})">✎</text>`; }
  else if(S.coverage){ fill=covColor(n); stroke=covColor(n); inner=`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">${n}</text>`; }
  else if(mine){ fill=`var(--${t})`; inner=`<text x="${p.x}" y="${p.y+6}" text-anchor="middle" font-size="17" font-weight="800" fill="#fff">✓</text>`; }
  else if(pend){ stroke="var(--pending)"; inner=`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="16" font-weight="800" fill="var(--pending)">…</text>`; }
  const sw = sk.kind==="req"?5:3.5, isEl = sk.kind==="el";
  let lbl=""; wrap(sk.name).forEach((l,i)=>lbl+=`<text class="lbl" x="${p.x}" y="${p.y+r+15+i*13}" text-anchor="middle">${esc(l)}</text>`);
  const sel = S.selected===id?(isEl?`<rect class="sel" x="${p.x-r-7}" y="${p.y-r-7}" width="${2*r+14}" height="${2*r+14}" rx="9"/>`:`<circle class="sel" cx="${p.x}" cy="${p.y}" r="${r+7}"/>`):"";
  const ringCls=`ring ${pend&&!S.coverage&&!S.edit?"pend":""}`;
  const shape = isEl ? `<rect class="${ringCls}" x="${p.x-r+1}" y="${p.y-r+1}" width="${2*r-2}" height="${2*r-2}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
                     : `<circle class="${ringCls}" cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  return `<g class="node" data-sid="${id}" tabindex="0">${sel}${shape}${inner}${lbl}<title>${esc(sk.name)}</title></g>`;
}
function hexPts(cx,cy,r){let a=[];for(let i=0;i<6;i++){const ang=Math.PI/180*(60*i-90);a.push((cx+r*Math.cos(ang)).toFixed(1)+","+(cy+r*Math.sin(ang)).toFixed(1));}return a.join(" ");}
function capSVG(id,p,u){
  const sk=SKILLS[id], t=sk.tier, n=holders(id).length, pr=progress(u.id,sk.area,t), pend=pendingReq(u.id,id);
  const r=38; let fill="var(--locked)", stroke="var(--locked)", inner, sw=3;
  if(S.edit){ fill="var(--node-bg)"; stroke=`var(--${t})`; inner=`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--${t})">✎ Edit</text>`; }
  else if(S.coverage){ fill=covColor(n); stroke=fill; inner=`<text x="${p.x}" y="${p.y+6}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">${n}</text>`; }
  else if(pr.earned){ fill=`var(--${t})`; stroke=fill; inner=`<text x="${p.x}" y="${p.y+8}" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">✓</text>`; }
  else if(pend){ fill="var(--node-bg)"; stroke="var(--pending)"; sw=4; inner=`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--pending)">Requested</text>`; }
  else if(pr.unlocked){ fill="var(--node-bg)"; stroke=`var(--${t})`; sw=5; inner=`<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="13" font-weight="800" fill="var(--${t})">READY</text>`; }
  else { inner=`<text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">LOCKED</text>`; }
  let lbl=""; wrap(sk.name,14,4).forEach((l,i)=>lbl+=`<text class="lbl" x="${p.x}" y="${p.y+r+16+i*13}" text-anchor="middle" font-weight="700">${esc(l)}</text>`);
  const sel = S.selected===id?`<polygon class="sel" points="${hexPts(p.x,p.y,r+8)}"/>`:"";
  return `<g class="node" data-sid="${id}" tabindex="0">${sel}<polygon class="ring ${pend&&!S.coverage&&!S.edit?"pend":""}" points="${hexPts(p.x,p.y,r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${inner}${lbl}<title>${esc(sk.name)}</title></g>`;
}
function editDrawer(sk){
  const n=PEOPLE.filter(p=>has(p.id,sk.id)).length;
  $("#drawer").innerHTML = `
   <button class="x" data-act="close" aria-label="Close">×</button>
   <div><span class="pill ${sk.tier}">${TIER_NAME[sk.tier]}</span><span class="pill">${esc(AREAS[sk.area].name)}</span><span class="pill" style="background:var(--accent);color:#fff">Editing</span></div>
   <h2 style="margin:10px 0 4px">Edit ${sk.kind==="cap"?"capstone":"skill"}</h2>
   <div class="muted" style="font-size:12px;margin-bottom:12px">${n} ${n===1?"person holds":"people hold"} this. Changes, including renames, update their records automatically.</div>
   <div style="display:grid;gap:10px">
     <label>Name<br><input id="eName" value="${esc(sk.name)}" style="width:100%"></label>
     ${sk.kind!=="cap"?`<label>Type<br><select id="eKind" style="width:100%"><option value="req" ${sk.kind==="req"?"selected":""}>Required</option><option value="el" ${sk.kind==="el"?"selected":""}>Elective</option></select></label>
     <label>Tier<br><select id="eTier" style="width:100%">${TIERS.map(t=>`<option value="${t}" ${t===sk.tier?"selected":""}>${TIER_NAME[t]}</option>`).join("")}</select></label>`:""}
     <label>Description<br><textarea id="eDesc" rows="3" style="width:100%">${esc(sk.desc)}</textarea></label>
     <label>Steps (one per line)<br><textarea id="eSteps" rows="5" style="width:100%">${esc(sk.steps.join("\n"))}</textarea></label>
     <label>Estimated time<br><input id="eTime" value="${esc(sk.time)}" style="width:100%"></label>
   </div>
   <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
     <button class="btn primary" data-act="saveSkill">Save</button>
     ${sk.kind!=="cap"?`<button class="btn" data-act="retire" style="color:var(--bad)">Retire skill</button>`:""}
     <button class="btn" data-act="close">Cancel</button>
   </div>
   ${sk.kind!=="cap"?`<div class="muted" style="font-size:12px;margin-top:10px">Retiring hides the skill from the tree and from unlock rules. Anyone who earned it keeps it on their record, and it can be restored later.</div>`:""}`;
  $("#drawer").classList.add("open");
}

/* ============ DRAWER ============ */
function renderDrawer(){
  const sk=SKILLS[S.selected]; if(!sk) return;
  if(S.edit && S.view==="tree") return editDrawer(sk);
  const u=me(), a=AREAS[sk.area], hs=holders(sk.id), after=holdersAfter(sk.id).length;
  const mine=has(u.id,sk.id), pend=pendingReq(u.id,sk.id), pr=progress(u.id,sk.area,sk.tier);
  const interested=PEOPLE.filter(p=>S.interests.has(key(p.id,sk.id)));
  const iWant=S.interests.has(key(u.id,sk.id));
  let action="";
  if(mine){ const c=S.certs.get(key(u.id,sk.id)); action=`<div class="card" style="background:var(--${sk.tier}-soft);border-color:transparent"><b>You hold this ${sk.kind==="cap"?"capstone":"skill"}.</b><div class="muted">Signed off by ${esc(person(c.by)?.name||c.by)} on ${fmtDT(c.at)}${c.source==="override"?" (admin override)":""}</div></div>`; }
  else if(pend){ action=`<div class="card" style="border-color:var(--pending)"><b style="color:var(--pending)">Sign-off requested</b><div class="muted">Sent ${fmt(pend.date)}. Waiting for ${esc(leadName(a.id))} to observe and approve.</div><button class="btn small" data-act="withdraw" data-id="${pend.id}" style="margin-top:8px">Withdraw request</button></div>`; }
  else if(sk.kind==="cap" && !pr.unlocked){ action=`<div class="card"><b>Capstone locked</b><div class="muted">Finish all ${pr.reqN} required skills (${pr.r}/${pr.reqN}) and any ${pr.elN} electives (${pr.e}/${pr.elN}) in ${esc(a.name)} ${TIER_NAME[sk.tier]} to unlock it.</div></div>`; }
  else { action=`<button class="btn primary" data-act="request">Request sign-off</button> <span class="muted" style="font-size:12px">Goes to ${esc(leadName(a.id))}</span>`; }
  const ret = S.requests.filter(r=>r.pid===u.id&&r.sid===sk.id&&r.status==="returned").slice(-1)[0];
  const admin = u.role==="admin";
  $("#drawer").innerHTML = `
   <button class="x" data-act="close" aria-label="Close">×</button>
   <div><span class="pill ${sk.tier}">${TIER_NAME[sk.tier]}</span>${sk.kind==="req"?'<span class="pill req">Required</span>':sk.kind==="el"?'<span class="pill">Elective</span>':'<span class="pill" style="background:var(--ink);color:var(--panel)">Capstone</span>'}<span class="pill">${esc(a.name)}</span></div>
   <h2 style="margin:10px 0 6px">${esc(sk.name)}</h2>
   <p class="muted" style="margin:0 0 10px">${esc(sk.desc)}</p>
   <div style="font-size:13px"><b>Estimated time:</b> ${esc(sk.time)}</div>
   <div class="sect"><h3>Steps</h3><ol class="steps">${sk.steps.map(x=>`<li>${esc(x)}</li>`).join("")}</ol></div>
   <div class="sect">${action}${ret&&!mine&&!pend?`<div class="muted" style="margin-top:8px;font-size:12px">Last request returned by ${esc(person(ret.reviewer).name)}: "${esc(ret.note||"No note")}"</div>`:""}
     ${!mine?`<div style="margin-top:10px"><label class="switch"><input type="checkbox" data-act="interest" ${iWant?"checked":""}> I want to learn this</label></div>`:""}</div>
   <div class="sect"><h3>Who can teach this (${hs.length}) ${hs.length<=1?'<span class="pill flag">Needs coverage</span>':after<=1?'<span class="pill risk">At risk: holders leaving</span>':""}</h3>
     ${hs.length?`<ul class="plist">${hs.map(p=>`<li><span class="av">${initials(p.name)}</span><span class="grow">${esc(p.name)}<br><span class="muted" style="font-size:12px">${ROLE_NAME[p.role]}${leaving(p)?` · leaving ${fmt(p.end)}`:""}</span></span>${admin?`<button class="btn small" data-act="remove" data-p="${p.id}">Remove</button>`:""}</li>`).join("")}</ul>`:`<div class="muted">No one holds this yet.</div>`}
   </div>
   <div class="sect"><h3>Want to learn (${interested.length})</h3>${interested.length?`<ul class="plist">${interested.map(p=>`<li><span class="av">${initials(p.name)}</span><span class="grow">${esc(p.name)}</span></li>`).join("")}</ul>`:'<div class="muted">No one yet.</div>'}</div>
   ${admin?`<div class="sect"><h3>Admin override</h3><div class="muted" style="font-size:12px;margin-bottom:6px">Grant this to anyone directly, skipping the request and unlock rules.</div>
     <div style="display:flex;gap:6px"><select id="grantSel" class="grow">${PEOPLE.filter(p=>!has(p.id,sk.id)).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select><button class="btn" data-act="grant">Grant</button></div></div>`:""}`;
  $("#drawer").classList.add("open");
}
function closeDrawer(){ S.selected=null; $("#drawer").classList.remove("open"); if(S.view==="tree") renderTree(); }

/* ============ PROFILE ============ */
function renderProfile(){
  const u=me();
  const total=[...S.certs.keys()].filter(k=>k.startsWith(u.id+"|")).length;
  const pend=S.requests.filter(r=>r.pid===u.id&&r.status==="requested");
  const retiredHeld=Object.values(SKILLS).filter(sk=>sk.retired&&has(u.id,sk.id));
  const want=[...S.interests].filter(k=>k.startsWith(u.id+"|")).map(k=>SKILLS[k.split("|")[1]]).filter(s=>!has(u.id,s.id));
  $("#main").innerHTML = `
   <div class="card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
     <span class="av" style="width:56px;height:56px;font-size:18px">${initials(u.name)}</span>
     <div class="grow"><h2>${esc(u.name)}</h2><div class="muted">${ROLE_NAME[u.role]} · Home area: ${esc(AREAS[u.home].name)}${u.end?` · Expected end: ${fmt(u.end)}`:""}</div></div>
     <div class="stat"><div class="n">${total}</div><div class="t">skills held</div></div>
   </div>
   <div class="card" style="margin-bottom:18px">
     <div class="toolrow"><h3 style="margin:0">My skill tree</h3><span class="muted" style="font-size:12px">Bronze sits closest to the center, then Silver, then Gold. Lit nodes are earned. Click any node for details.</span></div>
     ${radialSVG(u)}
     <div class="legend" style="justify-content:center;margin-top:6px"><span><i style="border-width:3px"></i>Required</span><span><i style="border-radius:3px"></i>Elective</span><span>Hexagon = capstone</span><span><i style="background:var(--bronze);border-color:var(--bronze)"></i>Earned</span><span><i style="background:var(--locked);border-color:var(--muted)"></i>Locked capstone</span></div>
   </div>
   <h3>Badge</h3>
   <div class="medals" style="margin-bottom:18px">${areaList().map(a=>{const t=topTier(u.id,a.id);return `<div class="medal"><div class="m ${t||""}">${t?TIER_NAME[t].toUpperCase():"-"}</div><b>${esc(a.name)}</b><div class="muted" style="font-size:12px">${TIERS.filter(x=>has(u.id,AREAS[a.id].tiers[x].cap)).map(x=>TIER_NAME[x]).join(", ")||"No tier yet"}</div></div>`}).join("")}</div>
   <div class="grid g2">
     <div class="card"><h3>Progress by area</h3>${areaList().map(a=>`<div style="margin-bottom:10px"><b>${esc(a.name)}</b>${TIERS.map(t=>{const p=progress(u.id,a.id,t);const pct=p.earned?100:Math.round((p.r+p.e)/(p.reqN+p.elN+1)*100);return `<div style="display:flex;justify-content:space-between;font-size:12px" class="muted"><span>${TIER_NAME[t]}</span><span>${p.earned?"Earned":p.unlocked?"Capstone ready":`Req ${p.r}/${p.reqN} · Elect ${p.e}/${p.elN}`}</span></div><div class="prog"><span style="width:${pct}%;background:var(--${t})"></span></div>`}).join("")}</div>`).join("")}</div>
     <div>
       <div class="card" style="margin-bottom:14px"><h3>Pending sign-offs (${pend.length})</h3>${pend.length?`<ul class="plist">${pend.map(r=>`<li><span class="grow"><a href="#" data-open="${r.sid}">${esc(SKILLS[r.sid].name)}</a><br><span class="muted" style="font-size:12px">${esc(AREAS[SKILLS[r.sid].area].name)} ${TIER_NAME[SKILLS[r.sid].tier]} · sent ${fmt(r.date)}</span></span></li>`).join("")}</ul>`:'<div class="muted">None</div>'}</div>
       ${retiredHeld.length?`<div class="card" style="margin-bottom:14px"><h3>Retired skills on record (${retiredHeld.length})</h3><ul class="plist">${retiredHeld.map(sk=>`<li><span class="grow">${esc(sk.name)}<br><span class="muted" style="font-size:12px">${esc(AREAS[sk.area]?.name||"")} ${TIER_NAME[sk.tier]} · no longer on the tree</span></span></li>`).join("")}</ul></div>`:""}
       <div class="card"><h3>Want to learn (${want.length})</h3>${want.length?`<ul class="plist">${want.map(s=>{const hs=holders(s.id);return `<li><span class="grow"><a href="#" data-open="${s.id}">${esc(s.name)}</a><br><span class="muted" style="font-size:12px">Ask: ${hs.slice(0,3).map(p=>esc(p.name)).join(", ")||"no holders yet"}</span></span></li>`}).join("")}</ul>`:'<div class="muted">Mark skills with "I want to learn this" on the tree.</div>'}</div>
     </div>
   </div>`;
}

/* ============ PROFILE: RADIAL SKILL TREE ============ */
const RING = {bronze:{s:125,c:180}, silver:{s:240,c:295}, gold:{s:355,c:410}};
function polar(r,deg){const a=(deg-90)*Math.PI/180;return {x:+(r*Math.cos(a)).toFixed(1),y:+(r*Math.sin(a)).toFixed(1)};}
function radialSVG(u){
  const areas=areaList(), n=areas.length, wedge=360/n, span=Math.min(46,wedge*0.78);
  let bg="", edges="", nodes="", labels="";
  // tier rings
  TIERS.forEach(t=>{ bg+=`<circle r="${RING[t].c}" fill="none" stroke="var(--${t})" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="3 5"/>`; });
  areas.forEach((a,ai)=>{
    const c=ai*wedge;
    // wedge divider
    const d=polar(440,c-wedge/2); bg+=`<line x1="0" y1="0" x2="${d.x}" y2="${d.y}" stroke="var(--line)" stroke-width="1"/>`;
    let parents=[{x:0,y:0,on:true}];
    TIERS.forEach(t=>{
      const T=a.tiers[t], ids=[...live(T.req),...live(T.el)], k=ids.length;
      const capP=polar(RING[t].c,c), capOn=has(u.id,T.cap);
      const pts=ids.map((id,i)=>({id,...polar(RING[t].s, k===1?c:c-span/2+span*i/(k-1)),on:has(u.id,id)}));
      // edges: each parent -> each skill (parent is center or previous capstone); skill -> capstone
      pts.forEach(p=>{ parents.forEach(pa=>{ const lit=p.on&&pa.on; edges+=`<line x1="${pa.x}" y1="${pa.y}" x2="${p.x}" y2="${p.y}" stroke="${lit?`var(--${t})`:"var(--line)"}" stroke-width="${lit?3:1.2}" ${lit?"":'stroke-opacity=".8"'}/>`; });
        const lit=p.on&&capOn; edges+=`<line x1="${p.x}" y1="${p.y}" x2="${capP.x}" y2="${capP.y}" stroke="${lit?`var(--${t})`:"var(--line)"}" stroke-width="${lit?3:1.2}"/>`; });
      if(!k) parents.forEach(pa=>{ edges+=`<line x1="${pa.x}" y1="${pa.y}" x2="${capP.x}" y2="${capP.y}" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="3 4"/>`; });
      pts.forEach(p=>{ const sk=SKILLS[p.id], fill=p.on?`var(--${t})`:"var(--node-bg)", stroke=p.on?`var(--${t})`:"var(--muted)", glow=p.on?`filter="url(#glow)"`:"";
        const shape = sk.kind==="el" ? `<rect x="${p.x-7}" y="${p.y-7}" width="14" height="14" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="2" ${glow}/>` : `<circle cx="${p.x}" cy="${p.y}" r="8" fill="${fill}" stroke="${stroke}" stroke-width="${sk.kind==="req"?3:2}" ${glow}/>`;
        nodes+=`<g class="cnode" data-open="${p.id}">${shape}<title>${esc(sk.name)} (${TIER_NAME[t]} ${sk.kind==="req"?"required":"elective"})${p.on?" - earned":""}</title></g>`; });
      const pr=progress(u.id,a.id,t), cs=SKILLS[T.cap];
      const cfill=capOn?`var(--${t})`:pr.unlocked?"var(--node-bg)":"var(--locked)", cstroke=capOn||pr.unlocked?`var(--${t})`:"var(--muted)";
      nodes+=`<g class="cnode" data-open="${T.cap}"><polygon points="${hexPts(capP.x,capP.y,15)}" fill="${cfill}" stroke="${cstroke}" stroke-width="${pr.unlocked&&!capOn?3.5:2}" ${capOn?'filter="url(#glow)"':""}/>${capOn?`<text x="${capP.x}" y="${capP.y+4.5}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">✓</text>`:""}<title>${esc(cs.name)} (${TIER_NAME[t]} capstone)${capOn?" - earned":pr.unlocked?" - ready":""}</title></g>`;
      parents=[{...capP,on:capOn}];
    });
    const lp=polar(462,c), top=topTier(u.id,a.id);
    labels+=`<text x="${lp.x}" y="${lp.y-2}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${esc(a.name)}</text>`;
    labels+=`<text x="${lp.x}" y="${lp.y+14}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${top?`var(--${top})`:"var(--muted)"}">${top?TIER_NAME[top]:"Not started"}</text>`;
  });
  const held=liveSkills().filter(s=>has(u.id,s.id)).length, tot=liveSkills().length;
  const center=`<circle r="44" fill="var(--panel)" stroke="var(--accent)" stroke-width="3"/><text y="-4" text-anchor="middle" font-size="18" font-weight="800" fill="var(--ink)">${initials(u.name)}</text><text y="16" text-anchor="middle" font-size="11" fill="var(--muted)">${held} / ${tot}</text>`;
  return `<svg viewBox="-520 -500 1040 1000" style="width:100%;max-width:780px;display:block;margin:0 auto" role="img" aria-label="${esc(u.name)}'s skill tree">
    <defs><filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${bg}${edges}${nodes}${center}${labels}</svg>`;
}

/* ============ APPROVALS ============ */
function renderApprovals(){
  const u=me(), q=queueFor(u);
  const recent=S.requests.filter(r=>(r.status==="approved"||r.status==="returned")&&canApprove(u,r.sid)).slice(-6).reverse();
  $("#main").innerHTML = `
   <h2>Approval queue</h2><p class="muted">${u.role==="admin"?"All areas (admin).":`Requests for ${areaList().filter(a=>a.lead===u.id).map(a=>a.name).join(", ")}.`} Approve after you observe the person in person.</p>
   <div class="grid">${q.length?q.map(r=>{const sk=SKILLS[r.sid],p=person(r.pid);return `<div class="card req-card">
     <span class="av" style="width:40px;height:40px">${initials(p.name)}</span>
     <div class="grow" style="min-width:220px"><b>${esc(p.name)}</b> <span class="muted">requested</span> <a href="#" data-open="${sk.id}">${esc(sk.name)}</a><br>
       <span class="pill ${sk.tier}">${TIER_NAME[sk.tier]}</span><span class="pill">${esc(AREAS[sk.area].name)}</span><span class="pill">${sk.kind==="cap"?"Capstone":sk.kind==="req"?"Required":"Elective"}</span> <span class="muted" style="font-size:12px">${fmt(r.date)}</span>
       <div style="margin-top:8px"><input id="note${r.id}" placeholder="Note (optional, shown if returned)" style="width:100%;max-width:420px"></div></div>
     <div style="display:flex;gap:6px"><button class="btn ok" data-act="approve" data-id="${r.id}">Approve</button><button class="btn" data-act="return" data-id="${r.id}">Return</button></div></div>`}).join(""):'<div class="card empty">No pending requests. Switch to an intern and request a sign-off to see one arrive here.</div>'}</div>
   ${recent.length?`<h3 style="margin-top:20px">Recently reviewed</h3><div class="card"><table><tr><th>Person</th><th>Skill</th><th>Result</th><th>Note</th></tr>${recent.map(r=>`<tr><td>${esc(person(r.pid).name)}</td><td>${esc(SKILLS[r.sid].name)}</td><td>${r.status==="approved"?"Approved":"Returned"}</td><td class="muted">${esc(r.note||"")}</td></tr>`).join("")}</table></div>`:""}`;
}

/* ============ ADMIN ============ */
let covArea="all";
function renderAdmin(){
  const all=liveSkills();
  const flagged=all.filter(s=>holders(s.id).length<=1);
  const risk=all.filter(s=>holders(s.id).length>1 && holdersAfter(s.id).length<=1);
  const rows=all.filter(s=>covArea==="all"||s.area===covArea).map(s=>({s,n:holders(s.id).length,a:holdersAfter(s.id).length}))
    .sort((x,y)=>(x.n<=1?0:x.a<=1?1:2)-(y.n<=1?0:y.a<=1?1:2) || x.n-y.n);
  $("#main").innerHTML = `
   <h2>Coverage & admin</h2><p class="muted">Studio-wide view. "Needs coverage" = held by 1 or fewer people. "At risk" = drops to 1 or fewer once people leaving within ${RISK_DAYS} days are gone.</p>
   <div class="grid g4" style="margin-bottom:14px">
     <div class="card stat"><div class="n">${S.certs.size}</div><div class="t">certifications held</div></div>
     <div class="card stat"><div class="n" style="color:var(--bad)">${flagged.length}</div><div class="t">skills need coverage (of ${all.length})</div></div>
     <div class="card stat"><div class="n" style="color:#b7791f">${risk.length}</div><div class="t">skills at risk from departures</div></div>
     <div class="card stat"><div class="n">${S.requests.filter(r=>r.status==="requested").length}</div><div class="t">sign-offs waiting</div></div>
   </div>
   <div class="card" style="margin-bottom:14px;overflow-x:auto"><h3>Team capability snapshot</h3>
     <table class="heat"><tr><th>Person</th>${areaList().map(a=>`<th style="text-align:center">${esc(a.name)}</th>`).join("")}</tr>
     ${PEOPLE.filter(p=>p.active).map(p=>`<tr><td><b>${esc(p.name)}</b><br><span class="muted" style="font-size:11px">${ROLE_NAME[p.role]}${leaving(p)?' · <span style="color:var(--bad)">leaving '+fmt(p.end)+"</span>":""}</span></td>${areaList().map(a=>{const t=topTier(p.id,a.id);const n=liveSkills().filter(s=>s.area===a.id&&has(p.id,s.id)).length;return `<td class="c"><span class="chip ${t||"none"}">${t?TIER_NAME[t]:"-"}</span><div class="muted" style="font-size:11px">${n} skill${n===1?"":"s"}</div></td>`}).join("")}</tr>`).join("")}</table></div>
   <div class="card" style="margin-bottom:14px;overflow-x:auto"><div class="toolrow"><h3 style="margin:0">Machine skill coverage</h3>
     <select id="covArea"><option value="all">All areas</option>${areaList().map(a=>`<option value="${a.id}" ${covArea===a.id?"selected":""}>${esc(a.name)}</option>`).join("")}</select></div>
     <table><tr><th>Skill</th><th>Area</th><th>Tier</th><th>Type</th><th>Holders now</th><th>After departures</th><th>Status</th></tr>
     ${rows.map(({s,n,a})=>`<tr><td><a href="#" data-open="${s.id}">${esc(s.name)}</a></td><td>${esc(AREAS[s.area].name)}</td><td><span class="pill ${s.tier}">${TIER_NAME[s.tier]}</span></td><td>${s.kind==="cap"?"Capstone":s.kind==="req"?"Required":"Elective"}</td><td>${n}</td><td>${a}</td><td>${n<=1?'<span class="pill flag">Needs coverage</span>':a<=1?'<span class="pill risk">At risk</span>':'<span class="muted">OK</span>'}</td></tr>`).join("")}</table></div>
   <div class="grid g2">
     <div class="card"><h3>Admin override</h3><div class="muted" style="font-size:12px;margin-bottom:8px">Grant or remove any skill, capstone or tier for anyone. Logged below.</div>
       <div style="display:grid;gap:8px">
        <select id="ovP">${PEOPLE.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
        <select id="ovA">${areaList().map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select>
        <select id="ovS"></select>
        <div style="display:flex;gap:6px"><button class="btn primary" data-act="ovGrant">Grant</button><button class="btn" data-act="ovRemove">Remove</button><button class="btn" data-act="ovTier">Grant whole tier</button></div>
       </div></div>
     <div class="card" style="overflow-x:auto"><h3>People</h3><div class="muted" style="font-size:12px;margin-bottom:6px">Deactivated people drop out of coverage but keep their records.</div>
       <table><tr><th>Name</th>${LIVE?"<th>Username</th>":""}<th>Role</th><th>Home area</th><th>End date</th><th>Active</th>${LIVE?"<th></th>":""}</tr>
       ${PEOPLE.map(p=>`<tr style="${p.active?"":"opacity:.5"}"><td><input data-pname="${p.id}" value="${esc(p.name)}" style="width:140px;padding:3px 6px"></td>${LIVE?`<td class="muted">${esc(p.username||"")}</td>`:""}
         <td><select data-prole="${p.id}" style="padding:3px 6px">${Object.keys(ROLE_NAME).map(r=>`<option value="${r}" ${r===p.role?"selected":""}>${ROLE_NAME[r]}</option>`).join("")}</select></td>
         <td><select data-phome="${p.id}" style="padding:3px 6px">${areaList().map(a=>`<option value="${a.id}" ${a.id===p.home?"selected":""}>${esc(a.name)}</option>`).join("")}</select></td>
         <td><input type="date" data-end="${p.id}" value="${p.end||""}" style="padding:3px 6px"></td>
         <td><input type="checkbox" data-pactive="${p.id}" ${p.active?"checked":""} ${p.id===S.user?"disabled":""}></td>${LIVE?`<td>${p.id===S.user?"":`<button class="btn small" data-act="resetPw" data-p="${p.id}">Reset password</button>`}${p.mustChange?' <span class="pill">starter password</span>':""}</td>`:""}</tr>`).join("")}
       </table>
       <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
         <input id="npName" placeholder="New person's name" style="flex:1;min-width:140px">${LIVE?`<input id="npUser" placeholder="NIS username" style="width:140px">`:""}
         <select id="npRole">${Object.keys(ROLE_NAME).map(r=>`<option value="${r}" ${r==="intern"?"selected":""}>${ROLE_NAME[r]}</option>`).join("")}</select>
         <select id="npHome">${areaList().map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select>
         <button class="btn primary" data-act="addPerson">Add person</button></div>${LIVE?`<div class="muted" style="font-size:12px;margin-top:6px">New people sign in with their username and the starter password${CFG.forcePasswordChange===false?" and can change it any time with Change password":", then pick their own"}.</div>`:""}</div>
   </div>
   <div class="card" style="margin-top:14px"><h3>${LIVE?"Recent activity":"Activity log (this session)"}</h3>${S.log.length?`<table>${S.log.slice(0,15).map(l=>`<tr><td class="muted" style="width:110px">${fmt(l.date)}</td><td>${esc(l.text)}</td></tr>`).join("")}</table>`:'<div class="muted">No changes yet.</div>'}</div>`;
  fillOvSkills();
}
function fillOvSkills(){
  const a=$("#ovA")?.value; if(!a) return;
  $("#ovS").innerHTML = TIERS.map(t=>`<optgroup label="${TIER_NAME[t]}">`+[...live(AREAS[a].tiers[t].req),...live(AREAS[a].tiers[t].el),AREAS[a].tiers[t].cap].map(id=>`<option value="${id}">${SKILLS[id].kind==="cap"?"Capstone: ":""}${esc(SKILLS[id].name)}</option>`).join("")+`</optgroup>`).join("");
}

/* ============ GROWTH OVER TIME (admin) ============ */
const G = {people:null, slot:{}, from:null, to:null, area:"all", mode:"each", preset:"12m"};
const MAX_SERIES = 8;
const ymd = d=>isoLocal(d).slice(0,10);
function initG(){ if(G.people) return; G.people=new Set(); PEOPLE.filter(p=>p.role==="intern"&&p.active).slice(0,4).forEach(p=>selectPerson(p.id)); setPreset("12m"); }
function selectPerson(id){ if(G.people.has(id)) return true;
  if(G.mode==="each" && G.people.size>=MAX_SERIES){ toast(`Up to ${MAX_SERIES} people in "Each person". Switch to "Combined total" for more.`); return false; }
  G.people.add(id); const used=new Set(Object.values(G.slot)); for(let i=1;i<=MAX_SERIES;i++){ if(!used.has(i)){ G.slot[id]=i; break; } } return true; }
function unselectPerson(id){ G.people.delete(id); delete G.slot[id]; }
function setPreset(k){ G.preset=k; const f=new Date(today);
  if(k==="90d") f.setDate(f.getDate()-90); else if(k==="6m") f.setMonth(f.getMonth()-6); else if(k==="12m") f.setFullYear(f.getFullYear()-1);
  else { const first=S.events[0]?.at; if(first) f.setTime(toDate(first.slice(0,10)).getTime()); }
  G.from=ymd(f); G.to=ymd(today); }
const inArea = e=>G.area==="all"||SKILLS[e.sid]?.area===G.area;
const rangeISO = ()=>[G.from+"T00:00:00", G.to+"T23:59:59"];
function evFor(ids){ return S.events.filter(e=>ids.includes(e.pid)&&inArea(e)); }
function countAt(evs,iso){ let n=0; evs.forEach(e=>{ if(e.at<=iso) n+=e.type==="earned"?1:-1; }); return n; }
function stepSeries(evs){ const [fi,ti]=rangeISO(); const pts=[{t:toDate(G.from).getTime(),v:countAt(evs,fi)}];
  evs.filter(e=>e.at>fi&&e.at<=ti).sort((a,b)=>a.at<b.at?-1:1).forEach(e=>pts.push({t:toDate(e.at).getTime(),v:pts[pts.length-1].v+(e.type==="earned"?1:-1)}));
  pts.push({t:toDate(G.to).getTime()+864e5-1,v:pts[pts.length-1].v}); return pts; }
function summaryFor(ids){ const evs=evFor(ids), [fi,ti]=rangeISO(), inR=evs.filter(e=>e.at>fi&&e.at<=ti);
  const earned=inR.filter(e=>e.type==="earned"); const last=earned.length?earned.map(e=>e.at).sort().pop():null;
  return {start:countAt(evs,fi), end:countAt(evs,ti), gained:earned.length, removed:inR.length-earned.length, tiers:earned.filter(e=>SKILLS[e.sid]?.kind==="cap").length, last}; }
function growthSeries(){
  const ids=[...G.people].filter(id=>person(id));
  if(G.mode==="total") return ids.length?[{id:"total",name:`Combined (${ids.length} ${ids.length===1?"person":"people"})`,slot:1,pts:stepSeries(evFor(ids))}]:[];
  return ids.map(id=>({id,name:person(id).name,slot:G.slot[id],pts:stepSeries(evFor([id]))}));
}
function niceStep(max){ const raw=Math.max(1,max)/5, p=Math.pow(10,Math.floor(Math.log10(raw))); return [1,2,5,10].map(m=>m*p).find(x=>x>=raw); }
function growthChart(series){
  const W=920,H=340,ml=46,mr=series.length<=4?150:20,mt=14,mb=34, t0=toDate(G.from).getTime(), t1=toDate(G.to).getTime()+864e5-1;
  const maxV=Math.max(1,...series.flatMap(s=>s.pts.map(p=>p.v))), step=niceStep(maxV), top=Math.ceil(maxV/step)*step;
  const X=t=>ml+(t-t0)/(t1-t0)*(W-ml-mr), Y=v=>mt+(1-v/top)*(H-mt-mb);
  let g="";
  for(let v=0;v<=top;v+=step) g+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${ml-8}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`;
  // month ticks
  const months=[]; const d=new Date(toDate(G.from)); d.setDate(1); d.setMonth(d.getMonth()+1);
  while(d.getTime()<=t1){ months.push(new Date(d)); d.setMonth(d.getMonth()+1); }
  const every=Math.ceil(months.length/10)||1;
  months.forEach((m,i)=>{ if(i%every) return; const x=X(m.getTime()); g+=`<line x1="${x}" x2="${x}" y1="${H-mb}" y2="${H-mb+4}" stroke="var(--muted)"/><text x="${x}" y="${H-mb+18}" text-anchor="middle" font-size="11" fill="var(--muted)">${m.toLocaleDateString(undefined,{month:"short"})}${m.getMonth()===0||i===0?" "+String(m.getFullYear()).slice(2):""}</text>`; });
  g+=`<line x1="${ml}" x2="${W-mr}" y1="${H-mb}" y2="${H-mb}" stroke="var(--muted)" stroke-width="1"/>`;
  let lines="", ends=[];
  series.forEach(s=>{ let path=""; s.pts.forEach((p,i)=>{ const x=X(Math.max(t0,p.t)).toFixed(1), y=Y(p.v).toFixed(1); path+= i?` H${x} V${y}`:`M${x} ${y}`; });
    lines+=`<path d="${path}" fill="none" stroke="var(--s${s.slot})" stroke-width="2" stroke-linejoin="round"/>`;
    const last=s.pts[s.pts.length-1]; lines+=`<circle cx="${X(last.t)}" cy="${Y(last.v)}" r="4.5" fill="var(--s${s.slot})" stroke="var(--panel)" stroke-width="2"/>`;
    ends.push({s,y:Y(last.v),v:last.v}); });
  let labels="";
  if(series.length<=4){ ends.sort((a,b)=>a.y-b.y); for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<14) ends[i].y=ends[i-1].y+14;
    ends.forEach(e=>labels+=`<text x="${W-mr+10}" y="${e.y+4}" font-size="12" fill="var(--ink)"><tspan font-weight="700">${e.v}</tspan> ${esc(e.s.name)}</text>`); }
  return `<svg id="gSvg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Skills held over time">${g}${lines}${labels}
    <line id="gCross" x1="0" x2="0" y1="${mt}" y2="${H-mb}" stroke="var(--muted)" stroke-dasharray="3 3" visibility="hidden"/>
    <rect id="gHit" x="${ml}" y="${mt}" width="${W-ml-mr}" height="${H-mt-mb}" fill="transparent" data-geo="${[W,ml,mr,t0,t1].join(",")}"/></svg>`;
}
function renderGrowth(){
  initG(); const ser=growthSeries(); G._ser=ser;
  const groups=["intern","lead","admin"].map(r=>({r,ps:PEOPLE.filter(p=>p.role===r)}));
  const ids=[...G.people].filter(id=>person(id));
  const rows=(G.mode==="total"&&ids.length?[{name:"Combined",id:null,sum:summaryFor(ids)}]:[]).concat(ids.map(id=>({name:person(id).name,id,sum:summaryFor([id])})));
  const [fi,ti]=rangeISO();
  const evs=S.events.filter(e=>ids.includes(e.pid)&&inArea(e)&&e.at>fi&&e.at<=ti).sort((a,b)=>a.at<b.at?1:-1);
  $("#main").innerHTML = `
   <h2>Growth over time</h2><p class="muted">Skills held over a time frame, from timestamped sign-offs. Pick people and a range; export CSVs for research.</p>
   <div class="card" style="margin-bottom:14px;display:grid;gap:12px">
     <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
       <div class="seg">${[["90d","90 days"],["6m","6 months"],["12m","12 months"],["all","All time"]].map(([k,l])=>`<button class="${G.preset===k?"on":""}" data-preset="${k}">${l}</button>`).join("")}</div>
       <label>From <input type="date" id="gFrom" value="${G.from}"></label>
       <label>To <input type="date" id="gTo" value="${G.to}"></label>
       <label>Area <select id="gArea"><option value="all">All areas</option>${areaList().map(a=>`<option value="${a.id}" ${G.area===a.id?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
       <div class="seg">${[["each","Each person"],["total","Combined total"]].map(([k,l])=>`<button class="${G.mode===k?"on":""}" data-gmode="${k}">${l}</button>`).join("")}</div>
     </div>
     <div>${groups.map(gr=>`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><span class="muted" style="font-size:12px;width:120px">${ROLE_NAME[gr.r]}s</span>
        ${gr.ps.map(p=>{const on=G.people.has(p.id);return `<button class="pchip ${on?"on":""}" data-gp="${p.id}">${on&&G.mode==="each"?`<i style="background:var(--s${G.slot[p.id]})"></i>`:""}${esc(p.name)}${p.active?"":" (inactive)"}</button>`}).join("")}</div>`).join("")}
       <div style="display:flex;gap:6px"><button class="btn small" data-gsel="interns">All interns</button><button class="btn small" data-gsel="clear">Clear</button></div></div>
   </div>
   <div class="card" style="margin-bottom:14px">
     <div class="toolrow"><h3 style="margin:0">Skills held${G.area==="all"?"":" in "+esc(AREAS[G.area].name)}, ${fmt(G.from)} to ${fmt(G.to)}</h3>
       ${G.mode==="each"&&ser.length>=2?`<div class="legend">${ser.map(s=>`<span><i style="background:var(--s${s.slot});border-color:var(--s${s.slot})"></i>${esc(s.name)}</span>`).join("")}</div>`:""}</div>
     ${ser.length?`<div style="position:relative" id="gWrap">${growthChart(ser)}<div id="gTip" class="gtip" hidden></div></div>`:'<div class="empty">Select at least one person.</div>'}
   </div>
   <div class="card" style="margin-bottom:14px;overflow-x:auto">
     <div class="toolrow"><h3 style="margin:0">Summary for this range</h3><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn small" data-act="csvSummary">Download summary CSV</button><button class="btn small" data-act="csvEvents">Download all sign-off events CSV</button></div></div>
     <table><tr><th>Person</th><th>Skills at start</th><th>Skills at end</th><th>Earned in range</th><th>Removed</th><th>Tiers earned</th><th>Last skill earned</th></tr>
     ${rows.map(r=>`<tr><td>${r.id&&G.mode==="each"?`<i class="sw" style="background:var(--s${G.slot[r.id]})"></i>`:""}<b>${esc(r.name)}</b></td><td>${r.sum.start}</td><td>${r.sum.end}</td><td><b>+${r.sum.gained}</b></td><td>${r.sum.removed}</td><td>${r.sum.tiers}</td><td class="muted">${r.sum.last?fmtDT(r.sum.last):"none"}</td></tr>`).join("")}</table></div>
   <div class="card" style="overflow-x:auto"><h3>Sign-offs in this range (${evs.length})</h3>
     ${evs.length?`<table><tr><th>When</th><th>Person</th><th>Skill</th><th>Area</th><th>Tier</th><th>Event</th><th>By</th></tr>${evs.slice(0,60).map(e=>{const sk=SKILLS[e.sid];return `<tr><td class="muted">${fmtDT(e.at)}</td><td>${esc(person(e.pid)?.name||e.pid)}</td><td>${esc(sk?.name||e.sid)}${sk?.retired?' <span class="pill">retired</span>':""}</td><td>${esc(AREAS[sk?.area]?.name||"")}</td><td><span class="pill ${sk?.tier}">${TIER_NAME[sk?.tier]||""}</span></td><td>${e.type==="earned"?(sk?.kind==="cap"?"Earned tier":"Earned"):"Removed"}${e.source==="override"?" (override)":""}</td><td class="muted">${esc(person(e.by)?.name||e.by||"")}</td></tr>`}).join("")}</table>${evs.length>60?`<div class="muted" style="margin-top:6px;font-size:12px">Showing the newest 60. The CSV has all of them.</div>`:""}`:'<div class="muted">No sign-offs in this range.</div>'}</div>`;
  hookGrowthHover();
}
function hookGrowthHover(){
  const hit=$("#gHit"), svg=$("#gSvg"), tip=$("#gTip"), cross=$("#gCross"); if(!hit) return;
  const [W,ml,mr,t0,t1]=hit.dataset.geo.split(",").map(Number);
  const move=ev=>{ const r=svg.getBoundingClientRect(), sx=(ev.clientX-r.left)*W/r.width; const t=t0+(sx-ml)/(W-ml-mr)*(t1-t0); if(t<t0||t>t1) return;
    cross.setAttribute("x1",sx); cross.setAttribute("x2",sx); cross.setAttribute("visibility","visible");
    const vals=G._ser.map(s=>{ let v=s.pts[0].v; s.pts.forEach(p=>{ if(p.t<=t) v=p.v; }); return {s,v}; }).sort((a,b)=>b.v-a.v);
    tip.innerHTML=`<b>${new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</b>`+vals.map(o=>`<div><i style="background:var(--s${o.s.slot})"></i>${esc(o.s.name)} <b>${o.v}</b></div>`).join("");
    tip.hidden=false; const px=ev.clientX-r.left; tip.style.left=Math.min(px+14, r.width-tip.offsetWidth-4)+"px"; tip.style.top="10px"; };
  hit.addEventListener("mousemove",move); hit.addEventListener("mouseleave",()=>{ tip.hidden=true; cross.setAttribute("visibility","hidden"); });
}
function csvCell(v){ v=v==null?"":String(v); return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v; }
function download(name,rows){ const blob=new Blob([rows.map(r=>r.map(csvCell).join(",")).join("\n")],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); }
function csvSummary(){ const ids=[...G.people].filter(id=>person(id));
  download(`nis-skill-growth-summary_${G.from}_to_${G.to}.csv`,[["person_id","name","role","home_area","active","expected_end","range_start","range_end","area_filter","skills_at_start","skills_at_end","earned_in_range","removed_in_range","tiers_earned_in_range","last_skill_earned"],
    ...ids.map(id=>{const p=person(id),m=summaryFor([id]);return [p.id,p.name,p.role,AREAS[p.home]?.name||"",p.active,p.end||"",G.from,G.to,G.area==="all"?"all":AREAS[G.area].name,m.start,m.end,m.gained,m.removed,m.tiers,m.last||""];})]); }
function csvEvents(){ download(`nis-skill-signoff-events_${ymd(today)}.csv`,[["timestamp","person_id","name","role","skill_id","skill_name","area","tier","skill_type","event","approved_by","source"],
    ...S.events.map(e=>{const p=person(e.pid),sk=SKILLS[e.sid];return [e.at,e.pid,p?.name||"",p?.role||"",e.sid,sk?.name||"",AREAS[sk?.area]?.name||"",sk?.tier||"",sk?.kind==="cap"?"capstone":sk?.kind==="req"?"required":"elective",e.type,person(e.by)?.name||e.by||"",e.source];})]); }

/* ============ EVENTS ============ */
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),3200);}
let busy=false;
/* Run a change through the data layer (demo or live), reload shared data in live mode, then redraw. */
async function run(fn, okMsg){
  if(busy) return; busy=true; document.body.classList.add("busy");
  try{ const out=await fn(); if(LIVE) await API.loadAll(); if(okMsg) toast(typeof okMsg==="function"?okMsg(out):okMsg); return out; }
  catch(err){ toast(err?.message||String(err)); }
  finally{ busy=false; document.body.classList.remove("busy"); renderUserSel(); render(); }
}
/* Friendly message after someone gains a skill */
function celebrate(pid,sid,before){
  const sk=SKILLS[sid], p=person(pid); if(!sk||!p||!has(pid,sid)) return null;
  const after=progress(pid,sk.area,sk.tier);
  if(sk.kind==="cap") return `Level up! ${p.name} earned ${AREAS[sk.area].name} ${TIER_NAME[sk.tier]}`;
  if(!before.unlocked && after.unlocked && !after.earned) return `${p.name} unlocked the ${AREAS[sk.area].name} ${TIER_NAME[sk.tier]} capstone`;
  return `${p.name} is now certified: ${sk.name}`;
}
const steps = txt=>txt.split("\n").map(x=>x.trim()).filter(Boolean);

document.addEventListener("click",e=>{
  const v=e.target.closest("[data-view]"); if(v){S.view=v.dataset.view;closeDrawer();render();return;}
  const ar=e.target.closest("[data-area]"); if(ar){S.area=ar.dataset.area;closeDrawer();renderTree();return;}
  const nd=e.target.closest(".node"); if(nd){S.selected=nd.dataset.sid;renderTree();renderDrawer();return;}
  const op=e.target.closest("[data-open]"); if(op){e.preventDefault();const sk=SKILLS[op.dataset.open]; if(!sk) return; S.selected=sk.id;S.area=sk.area;render();return;}
  const gp=e.target.closest("[data-gp]"); if(gp){ const id=gp.dataset.gp; G.people.has(id)?unselectPerson(id):selectPerson(id); return renderGrowth(); }
  const pr=e.target.closest("[data-preset]"); if(pr){ setPreset(pr.dataset.preset); return renderGrowth(); }
  const gm=e.target.closest("[data-gmode]"); if(gm){ G.mode=gm.dataset.gmode; if(G.mode==="each"){ [...G.people].slice(MAX_SERIES).forEach(unselectPerson); [...G.people].forEach(id=>{ if(!G.slot[id]){ const used=new Set(Object.values(G.slot)); for(let i=1;i<=MAX_SERIES;i++) if(!used.has(i)){G.slot[id]=i;break;} } }); } return renderGrowth(); }
  const gs=e.target.closest("[data-gsel]"); if(gs){ [...G.people].forEach(unselectPerson); if(gs.dataset.gsel==="interns"){ const ins=PEOPLE.filter(p=>p.role==="intern"&&p.active); if(G.mode==="each"&&ins.length>MAX_SERIES){ G.mode="total"; toast("Switched to Combined total to include every intern"); } ins.forEach(p=>selectPerson(p.id)); } return renderGrowth(); }
  const b=e.target.closest("[data-act]"); if(!b) return;
  if(b.tagName==="INPUT") return;
  const u=me(), act=b.dataset.act, sid=S.selected;

  // account
  if(act==="signout") return API.signOut();
  if(act==="pwForm") return renderChangePassword(false);

  // simple UI toggles
  if(act==="close") return closeDrawer();
  if(act==="toggleEdit"){ S.edit=!S.edit; S.coverage=false; closeDrawer(); return; }
  if(act==="csvSummary") return csvSummary();
  if(act==="csvEvents") return csvEvents();

  // learners
  if(act==="request") return run(()=>API.requestSignoff(sid), `Request sent to ${leadName(SKILLS[sid].area)}`);
  if(act==="withdraw") return run(()=>API.withdraw(+b.dataset.id), "Request withdrawn");

  // reviewers
  if(act==="approve"||act==="return"){ const r=S.requests.find(x=>x.id==+b.dataset.id); if(!r) return; const note=($("#note"+r.id)?.value||"").trim();
    const before=progress(r.pid,SKILLS[r.sid].area,SKILLS[r.sid].tier);
    return run(()=>API.review(r.id, act==="approve", note), ()=> act==="approve" ? celebrate(r.pid,r.sid,before) : `Returned to ${person(r.pid).name}`); }

  // admin overrides
  const grantOne=(p,s)=>{ const before=progress(p,SKILLS[s].area,SKILLS[s].tier); return run(()=>API.grant(p,s), ()=>celebrate(p,s,before)); };
  if(act==="grant"){ const p=$("#grantSel").value; if(p) return grantOne(p,sid); return; }
  if(act==="remove"){ const p=b.dataset.p; return run(()=>API.revoke(p,sid), `Removed from ${person(p).name}`); }
  if(act==="ovGrant"){ const p=$("#ovP").value,s=$("#ovS").value; if(has(p,s)) return toast("Already held"); return grantOne(p,s); }
  if(act==="ovRemove"){ const p=$("#ovP").value,s=$("#ovS").value; if(!has(p,s)) return toast("Not held"); return run(()=>API.revoke(p,s), "Removed"); }
  if(act==="ovTier"){ const p=$("#ovP").value, sk=SKILLS[$("#ovS").value]; return run(()=>API.grantTier(p,sk.area,sk.tier), `Granted all of ${AREAS[sk.area].name} ${TIER_NAME[sk.tier]}`); }
  if(act==="resetPw"){ const p=person(b.dataset.p); if(!confirmInline(b,`Reset ${p.name}?`)) return; return run(()=>API.resetPassword(p.id), `${p.name} can sign in with the starter password again`); }

  // tree editing
  if(act==="add"){ const t=b.dataset.tier, kind=b.dataset.kind;
    return run(()=>API.addSkill(S.area,t,kind)).then(id=>{ if(!id) return; S.selected=id; renderTree(); renderDrawer(); setTimeout(()=>{const n=$("#eName");n&&(n.focus(),n.select());},50); }); }
  if(act==="saveSkill"){ const sk=SKILLS[sid]; const f={name:$("#eName").value.trim()||sk.name, desc:$("#eDesc").value.trim(), steps:steps($("#eSteps").value), time:$("#eTime").value.trim(), kind:$("#eKind")?.value||sk.kind, tier:$("#eTier")?.value||sk.tier};
    closeDrawer(); return run(()=>API.saveSkill(sid,f), "Saved. Everyone's records now show the update."); }
  if(act==="retire"){ const n=PEOPLE.filter(p=>has(p.id,sid)).length; closeDrawer(); return run(()=>API.setRetired(sid,true), `Retired. Kept on ${n} ${n===1?"person's record":"people's records"}.`); }
  if(act==="restore") return run(()=>API.setRetired(b.dataset.sid,false), "Restored to the tree");
  if(act==="saveArea") return run(()=>API.saveArea(S.area, $("#areaName").value.trim(), $("#areaLead").value), "Area saved");
  if(act==="addArea"){ closeDrawer(); return run(()=>API.saveArea(null,"New area",u.id)).then(id=>{ if(id){ S.area=id; render(); toast("New area added. Rename it and add skills."); } }); }

  // people
  if(act==="addPerson"){ const name=$("#npName").value.trim(); const username=($("#npUser")?.value||"").trim(); if(!name) return toast("Enter a name first"); if(LIVE&&!username) return toast("Enter their NIS username");
    return run(()=>API.addPerson({name,username,role:$("#npRole").value,home:$("#npHome").value}), `${name} added`); }
});
/* Two-click confirm on a button, no pop-up dialogs */
function confirmInline(b,label){ if(b.dataset.armed){ return true; } b.dataset.armed="1"; const old=b.textContent; b.textContent=label+" Click again"; setTimeout(()=>{ delete b.dataset.armed; b.textContent=old; },3000); return false; }

document.addEventListener("change",e=>{
  const t=e.target;
  if(t.id==="userSel"){ S.user=t.value; const u=me(); S.area=u.home||S.area; closeDrawer(); render(); toast(`Now viewing as ${u.name} (${ROLE_NAME[u.role]})`); }
  if(t.id==="covT"){ S.coverage=t.checked; renderTree(); }
  if(t.id==="gFrom"||t.id==="gTo"){ G[t.id==="gFrom"?"from":"to"]=t.value; G.preset=null; if(G.from>G.to){ const x=G.from; G.from=G.to; G.to=x; } renderGrowth(); }
  if(t.id==="gArea"){ G.area=t.value; renderGrowth(); }
  if(t.id==="covArea"){ covArea=t.value; renderAdmin(); }
  if(t.id==="ovA") fillOvSkills();
  if(t.dataset.act==="interest") return run(()=>API.setInterest(S.selected,t.checked));
  if(t.dataset.rule) return run(()=>API.setRule(S.area,t.dataset.rule,Math.max(0,parseInt(t.value)||0)));
  const pid=t.dataset.pname||t.dataset.prole||t.dataset.phome||t.dataset.pactive||t.dataset.end;
  if(pid){ const p=person(pid); const f={name:p.name,role:p.role,home:p.home,end:p.end,active:p.active};
    if(t.dataset.pname) f.name=t.value.trim()||p.name;
    if(t.dataset.prole) f.role=t.value;
    if(t.dataset.phome) f.home=t.value;
    if(t.dataset.pactive) f.active=t.checked;
    if(t.dataset.end) f.end=t.value||null;
    return run(()=>API.updatePerson(pid,f), "Saved");
  }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeDrawer(); if((e.key==="Enter"||e.key===" ")&&e.target.classList?.contains("node")){e.preventDefault();e.target.dispatchEvent(new MouseEvent("click",{bubbles:true}));} });
