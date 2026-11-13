/* NIS Skill Tree: sample data (areas, tiers, skills, people). Replace with real NIS content. */
/* ============ SAMPLE DATA ============ */
const TIERS = ["bronze","silver","gold"];
const TIER_NAME = {bronze:"Bronze",silver:"Silver",gold:"Gold"};
const TIER_FOCUS = {
  bronze:"Regular maintenance, capped by teaching the entry-level SOP",
  silver:"Advanced operation, troubleshooting and maintenance, capped by running an advanced training or workshop",
  gold:"Advanced, difficult or rare maintenance and troubleshooting, capped by developing a new workshop or curriculum"
};
const RULE = {required:2, electivesNeeded:2};

const AREA_DEFS = [
 {id:"wood",name:"Woodshop",lead:"dana",t:{
  bronze:{req:["Table saw blade change & alignment check","Dust collection: empty & clean filters"],el:["Bandsaw blade change & tracking","Sharpen chisels & plane irons","Wax & clean cast-iron tops","Planer & jointer knife inspection"],cap:"Teach the Woodshop Safety SOP"},
  silver:{req:["SawStop brake cartridge replacement","ShopBot CNC: run a job & zero tools"],el:["Jointer & planer knife replacement","Lathe tool rest & tailstock troubleshooting","Router table setup for joinery","Diagnose tear-out & burn marks"],cap:"Lead an advanced woodshop workshop"},
  gold:{req:["Table saw trunnion & arbor alignment","ShopBot gantry squaring & spindle service"],el:["Dust collector impeller service","Bandsaw tire replacement","CNC toolpath & post-processor troubleshooting","Planer feed roller repair"],cap:"Develop a new woodshop workshop"}}},
 {id:"metal",name:"Metalshop",lead:"dana",t:{
  bronze:{req:["MIG welder: wire & contact tip change","Grinder wheel inspection & replacement"],el:["Gas cylinder change & leak check","Horizontal bandsaw blade change","Welding bay cleanup & organization","Drill press belt & chuck care"],cap:"Teach the Metalshop Safety SOP"},
  silver:{req:["TIG setup: tungsten prep & gas","Plasma cutter consumables & cut quality"],el:["Metal lathe threading setup","Tram the mill head","Troubleshoot MIG porosity & bird-nesting","Sheet metal brake & shear setup"],cap:"Lead an advanced metalshop workshop"},
  gold:{req:["CNC plasma table calibration","Mill & lathe gib and backlash adjustment"],el:["MIG drive roll & liner rebuild","Plasma torch lead replacement","Coolant system service","Diagnose welder electrical faults"],cap:"Develop a new metalshop workshop"}}},
 {id:"rp",name:"3D Printing & Scanning",lead:"priya",t:{
  bronze:{req:["3D printer nozzle change & bed leveling","Build plate cleaning & first-layer check"],el:["Filament loading, drying & storage","Print failure triage (warping, spaghetti)","3D scanner calibration & first scan","Resin handling, washing & curing"],cap:"Teach the 3D Printing & Scanning SOP"},
  silver:{req:["Resin printer tank & build plate care","Scan to printable mesh (cleanup & repair)"],el:["Slicer profile tuning","Soluble support & multi-material prints","Clear extruder clogs & heat creep","Photogrammetry capture & processing"],cap:"Lead an advanced 3D printing & scanning workshop"},
  gold:{req:["3D printer hotend & mainboard replacement","Bed probe & leveling sensor replacement"],el:["Firmware update & recalibration","Printer motion system repair","Resin printer LCD & FEP replacement","Scanner hardware calibration & troubleshooting"],cap:"Develop a new 3D printing & scanning workshop"}}},
 {id:"laser",name:"Laser Engraving",lead:"priya",t:{
  bronze:{req:["Laser lens & mirror cleaning","Job setup: focus, material settings & air assist"],el:["Laser exhaust filter check","Material safety check (what can't be lasered)","Honeycomb bed & crumb tray cleaning","Rotary attachment setup"],cap:"Teach the Laser Engraving SOP"},
  silver:{req:["Laser mirror alignment","Air assist & exhaust fan service"],el:["Laser focus & power/speed test grids","Photo & grayscale raster engraving","Cut kerf & joint-fit tuning","Fiber laser marking on metal"],cap:"Lead an advanced laser engraving workshop"},
  gold:{req:["Laser tube replacement & alignment","Laser power supply troubleshooting"],el:["Laser chiller service","Motion system & belt tensioning","Fiber laser lens & galvo calibration","Laser software & driver troubleshooting"],cap:"Develop a new laser engraving workshop"}}},
 {id:"elec",name:"Electronics & Robotics",lead:"diego",t:{
  bronze:{req:["Soldering station setup, tip care & fume extraction","Multimeter basics: voltage, continuity & resistance"],el:["Through-hole soldering kit build","Bench power supply safe use","ESD-safe handling","Component storage & inventory"],cap:"Teach the Electronics Bench SOP"},
  silver:{req:["Surface-mount soldering & rework","Microcontroller programming (Arduino)"],el:["Oscilloscope measurements","Sensor & motor wiring","Robot arm: teach & run a program","Desolder & repair a circuit board"],cap:"Lead an advanced electronics & robotics workshop"},
  gold:{req:["Robot arm calibration & safety system checks","PCB design to fabricated board"],el:["Embedded systems debugging","End-effector design & integration","Motor driver & power electronics troubleshooting","Bench equipment calibration"],cap:"Develop a new electronics & robotics workshop"}}},
 {id:"cer",name:"Ceramics",lead:"hannah",t:{
  bronze:{req:["Wheel & splash pan cleaning","Reclaim clay processing"],el:["Glaze bucket mixing & labeling","Kiln shelf scraping & kiln wash","Clay trap cleaning","Wedging & clay storage"],cap:"Teach the Ceramics Studio SOP"},
  silver:{req:["Load & fire a bisque kiln","Load & fire a glaze kiln"],el:["Slab roller setup & care","Pug mill operation","Troubleshoot crawling & pinholes","Mix a glaze from a recipe"],cap:"Lead an advanced ceramics workshop"},
  gold:{req:["Kiln element replacement","Thermocouple & controller troubleshooting"],el:["Wheel motor & pedal repair","Kiln relay replacement","Formulate & test a new glaze","Pug mill rebuild"],cap:"Develop a new ceramics workshop"}}},
 {id:"des",name:"Design",lead:"sam",t:{
  bronze:{req:["Large-format printer paper & ink change","Design lab workstation checks"],el:["Export files for laser & vinyl","Monitor color calibration","Flatbed scanning","Printhead cleaning & nozzle check","Vinyl cutter blade change"],cap:"Teach the Design Lab SOP"},
  silver:{req:["Fusion 360 CAD for fabrication","Illustrator cut-file preparation"],el:["Large-format ICC color profiles","3D scanning & mesh cleanup","Vector tracing & file repair","Sublimation & heat press setup"],cap:"Lead an advanced design workshop"},
  gold:{req:["Printhead replacement & alignment","Fusion CAM toolpaths for the CNC"],el:["Printer RIP software troubleshooting","Parametric & generative modeling","Workstation imaging & software deployment","Diagnose print banding & color shifts"],cap:"Develop a new design workshop"}}},
 {id:"tex",name:"Textiles",lead:"sam",t:{
  bronze:{req:["Threading, bobbin & needle change","Clean & oil sewing machines"],el:["Serger threading","Iron & pressing station care","Embroidery machine hooping","Cutting table & fabric storage setup"],cap:"Teach the Textiles SOP"},
  silver:{req:["Sewing machine tension troubleshooting","Embroidery digitizing basics"],el:["Serger differential feed setup","Industrial machine operation","Pattern drafting & grading","Fix skipped stitches & thread nests"],cap:"Lead an advanced textiles workshop"},
  gold:{req:["Sewing machine timing adjustment","Embroidery hook & timing repair"],el:["Serger looper timing","Motor & foot pedal repair","Industrial feed dog adjustment","Complex & 3D puff digitizing"],cap:"Develop a new textiles workshop"}}}
];

