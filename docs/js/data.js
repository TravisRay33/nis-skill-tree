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
 {id:"metal",name:"Metalshop",lead:"marcus",t:{
  bronze:{req:["MIG welder: wire & contact tip change","Grinder wheel inspection & replacement"],el:["Gas cylinder change & leak check","Horizontal bandsaw blade change","Welding bay cleanup & organization","Drill press belt & chuck care"],cap:"Teach the Metalshop Safety SOP"},
  silver:{req:["TIG setup: tungsten prep & gas","Plasma cutter consumables & cut quality"],el:["Metal lathe threading setup","Tram the mill head","Troubleshoot MIG porosity & bird-nesting","Sheet metal brake & shear setup"],cap:"Lead an advanced metalshop workshop"},
  gold:{req:["CNC plasma table calibration","Mill & lathe gib and backlash adjustment"],el:["MIG drive roll & liner rebuild","Plasma torch lead replacement","Coolant system service","Diagnose welder electrical faults"],cap:"Develop a new metalshop workshop"}}},
 {id:"rp",name:"Rapid Prototyping",lead:"priya",t:{
  bronze:{req:["3D printer nozzle change & bed leveling","Laser lens & mirror cleaning"],el:["Filament loading, drying & storage","Laser exhaust filter check","Vinyl cutter blade change","Print failure triage (warping, spaghetti)"],cap:"Teach the 3D Print & Laser SOP"},
  silver:{req:["Laser mirror alignment","Resin printer tank & build plate care"],el:["Slicer profile tuning","Soluble support & multi-material prints","Laser focus & power/speed test grids","Clear extruder clogs & heat creep"],cap:"Lead an advanced rapid prototyping workshop"},
  gold:{req:["Laser tube replacement & alignment","3D printer hotend & mainboard replacement"],el:["Firmware update & recalibration","Laser chiller service","Printer motion system repair","Resin printer LCD & FEP replacement"],cap:"Develop a new rapid prototyping workshop"}}},
 {id:"cer",name:"Ceramics",lead:"hannah",t:{
  bronze:{req:["Wheel & splash pan cleaning","Reclaim clay processing"],el:["Glaze bucket mixing & labeling","Kiln shelf scraping & kiln wash","Clay trap cleaning","Wedging & clay storage"],cap:"Teach the Ceramics Studio SOP"},
  silver:{req:["Load & fire a bisque kiln","Load & fire a glaze kiln"],el:["Slab roller setup & care","Pug mill operation","Troubleshoot crawling & pinholes","Mix a glaze from a recipe"],cap:"Lead an advanced ceramics workshop"},
  gold:{req:["Kiln element replacement","Thermocouple & controller troubleshooting"],el:["Wheel motor & pedal repair","Kiln relay replacement","Formulate & test a new glaze","Pug mill rebuild"],cap:"Develop a new ceramics workshop"}}},
 {id:"des",name:"Design",lead:"sam",t:{
  bronze:{req:["Large-format printer paper & ink change","Design lab workstation checks"],el:["Export files for laser & vinyl","Monitor color calibration","Flatbed scanning","Printhead cleaning & nozzle check"],cap:"Teach the Design Lab SOP"},
  silver:{req:["Fusion 360 CAD for fabrication","Illustrator cut-file preparation"],el:["Large-format ICC color profiles","3D scanning & mesh cleanup","Vector tracing & file repair","Sublimation & heat press setup"],cap:"Lead an advanced design workshop"},
  gold:{req:["Printhead replacement & alignment","Fusion CAM toolpaths for the CNC"],el:["Printer RIP software troubleshooting","Parametric & generative modeling","Workstation imaging & software deployment","Diagnose print banding & color shifts"],cap:"Develop a new design workshop"}}},
 {id:"tex",name:"Textiles",lead:"ellie",t:{
  bronze:{req:["Threading, bobbin & needle change","Clean & oil sewing machines"],el:["Serger threading","Iron & pressing station care","Embroidery machine hooping","Cutting table & fabric storage setup"],cap:"Teach the Textiles SOP"},
  silver:{req:["Sewing machine tension troubleshooting","Embroidery digitizing basics"],el:["Serger differential feed setup","Industrial machine operation","Pattern drafting & grading","Fix skipped stitches & thread nests"],cap:"Lead an advanced textiles workshop"},
  gold:{req:["Sewing machine timing adjustment","Embroidery hook & timing repair"],el:["Serger looper timing","Motor & foot pedal repair","Industrial feed dog adjustment","Complex & 3D puff digitizing"],cap:"Develop a new textiles workshop"}}}
];

