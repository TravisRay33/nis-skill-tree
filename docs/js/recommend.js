/* NIS Skill Tree: "Suggested next skills" on My profile. Loads after app.js.
   Three lenses, each shown as its own column so the reason for a pick stays visible:
   1. Increase expertise: finish a level you have already started (horizontal growth).
   2. From your list: skills you marked "I want to learn this".
   3. Studio needs: skills few people hold, at a level that fits where you are.
   Each lens shows its top pick plus up to two alternates. The three top picks never repeat. */

/* Tuning knobs */
const REC = {
  COVERED: 3,            // a skill with this many holders who are staying counts as covered
  NEED_WEIGHT: [30,20,10], // studio-needs weight for 0, 1, 2 staying holders
  PER_LENS: 3            // top pick + alternates per lens
};

const recTierIdx = t=>TIERS.indexOf(t);
function recTierStarted(pid,area,tier){ const T=AREAS[area].tiers[tier]; return [...live(T.req),...live(T.el)].some(s=>has(pid,s)); }
function recAreaStarted(pid,area){ return TIERS.some(t=>recTierStarted(pid,area,t)||has(pid,AREAS[area].tiers[t].cap)); }
function recCapsEarned(pid,area){ return TIERS.filter(t=>has(pid,AREAS[area].tiers[t].cap)).length; }
function recLevel(sk){ return `${AREAS[sk.area].name} ${TIER_NAME[sk.tier]}`; }
function recAsk(sk,pid){
  const st=areaStaff(sk.area).filter(p=>p.id!==pid);
  return st.length ? `Ask: ${st.map(p=>p.name).join(", ")}` : "Ask any NIS staff member.";
}

/* Skills this person could work on now: not held, not already requested, not retired,
   and capstones only once they are unlocked. */
function recCandidates(pid){
  return liveSkills().filter(sk=>!has(pid,sk.id) && !pendingReq(pid,sk.id) &&
    (sk.kind!=="cap" || progress(pid,sk.area,sk.tier).unlocked));
}

/* 1. Increase expertise */
function recExpertise(pid,cands){
  const out=[];
  cands.forEach(sk=>{
    const p=progress(pid,sk.area,sk.tier); if(p.earned) return;
    const total=p.reqN+p.elN, done=p.r+p.e;
    if(sk.kind==="cap"){ out.push({sk,score:100,why:`Every skill for ${recLevel(sk)} is done. This capstone earns the level.`}); return; }
    if(!recTierStarted(pid,sk.area,sk.tier)) return;
    if(sk.kind==="el" && p.e>=p.elN) return;          // electives for this level already covered
    const left=Math.max(1,total-done);
    out.push({sk,score:50+(total?done/total*40:0)+(sk.kind==="req"?5:0),
      why:`You're ${done} of ${total} toward the ${recLevel(sk)} capstone. ${left} to go.`});
  });
  if(out.length) return out;
  // Nothing in progress: step up a tier in an area where they have earned a level
  cands.forEach(sk=>{
    if(sk.kind!=="req") return;
    const earned=recCapsEarned(pid,sk.area);
    if(earned>0 && recTierIdx(sk.tier)===earned)
      out.push({sk,score:30,why:`You've earned ${AREAS[sk.area].name} ${TIER_NAME[TIERS[earned-1]]}. This starts ${TIER_NAME[sk.tier]}.`});
  });
  if(out.length) return out;
  // Brand new: required Bronze skills in their home area
  const home=person(pid)?.home;
  cands.forEach(sk=>{ if(sk.area===home && sk.tier==="bronze" && sk.kind==="req")
    out.push({sk,score:10,why:`A good first skill in your home area, ${AREAS[home].name}.`}); });
  return out;
}

/* 2. From your list */
function recWishlist(pid,cands){
  const ok=new Set(cands.map(s=>s.id)), out=[];
  [...S.interests].filter(k=>k.startsWith(pid+"|")).map(k=>SKILLS[k.slice(pid.length+1)]).forEach(sk=>{
    if(!sk || !ok.has(sk.id)) return;
    const p=progress(pid,sk.area,sk.tier), started=recTierStarted(pid,sk.area,sk.tier);
    const total=p.reqN+p.elN, teach=holders(sk.id).filter(x=>x.id!==pid).length;  // someone to learn from
    out.push({sk,score:(started?20:0)+(total?(p.r+p.e)/total*20:0)+(teach?10:0)+(sk.kind==="req"?3:0)-recTierIdx(sk.tier),
      why: started ? `On your list, and you've already started ${recLevel(sk)}.` : `On your list. It counts toward ${recLevel(sk)}.`});
  });
  return out;
}