const PEOPLE = [
 {id:"travis",name:"Travis Ray",role:"admin",home:"rp",end:null},
 {id:"dana",name:"Dana Whitfield",role:"admin",home:"wood",end:null},
 {id:"priya",name:"Priya Nair",role:"admin",home:"rp",end:null},
 {id:"diego",name:"Diego Ramos",role:"admin",home:"elec",end:null},
 {id:"hannah",name:"Hannah Lindqvist",role:"admin",home:"cer",end:null},
 {id:"sam",name:"Sam Okafor",role:"admin",home:"des",end:null},
 {id:"jordan",name:"Jordan Kim",role:"intern",home:"wood",end:"2026-12-18"},
 {id:"alexis",name:"Alexis Rivera",role:"intern",home:"laser",end:"2027-05-14"},
 {id:"ben",name:"Ben Thompson",role:"intern",home:"metal",end:"2026-12-18"},
 {id:"maya",name:"Maya Patel",role:"intern",home:"tex",end:"2027-12-17"},
 {id:"chris",name:"Chris Nguyen",role:"intern",home:"wood",end:"2028-05-12"},
 {id:"taylor",name:"Taylor Brooks",role:"intern",home:"cer",end:"2027-05-14"},
 {id:"riley",name:"Riley Johnson",role:"intern",home:"des",end:"2027-12-17"},
 {id:"avery",name:"Avery Chen",role:"intern",home:"elec",end:"2028-05-12"}
];
PEOPLE.forEach(p=>p.active=true);
/* Two roles: Staff (stored as "admin": full access) and Intern. Each staff member is the primary
   contact for an area or two (areas[].lead = that area's primary staff member). */