const PEOPLE = [
 {id:"travis",name:"Travis Ray",role:"admin",home:"rp",end:null},
 {id:"dana",name:"Dana Whitfield",role:"lead",home:"wood",end:null},
 {id:"marcus",name:"Marcus Ortega",role:"lead",home:"metal",end:null},
 {id:"priya",name:"Priya Nair",role:"lead",home:"rp",end:null},
 {id:"hannah",name:"Hannah Lindqvist",role:"lead",home:"cer",end:null},
 {id:"sam",name:"Sam Okafor",role:"lead",home:"des",end:null},
 {id:"ellie",name:"Ellie Brandt",role:"lead",home:"tex",end:null},
 {id:"jordan",name:"Jordan Kim",role:"intern",home:"wood",end:"2026-12-18"},
 {id:"alexis",name:"Alexis Rivera",role:"intern",home:"rp",end:"2027-05-14"},
 {id:"ben",name:"Ben Thompson",role:"intern",home:"metal",end:"2026-12-18"},
 {id:"maya",name:"Maya Patel",role:"intern",home:"tex",end:"2027-12-17"},
 {id:"chris",name:"Chris Nguyen",role:"intern",home:"wood",end:"2028-05-12"},
 {id:"taylor",name:"Taylor Brooks",role:"intern",home:"cer",end:"2027-05-14"},
 {id:"riley",name:"Riley Johnson",role:"intern",home:"des",end:"2027-12-17"},
 {id:"avery",name:"Avery Chen",role:"intern",home:"rp",end:"2028-05-12"}
];
PEOPLE.forEach(p=>p.active=true);
const ROLE_NAME = {admin:"Admin (staff)",lead:"Area lead (staff)",intern:"Intern"};
const RISK_DAYS = 120;

/* build skills */
const SKILLS = {}; const AREAS = {};
AREA_DEFS.forEach(a=>{
  AREAS[a.id] = {id:a.id,name:a.name,lead:a.lead,tiers:{},rules:{bronze:{el:2},silver:{el:2},gold:{el:2}}};
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
    desc = {bronze:`Capstone for ${a.name} Bronze. Teach the entry-level ${a.name} SOP to members on your own, with the area lead observing.`,
            silver:`Capstone for ${a.name} Silver. Plan and run an advanced training or workshop in ${a.name}.`,
            gold:`Capstone for ${a.name} Gold. Design a new workshop, training or curriculum for ${a.name} that NIS can keep offering.`}[t];
    steps = {bronze:["Co-teach the SOP with a Bronze holder at least once","Review the SOP slides and checklist","Teach a full session with the area lead observing","Request sign-off"],
             silver:["Pick a topic with the area lead","Draft an outline and materials list","Run the workshop with the area lead present","Collect participant feedback and request sign-off"],
             gold:["Propose a workshop idea and learning goals","Draft the curriculum, materials and safety notes","Pilot it with staff or interns","Revise, hand off documentation, and request sign-off"]}[t];
  } else {
    desc = `${TIER_NAME[t]} ${kind==="req"?"required":"elective"} skill in ${a.name}: ${name.toLowerCase()}. Sample description; replace with the NIS procedure.`;
    steps = ["Read the NIS procedure for this task","Watch a certified holder do it","Do it yourself with a holder watching","Request sign-off from the area lead"];
  }
  return {id,area:a.id,tier:t,kind,name,desc,steps,time};
}