/* 3. Studio needs */
function recStudioNeeds(pid,cands){
  const home=person(pid)?.home, out=[];
  cands.forEach(sk=>{
    if(sk.kind==="cap") return;
    const stay=holdersAfter(sk.id).length, all=holders(sk.id).length;
    if(stay>=REC.COVERED) return;
    // fit: Bronze is open to anyone; higher tiers once you've earned the tier below or started this one
    const ti=recTierIdx(sk.tier);
    if(!(ti===0 || ti<=recCapsEarned(pid,sk.area) || recTierStarted(pid,sk.area,sk.tier))) return;
    const why = all===0 ? "No one at NIS has this skill. Learning it fills a gap."
      : stay===0 ? `Everyone who holds this leaves within ${RISK_DAYS} days.`
      : `Only ${stay} ${stay===1?"person":"people"} can do this${all>stay?`, and ${all-stay} more leave soon`:""}.`;
    out.push({sk,score:REC.NEED_WEIGHT[stay]+(sk.area===home?4:0)+(recAreaStarted(pid,sk.area)?3:0)+(sk.kind==="req"?2:0)-ti*2,why});
  });
  return out;
}

function recommend(pid){
  const c=recCandidates(pid);
  const pend=S.requests.filter(r=>r.pid===pid&&r.status==="requested"&&SKILLS[r.sid]).length;
  const lenses=[
    {title:"Increase expertise", list:recExpertise(pid,c),
     empty: pend ? `You have ${pend} sign-off${pend===1?"":"s"} waiting. Once approved, your next step shows up here.`
                 : "You've finished every level you started. Pick something new on the Skills tab."},
    {title:"From your list", list:recWishlist(pid,c),
     empty:'Your list is empty. Turn on "I want to learn this" on any skill and it shows up here.'},
    {title:"Studio needs", list:recStudioNeeds(pid,c),
     empty:"Every skill at your levels already has good coverage."}
  ];
  const used=new Set();
  lenses.forEach(L=>{
    L.list.sort((a,b)=>b.score-a.score || recTierIdx(a.sk.tier)-recTierIdx(b.sk.tier) || a.sk.name.localeCompare(b.sk.name));
    L.picks=L.list.filter(x=>!used.has(x.sk.id)).slice(0,REC.PER_LENS);
    if(L.picks[0]) used.add(L.picks[0].sk.id);
  });
  return lenses;
}

function recLensHTML(L,pid){
  const top=L.picks[0];
  if(!top) return `<div class="reclens"><div class="reck">${esc(L.title)}</div><div class="muted" style="font-size:13px">${esc(L.empty)}</div></div>`;
  const sk=top.sk, kind=sk.kind==="req"?"Required":sk.kind==="el"?"Elective":"Capstone";
  return `<div class="reclens" style="${acVars(sk.area)}">
    <div class="reck">${esc(L.title)}</div>
    <a href="#" class="recpick" data-open="${sk.id}"><span class="recname">${esc(sk.name)}</span>
      <span class="recmeta"><span class="pill ${sk.tier}">${TIER_NAME[sk.tier]}</span><span class="recarea">${esc(AREAS[sk.area].name)}</span> · ${kind}</span></a>
    <div class="recwhy">${esc(top.why)}</div>
    <div class="muted" style="font-size:12px">${esc(recAsk(sk,pid))}</div>
    ${L.picks.length>1?`<div class="recalso">Also: ${L.picks.slice(1).map(x=>`<a href="#" data-open="${x.sk.id}">${esc(x.sk.name)}</a>`).join(" · ")}</div>`:""}
  </div>`;
}
function recCardHTML(pid){
  return `<div class="card noprint" style="margin-bottom:18px">
    <div class="toolrow"><h3 style="margin:0">Suggested next skills</h3><span class="muted" style="font-size:12px">Three ways to grow. Click a skill to see its steps and request sign-off.</span></div>
    <div class="recgrid">${recommend(pid).map(L=>recLensHTML(L,pid)).join("")}</div></div>`;
}