const ROLE_NAME = {admin:"Staff",intern:"Intern"};
const RISK_DAYS = 120;

/* ============ AREA COLOURS ============
   One colour per shop area, used everywhere (Skill tree tab, profile web, header rule, badges).
   Defaults are the UNL web framework accent colours plus the Nebraska Innovation Campus cool grey.
   Scarlet (#d00000) is kept out on purpose: in the UNL framework it means "click this". */
const AREA_PALETTE = [
  {hex:"#f58a1f",name:"UNL orange"},{hex:"#616265",name:"NIC cool grey"},{hex:"#ffd74e",name:"UNL yellow"},
  {hex:"#00784e",name:"UNL green"},{hex:"#007197",name:"UNL blue"},{hex:"#b32d9c",name:"UNL magenta"},
  {hex:"#5b3f8f",name:"Purple"},{hex:"#0a9396",name:"Teal"},{hex:"#8a5a2b",name:"Brown"}];
const DEFAULT_AREA_COLOR = {wood:"#f58a1f",metal:"#616265",rp:"#ffd74e",laser:"#5b3f8f",elec:"#0a9396",cer:"#00784e",des:"#007197",tex:"#b32d9c"};
function hexRgb(h){h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function rgbHex(r){return "#"+r.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");}
function lum(h){return hexRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function mix(a,b,p){const A=hexRgb(a),B=hexRgb(b);return rgbHex(A.map((v,i)=>v+(B[i]-v)*p));}
/* text colour that stays readable on a given background (4.5:1) */
function inkOn(c,bg){let x=c;for(let i=0;i<20&&contrast(x,bg)<4.5;i++) x=mix(x,lum(bg)>.5?"#000000":"#ffffff",.12);return x;}
function areaColor(id){return AREAS[id]?.color||DEFAULT_AREA_COLOR[id]||"#616265";}
function applyAreaColors(){
  const L=[],D=[];
  Object.values(AREAS).forEach(a=>{const c=areaColor(a.id), on=contrast(c,"#ffffff")>=contrast(c,"#232323")?"#ffffff":"#232323";
    L.push(`--a-${a.id}:${c};--a-${a.id}-on:${on};--a-${a.id}-ink:${inkOn(c,"#ffffff")};--a-${a.id}-tint:${mix(c,"#ffffff",.9)};--a-${a.id}-line:${contrast(c,"#ffffff")<1.6?mix(c,"#000000",.25):c}`);
    D.push(`--a-${a.id}-ink:${inkOn(c,"#2e2e2d")};--a-${a.id}-tint:${mix(c,"#2e2e2d",.82)};--a-${a.id}-line:${contrast(c,"#2e2e2d")<1.6?mix(c,"#ffffff",.3):c}`);});
  let st=document.getElementById("areaColors"); if(!st){st=document.createElement("style");st.id="areaColors";document.head.appendChild(st);}
  st.textContent=`:root{${L.join(";")}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${D.join(";")}}}:root[data-theme="dark"]{${D.join(";")}}`;
  const rule=document.getElementById("arearule"); if(rule) rule.innerHTML=Object.values(AREAS).map(a=>`<span style="background:var(--a-${a.id})"></span>`).join("");
}
const acVars = id=>`--ac:var(--a-${id});--ac-on:var(--a-${id}-on);--ac-ink:var(--a-${id}-ink);--ac-tint:var(--a-${id}-tint);--ac-line:var(--a-${id}-line)`;

/* build skills */
const SKILLS = {}; const AREAS = {};
AREA_DEFS.forEach(a=>{
  AREAS[a.id] = {id:a.id,name:a.name,lead:a.lead,color:DEFAULT_AREA_COLOR[a.id],tiers:{},rules:{bronze:{el:2},silver:{el:2},gold:{el:2}}};
  TIERS.forEach(t=>{
    const d=a.t[t]; const ids={req:[],el:[],cap:null};
    d.req.forEach((n,i)=>{const id=`${a.id}-${t}-r${i+1}`;SKILLS[id]=mk(id,a,t,"req",n);ids.req.push(id);});
    d.el.forEach((n,i)=>{const id=`${a.id}-${t}-e${i+1}`;SKILLS[id]=mk(id,a,t,"el",n);ids.el.push(id);});
    const cid=`${a.id}-${t}-cap`;SKILLS[cid]=mk(cid,a,t,"cap",d.cap);ids.cap=cid;
    AREAS[a.id].tiers[t]=ids;
  });
});
function mk(id,a,t,kind,name){
  const mins = {bronze:[30,60,90],silver:[90,120,180],gold:[180,240,360]}[t];
  const time = kind==="cap" ? {bronze:"2 to 4 hours of prep plus one session",silver:"1 to 2 weeks of prep plus one session",gold:"A semester project"}[t] : `About ${mins[(id.charCodeAt(id.length-1))%3]/60>=1? (mins[(id.charCodeAt(id.length-1))%3]/60)+" hr":mins[(id.charCodeAt(id.length-1))%3]+" min"}`;
  let desc, steps;
  if(kind==="cap"){
    desc = {bronze:`Capstone for ${a.name} Bronze. Teach the entry-level ${a.name} SOP to members on your own, with a staff member observing.`,
            silver:`Capstone for ${a.name} Silver. Plan and run an advanced training or workshop in ${a.name}.`,
            gold:`Capstone for ${a.name} Gold. Design a new workshop, training or curriculum for ${a.name} that NIS can keep offering.`}[t];
    steps = {bronze:["Co-teach the SOP with a Bronze holder at least once","Review the SOP slides and checklist","Teach a full session with a staff member observing","Request sign-off"],
             silver:["Pick a topic with the primary staff member","Draft an outline and materials list","Run the workshop with a staff member present","Collect participant feedback and request sign-off"],
             gold:["Propose a workshop idea and learning goals","Draft the curriculum, materials and safety notes","Pilot it with staff or interns","Revise, hand off documentation, and request sign-off"]}[t];
  } else {
    desc = `${TIER_NAME[t]} ${kind==="req"?"required":"elective"} skill in ${a.name}: ${name.toLowerCase()}. Sample description; replace with the NIS procedure.`;
    steps = ["Read the NIS procedure for this task","Watch a certified holder do it","Do it yourself with a holder watching","Request sign-off from staff"];
  }
  return {id,area:a.id,tier:t,kind,name,desc,steps,time};
}

