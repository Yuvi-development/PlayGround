import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9c5bd');
scene.fog = new THREE.FogExp2('#9cb7ae', 0.0065);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 420);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;

const hemi = new THREE.HemisphereLight('#d5eee3', '#455a46', 2.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1cf', 3.2); sun.position.set(-65, 95, 55); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -100; sun.shadow.camera.right = 100; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100; sun.shadow.bias = -0.0004; scene.add(sun);
const fill = new THREE.DirectionalLight('#9cced1', 1.1); fill.position.set(45, 28, -50); scene.add(fill);
const mat = (color, roughness = 1, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const materials = {
  grass: mat('#74895d'), grassLight: mat('#91a76a'), soil: mat('#716c50'), rock: mat('#778276'), darkRock: mat('#59645c'),
  bark: mat('#5d4a36'), leaf: mat('#31594a'), leaf2: mat('#47765a'), sand: mat('#bca779'), water: new THREE.MeshStandardMaterial({color:'#3e8488', roughness:.34, metalness:.1}),
  roof: mat('#687675'), wall: mat('#c5b99c'), blue: mat('#628f91'), orange: mat('#be764e'), metal: mat('#4c6262',.55,.28), crate: mat('#a8844f'), dark: mat('#273537')
};
let seed = 17041;
function rand(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function range(a,b){ return a + rand()*(b-a); }
function terrainHeight(x,z){ return 0.35*Math.sin(x*.075)*Math.cos(z*.08) + 0.27*Math.sin((x+z)*.12) + 0.18*Math.cos(z*.19); }
function mesh(geometry, material, parent=scene, x=0,y=0,z=0){ const o=new THREE.Mesh(geometry,material); o.position.set(x,y,z); o.castShadow=true; o.receiveShadow=true; parent.add(o); return o; }
function box(parent, x,y,z, sx,sy,sz, material){return mesh(new THREE.BoxGeometry(sx,sy,sz),material,parent,x,y,z);}

// A wide, low-poly island with a sandy shoreline, ringed by open water.
const water = mesh(new THREE.PlaneGeometry(900,900), materials.water, scene, 0,-4.2,0); water.rotation.x=-Math.PI/2; water.receiveShadow=false;
const grid=120, worldSize=210, positions=[], colors=[], indices=[];
const cGrass=new THREE.Color('#778a60'), cHigh=new THREE.Color('#657959'), cSand=new THREE.Color('#bda87d'), cRock=new THREE.Color('#777b68');
for(let iz=0;iz<=grid;iz++) for(let ix=0;ix<=grid;ix++){
  const x=(ix/grid-.5)*worldSize, z=(iz/grid-.5)*worldSize, r=Math.sqrt(x*x+z*z), edge=THREE.MathUtils.smoothstep(r,83,104);
  let y=terrainHeight(x,z)*(1-edge)-edge*5.7; if(r<76) y += Math.max(0,1-r/76)*1.5;
  positions.push(x,y,z);
  const col=new THREE.Color(); if(r>75&&r<83) col.copy(cSand); else if(r>83) col.copy(cRock); else col.copy(cGrass).lerp(cHigh,THREE.MathUtils.clamp((y+1)/4,0,.65));
  const variation=(rand()-.5)*.045; col.offsetHSL(0,variation,variation); colors.push(col.r,col.g,col.b);
  if(ix<grid&&iz<grid){const a=iz*(grid+1)+ix,b=a+1,c=a+grid+1,d=c+1;indices.push(a,c,b,b,c,d);}
}
const groundGeo=new THREE.BufferGeometry();groundGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.setIndex(indices);groundGeo.computeVertexNormals();
const ground=mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),scene,0,0,0);ground.castShadow=false;
function groundY(x,z){const r=Math.hypot(x,z),edge=THREE.MathUtils.smoothstep(r,83,104);return terrainHeight(x,z)*(1-edge)-edge*5.7+(r<76?Math.max(0,1-r/76)*1.5:0)+.08;}

// Distant headland silhouettes and warm atmospheric light.
for(let i=0;i<34;i++){
  const a=i/34*Math.PI*2, r=102+range(3,13), h=range(5,17), x=Math.cos(a)*r,z=Math.sin(a)*r;
  const rock=mesh(new THREE.DodecahedronGeometry(range(5,11),0),i%3?materials.darkRock:materials.rock,scene,x,-1.7,z);rock.scale.set(1,h/7,1.25);rock.rotation.y=range(0,6);
}

// Hand-built shelters, sheds, and lookout structures make every settlement a landmark.
const landmarks=[];
function makeBuilding(x,z,kind=0,rotation=range(0,Math.PI*2)){
 const g=new THREE.Group(); g.position.set(x,groundY(x,z),z);g.rotation.y=rotation;scene.add(g);landmarks.push(new THREE.Vector3(x,0,z));
 const w=kind===2?10:range(7,10), d=kind===2?7:range(6,9), h=kind===2?5:range(3.4,4.4);
 const wallmat=[materials.wall,materials.blue,materials.orange][kind%3];
 box(g,0,h/2,0,w,h,d,wallmat);box(g,0,h+.16,0,w+0.5,.32,d+.5,materials.roof);
 // contrasting lean-to roof edge and front awning
 box(g,0,h*.72,d/2+.18,w*.56,.13,.55,materials.dark);box(g,-w*.22,h*.58,d/2+.12,1.25,1.8,.12,materials.dark);
 box(g,w*.27,h*.42,d/2+.13,1.2,1.15,.12,materials.dark);
 // bright door panel
 box(g,-w*.1,.95,d/2+.17,1.1,1.9,.18,materials.crate);
 for(let sx of [-1,1]) for(let sz of [-1,1]) box(g,sx*(w/2-.18),.55,sz*(d/2-.18),.28,1.1,.28,materials.dark);
 if(kind===2){
   box(g,0,h+1.5,0,1.1,3,1.1,materials.metal);box(g,0,h+3.1,0,4,.28,4,materials.orange);
   for(let j=0;j<4;j++)box(g,0,h+2.55+j*.12,0,3.8,.025,3.8,materials.roof);
 }
 return g;
}
const settlements=[[-38,-30,0],[-8,-37,1],[32,-26,2],[49,8,0],[22,34,1],[-24,39,2],[-50,9,1],[0,32,0]];
settlements.forEach(([x,z,k])=>makeBuilding(x,z,k));

// Forest clusters: faceted trunks and layered canopies, with a few bright wind flags.
function makeTree(x,z,scale=1){
 const g=new THREE.Group();g.position.set(x,groundY(x,z),z);scene.add(g);
 const trunk=mesh(new THREE.CylinderGeometry(.22*scale,.35*scale,2.1*scale,6),materials.bark,g,0,1*scale,0);trunk.castShadow=true;
 const color=rand()>.5?materials.leaf:materials.leaf2;
 for(let i=0;i<3;i++){const y=(1.65+i*.85)*scale, r=(1.5-i*.32)*scale;const crown=mesh(new THREE.ConeGeometry(r,2.25*scale,7),color,g,0,y,0);crown.rotation.y=range(0,6);}
 if(rand()>.82){const pole=box(g,0,4.9*scale,0,.07,3.1*scale,.07,materials.metal);pole.rotation.z=-.08;const flag=box(g,.65*scale,5.9*scale,0,1.3*scale,.55*scale,.07,materials.orange);flag.rotation.y=.12;}
}
for(let i=0;i<105;i++){
 const a=range(0,Math.PI*2),r=range(20,73),x=Math.cos(a)*r,z=Math.sin(a)*r;
 if(landmarks.some(p=>p.distanceTo(new THREE.Vector3(x,0,z))<9))continue;
 makeTree(x,z,range(.72,1.3));
}
function makeRock(x,z,s=1){const o=mesh(new THREE.DodecahedronGeometry(s,0),rand()>.5?materials.rock:materials.darkRock,scene,x,groundY(x,z)+s*.45,z);o.scale.set(1.3,.75,1);o.rotation.set(range(0,.5),range(0,6),range(0,.5));}
for(let i=0;i<48;i++){const a=range(0,6.28),r=range(12,75),x=Math.cos(a)*r,z=Math.sin(a)*r;if(!landmarks.some(p=>p.distanceTo(new THREE.Vector3(x,0,z))<8))makeRock(x,z,range(.45,1.5));}

// Small paths and supply sites add readable color from the elevated camera.
const pathMat=mat('#a89972');
for(const [x,z] of [[-38,-30],[-8,-37],[32,-26],[49,8],[22,34],[-24,39],[-50,9],[0,32]]){
 const p=mesh(new THREE.CylinderGeometry(3.4,4,0.07,8),pathMat,scene,x,groundY(x,z)+.01,z);p.scale.z=.78;p.rotation.y=range(0,6);p.castShadow=false;
}

function makeRunner(color, accent, isPlayer=false){
 const root=new THREE.Group(), rig=new THREE.Group();root.add(rig);
 const bodymat=mat(color,.86), accentmat=mat(accent,.72), skin=mat(isPlayer?'#d7ad87':'#b99b78'), bootmat=mat('#293438');
 const torso=mesh(new THREE.CapsuleGeometry(.49,.65,4,7),bodymat,rig,0,1.63,0);torso.scale.set(.82,1, .58);
 const vest=mesh(new THREE.BoxGeometry(.8,.58,.57),accentmat,rig,0,1.65,-.035);vest.rotation.x=.06;
 mesh(new THREE.SphereGeometry(.31,8,7),skin,rig,0,2.38,0);
 const helmet=mesh(new THREE.SphereGeometry(.35,8,6,0,Math.PI*2,0,Math.PI*.56),accentmat,rig,0,2.55,0);helmet.scale.set(1.05,.8,1.05);
 box(rig,0,2.39,-.27,.45,.12,.17,bootmat);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.47,1.92,-.05);rig.add(arm);mesh(new THREE.CapsuleGeometry(.13,.5,3,6),bodymat,arm,side*.05,-.25,-.04);arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.22,1.05,0);rig.add(leg);mesh(new THREE.CapsuleGeometry(.16,.58,3,6),bootmat,leg,0,-.4,0);legs.push(leg);
 }
 // Distinct compact rifle, held across the chest and pointed forward (-Z).
 const gun=new THREE.Group();rig.add(gun);gun.position.set(.13,1.72,-.46);
 box(gun,0,0,-.38,.13,.14,.78,materials.dark);box(gun,0,.065,-.73,.085,.09,.55,materials.metal);box(gun,0,-.14,-.25,.12,.2,.17,materials.crate);box(gun,0,.14,-.4,.06,.05,.22,materials.roof);
 mesh(new THREE.CylinderGeometry(.055,.055,.16,6),materials.dark,gun,.23,.04,-.34).rotation.z=Math.PI/2;
 const shadow=mesh(new THREE.CircleGeometry(.65,12),new THREE.MeshBasicMaterial({color:'#16221d',transparent:true,opacity:.25,depthWrite:false}),root,0,.035,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 root.traverse(o=>{if(o.isMesh)o.frustumCulled=true;});
 return {root,rig,arms,legs,gun,health:100,alive:true,isPlayer,walk:0,fireWait:range(.2,1.4),color};
}
const player=makeRunner('#455a54','#d4e46c',true);player.root.position.set(0,groundY(0,0),0);scene.add(player.root);
const bots=[];
for(let i=0;i<9;i++){
 let x,z,tries=0;do{const a=i/9*Math.PI*2+range(-.34,.34),r=range(30,60);x=Math.cos(a)*r;z=Math.sin(a)*r;tries++;}while(tries<12&&(landmarks.some(p=>p.distanceTo(new THREE.Vector3(x,0,z))<8)||Math.hypot(x,z)>72));
 const b=makeRunner(['#8b6150','#526786','#8a754e','#755b77','#52736f','#a46447','#657a5a','#675b4e','#54636d'][i],['#e2ab62','#a4c4d2','#d3c080','#c89eac','#94cbc0','#f0bc71','#b3cc7b','#c4a887','#a5b8c2'][i]);
 b.root.position.set(x,groundY(x,z),z);b.startPosition=new THREE.Vector3(x,groundY(x,z),z);b.phase=range(0,6.28);b.strafe=rand()>.5?1:-1;b.target=null;scene.add(b.root);bots.push(b);
}
const drops=[];
function makeDrop(x,z,type){
 const g=new THREE.Group();g.position.set(x,groundY(x,z)+.2,z);scene.add(g);
 const base=mesh(new THREE.BoxGeometry(.8,.52,.62),type==='MEDKIT'?mat('#d7e2d4'):materials.crate,g,0,.35,0);base.rotation.y=range(0,6);
 const stripe=box(g,0,.62,.01,.16,.58,.67,type==='MEDKIT'?mat('#ed755b'):mat('#d4ef76'));
 const glow=mesh(new THREE.CylinderGeometry(.8,.8,.025,16),new THREE.MeshBasicMaterial({color:type==='MEDKIT'?'#ff8b67':'#cfff70',transparent:true,opacity:.28}),g,0,.03,0);glow.castShadow=false;
 drops.push({group:g,type,x,z,base,glow,phase:range(0,6.28),active:true});
}
for(let i=0;i<13;i++){
 const a=range(0,6.28),r=range(10,66),x=Math.cos(a)*r,z=Math.sin(a)*r;
 if(landmarks.some(p=>p.distanceTo(new THREE.Vector3(x,0,z))<9))continue;
 makeDrop(x,z,rand()>.38?'AMMO':'MEDKIT');
}
const zoneRing=new THREE.Mesh(new THREE.RingGeometry(.985,1,96),new THREE.MeshBasicMaterial({color:'#e4fa8b',side:THREE.DoubleSide,transparent:true,opacity:.74,depthWrite:false}));zoneRing.rotation.x=-Math.PI/2;zoneRing.position.set(0,.35,0);scene.add(zoneRing);
const zone={radius:79,start:79,end:7,elapsed:0,duration:190,center:new THREE.Vector2(0,0)};
const tracers=[];
function tracer(from,to,color='#f8e29a',duration=.11){
 const geo=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.92}));scene.add(line);tracers.push({line,life:duration,max:duration});
}
const state={started:false,over:false,paused:false,seconds:0,health:100,armor:50,ammo:24,reserve:72,kills:0,reloading:false,reloadTimer:0,fireCooldown:0,damageTimer:0,toastTimer:0,hitTimer:0,aimYaw:0,moveX:0,moveZ:0,shootHeld:false,zoneWarning:false,lastZoneDamage:0,elapsedSinceDamage:0};
let lastTime=performance.now(), soundOn=true, toastTimeout;
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),1900);}
const raycaster=new THREE.Raycaster();
function getAimRay(){raycaster.setFromCamera(new THREE.Vector2(0,0),camera);return raycaster.ray;}
function showHit(){const h=$('hit-marker');h.classList.remove('hit');void h.offsetWidth;h.classList.add('hit');state.hitTimer=.28;}
function shoot(){
 if(!state.started||state.over||state.paused||state.reloading||state.fireCooldown>0)return;
 if(state.ammo<=0){if(state.reserve>0)reload();else toast('OUT OF AMMO — FIND SUPPLIES');return;}
 state.fireCooldown=.19;state.ammo--;updateAmmo();playShot();
 const ray=getAimRay(), origin=ray.origin.clone(), direction=ray.direction.clone();
 // A touch of field recoil keeps bursts controllable without obscuring the reticle.
 direction.x+=range(-.006,.006);direction.y+=range(-.004,.005);direction.z+=range(-.006,.006);direction.normalize();
 const muzzle=player.root.localToWorld(new THREE.Vector3(.18,1.8,-1.05));let nearest=null,nearestT=130;
 for(const b of bots){if(!b.alive)continue;const center=b.root.position.clone().add(new THREE.Vector3(0,1.48,0));const to=center.clone().sub(origin);const t=to.dot(direction);if(t<0||t>85)continue;const near=origin.clone().addScaledVector(direction,t);if(near.distanceTo(center)<.83&&t<nearestT){nearest=b;nearestT=t;}}
 const aimEnd=origin.clone().addScaledVector(direction,Math.min(nearestT,85));
 if(nearest){nearest.health-=range(31,39);showHit();tracer(muzzle,nearest.root.position.clone().add(new THREE.Vector3(0,1.5,0)),'#f1df9b',.12);if(nearest.health<=0)eliminate(nearest);}
 else tracer(muzzle,aimEnd,'#f3d996',.09);
}
function eliminate(bot){bot.alive=false;bot.root.visible=false;state.kills++;updateCounters();makeDrop(bot.root.position.x,bot.root.position.z,rand()>.45?'AMMO':'MEDKIT');toast('RUNNER ELIMINATED');if(bots.every(b=>!b.alive))finish(true);}
function reload(){if(state.reloading||state.ammo===24||state.reserve===0||state.over)return;state.reloading=true;state.reloadTimer=1.35;$('reload-indicator').classList.add('show');}
function pickup(){
 if(!state.started||state.over)return;
 const drop=drops.filter(d=>d.active).sort((a,b)=>Math.hypot(a.x-player.root.position.x,a.z-player.root.position.z)-Math.hypot(b.x-player.root.position.x,b.z-player.root.position.z))[0];
 if(!drop||Math.hypot(drop.x-player.root.position.x,drop.z-player.root.position.z)>3.4){toast('NO SUPPLIES IN REACH');return;}
 drop.active=false;drop.group.visible=false;
 if(drop.type==='MEDKIT'){if(state.health>=100&&state.armor>=100){state.health=100;toast('MEDKIT STOWED');}else{state.health=Math.min(100,state.health+42);state.armor=Math.min(100,state.armor+8);toast('MEDKIT USED  +42 VITALS');}}
 else{state.reserve=Math.min(180,state.reserve+36);toast('RIFLE AMMO +36');}
 updateVitals();updateAmmo();updatePickupPrompt();
}
function updatePickupPrompt(){const d=drops.filter(o=>o.active).find(o=>Math.hypot(o.x-player.root.position.x,o.z-player.root.position.z)<3.4);$('pickup-prompt').hidden=!d;if(d)$('pickup-name').textContent=d.type;}
function hurt(amount,from){
 if(state.over)return;let damage=amount,absorbed=Math.min(state.armor,damage*.62);state.armor-=absorbed;damage-=absorbed;state.health=Math.max(0,state.health-damage);state.damageTimer=.15;updateVitals();
 const flash=$('damage-flash');flash.classList.add('on');setTimeout(()=>flash.classList.remove('on'),110);
 if(state.health<=0)finish(false);
}
function updateBots(dt){
 const p=player.root.position;
 for(const b of bots){if(!b.alive)continue;const pos=b.root.position,dx=p.x-pos.x,dz=p.z-pos.z,dist=Math.hypot(dx,dz);b.phase+=dt;
  if(dist<45&&dist>5){const toward=Math.atan2(-dx,-dz);const angle=toward+(dist<15?b.strafe*.72:Math.sin(b.phase*.6)*.22);const speed=dist>17?2.45:dist<8?.5:1.15;pos.x+=Math.sin(angle)*speed*dt;pos.z+=Math.cos(angle)*speed*dt;b.root.rotation.y=angle;}
  else{pos.x+=Math.sin(b.phase*.7+b.strafe)*.55*dt;pos.z+=Math.cos(b.phase*.7+b.strafe)*.55*dt;b.root.rotation.y=Math.atan2(-dx,-dz);}
  const r=Math.hypot(pos.x,pos.z);if(r>75){pos.x*=75/r;pos.z*=75/r;}pos.y=groundY(pos.x,pos.z);
  b.walk+=dt*(dist<45?7:3);const stride=Math.sin(b.walk)*.5;b.legs[0].rotation.x=stride;b.legs[1].rotation.x=-stride;b.arms.forEach(a=>a.rotation.x=-.3+Math.sin(b.walk)*.08);
  b.fireWait-=dt;
  if(dist<32&&b.fireWait<=0&&state.started&&!state.over){b.fireWait=range(.8,1.8);const hitChance=THREE.MathUtils.clamp(.56-dist*.009,.22,.48);const from=pos.clone().add(new THREE.Vector3(0,1.8,0)),to=p.clone().add(new THREE.Vector3(0,1.45,0));tracer(from,to,'#fa916a',.16);if(rand()<hitChance)hurt(range(5,9),b);}
 }
}
function updateVitals(){ $('health-value').textContent=Math.ceil(state.health);$('health-bar').style.width=`${state.health}%`;$('armor-value').textContent=Math.ceil(state.armor);$('armor-bar').style.width=`${state.armor}%`; }
function updateAmmo(){ $('ammo-count').textContent=state.ammo;$('reserve-count').textContent=state.reserve; }
function updateCounters(){ $('kill-count').textContent=state.kills;$('alive-count').textContent=1+bots.filter(b=>b.alive).length; }
function fmtTime(sec){const n=Math.floor(sec);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function finish(win){if(state.over)return;state.over=true;state.shootHeld=false;document.exitPointerLock?.();$('end-screen').hidden=false;$('end-eyebrow').textContent=win?'EXTRACTION CONFIRMED':'SIGNAL LOST';$('end-title').innerHTML=win?'SIGNAL<br><em>SECURED.</em>':'RUNNER<br><em>DOWN.</em>';$('end-copy').textContent=win?'You outlasted every runner in the Outlands.':'The island keeps its secrets. Drop back in when you’re ready.';$('result-kills').textContent=state.kills;$('result-time').textContent=fmtTime(state.seconds);}
const audio=window.AudioContext?new AudioContext():null;
function playShot(){if(!audio||!soundOn)return;if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(125,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(48,audio.currentTime+.11);gain.gain.setValueAtTime(.055,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.13);}
function startGame(){
 if(state.started&&!state.over)return;
 state.started=true;state.over=false;state.paused=false;state.seconds=0;state.health=100;state.armor=50;state.ammo=24;state.reserve=72;state.kills=0;state.reloading=false;state.reloadTimer=0;state.fireCooldown=0;state.aimYaw=0;state.shootHeld=false;state.elapsedSinceDamage=0;
 player.root.position.set(0,groundY(0,0),0);player.root.rotation.y=0;
 bots.forEach(b=>{b.alive=true;b.health=100;b.root.visible=true;b.root.position.copy(b.startPosition);b.fireWait=range(.5,1.8);b.phase=range(0,6.28);});
 drops.forEach(d=>{d.active=true;d.group.visible=true;});
 zone.elapsed=0;zone.radius=zone.start;zone.center.set(0,0);zoneRing.visible=true;
 $('intro-screen').hidden=true;$('end-screen').hidden=true;$('hud').hidden=false;$('mobile-controls').hidden=innerWidth>760;$('pause-tag').hidden=true;
 $('zone-alert').classList.remove('show');$('match-state').textContent='DEPLOYMENT IN PROGRESS';updateVitals();updateAmmo();updateCounters();updatePickupPrompt();lastTime=performance.now();
 if(innerWidth>760&&canvas.requestPointerLock)canvas.requestPointerLock();toast('FIND COVER. THE STORM IS MOVING.');
}
$('deploy-btn').addEventListener('click',startGame);$('again-btn').addEventListener('click',startGame);
$('sound-btn').addEventListener('click',()=>{soundOn=!soundOn;$('sound-btn').innerHTML=`♫ <span>SOUND ${soundOn?'ON':'OFF'}</span>`;if(soundOn)audio?.resume();});
$('mobile-reload').addEventListener('click',reload);$('mobile-pickup').addEventListener('click',pickup);
const fireBtn=$('mobile-fire');fireBtn.addEventListener('pointerdown',e=>{e.preventDefault();state.shootHeld=true;shoot();});fireBtn.addEventListener('pointerup',()=>state.shootHeld=false);fireBtn.addEventListener('pointercancel',()=>state.shootHeld=false);fireBtn.addEventListener('pointerleave',()=>state.shootHeld=false);
const keys=new Set();
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='KeyF')pickup();if(e.code==='Escape'&&state.started&&!state.over){state.paused=true;state.shootHeld=false;$('pause-tag').hidden=false;}});
window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('mousedown',e=>{if(e.button!==0||!state.started||state.over)return;if(innerWidth>760&&document.pointerLockElement!==canvas){canvas.requestPointerLock?.();return;}state.shootHeld=true;shoot();});
window.addEventListener('mouseup',e=>{if(e.button===0)state.shootHeld=false;});
window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&state.started&&!state.paused){state.aimYaw-=e.movementX*.0024;} });
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===canvas){state.paused=false;$('pause-tag').hidden=true;}else if(state.started&&!state.over&&innerWidth>760){state.paused=true;$('pause-tag').hidden=false;}});
let lookPointer=null,lastTouchX=0;
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.clientX>innerWidth*.42){lookPointer=e.pointerId;lastTouchX=e.clientX;canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId===lookPointer){state.aimYaw-=(e.clientX-lastTouchX)*.009;lastTouchX=e.clientX;}});
canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
const stickZone=$('stick-zone'),stickKnob=$('stick-knob');let stickId=null,stickOrigin=null;
stickZone.addEventListener('pointerdown',e=>{e.preventDefault();stickId=e.pointerId;stickZone.setPointerCapture(e.pointerId);const r=stickZone.getBoundingClientRect();stickOrigin={x:r.left+r.width/2,y:r.top+r.height/2};moveStick(e);});
function moveStick(e){if(e.pointerId!==stickId||!stickOrigin)return;const dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y,len=Math.hypot(dx,dy),max=39,m=Math.min(1,max/(len||1));state.moveX=dx*m/max;state.moveZ=dy*m/max;stickKnob.style.left=`calc(50% + ${dx*m}px)`;stickKnob.style.top=`calc(50% + ${dy*m}px)`;}
stickZone.addEventListener('pointermove',moveStick);function resetStick(e){if(e.pointerId!==stickId)return;stickId=null;stickOrigin=null;state.moveX=state.moveZ=0;stickKnob.style.left='50%';stickKnob.style.top='50%';}stickZone.addEventListener('pointerup',resetStick);stickZone.addEventListener('pointercancel',resetStick);
const mapCanvas=$('minimap'),mapCtx=mapCanvas.getContext('2d');
function drawMap(){
 const w=mapCanvas.width,h=mapCanvas.height,cx=w/2,cy=h/2,s=w/190;mapCtx.clearRect(0,0,w,h);
 mapCtx.fillStyle='#20393a';mapCtx.fillRect(0,0,w,h);mapCtx.beginPath();mapCtx.arc(cx,cy,81*s,0,Math.PI*2);mapCtx.fillStyle='#607c5f';mapCtx.fill();
 mapCtx.save();mapCtx.beginPath();mapCtx.arc(cx,cy,81*s,0,Math.PI*2);mapCtx.clip();
 for(const [x,z] of settlements){mapCtx.fillStyle='#b99c6b';mapCtx.fillRect(cx+x*s-3,cy+z*s-2.5,6,5);}
 mapCtx.strokeStyle='rgba(225,245,156,.9)';mapCtx.lineWidth=1.5;mapCtx.beginPath();mapCtx.arc(cx+zone.center.x*s,cy+zone.center.y*s,zone.radius*s,0,Math.PI*2);mapCtx.stroke();
 bots.forEach(b=>{if(!b.alive)return;mapCtx.fillStyle='#ff9975';mapCtx.beginPath();mapCtx.arc(cx+b.root.position.x*s,cy+b.root.position.z*s,2.1,0,Math.PI*2);mapCtx.fill();});
 drops.forEach(d=>{if(d.active){mapCtx.fillStyle=d.type==='MEDKIT'?'#f7d8bd':'#dafa7d';mapCtx.fillRect(cx+d.x*s-1,cy+d.z*s-1,2.5,2.5);}});
 mapCtx.restore();mapCtx.fillStyle='#e3fc87';mapCtx.beginPath();mapCtx.arc(cx+player.root.position.x*s,cy+player.root.position.z*s,3.8,0,Math.PI*2);mapCtx.fill();mapCtx.strokeStyle='#24342b';mapCtx.lineWidth=1.3;mapCtx.stroke();
}
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3();
function updateCamera(dt){
 const p=player.root.position,yaw=state.aimYaw;
 if(!state.started){const t=performance.now()*.000055;camera.position.set(Math.sin(t)*76,43,Math.cos(t)*76);camera.lookAt(0,0,0);return;}
 const targetPos=new THREE.Vector3(p.x+Math.sin(yaw)*12,p.y+10.5,p.z+Math.cos(yaw)*12);
 const targetLook=new THREE.Vector3(p.x-Math.sin(yaw)*3.2,p.y+1.5,p.z-Math.cos(yaw)*3.2);
 const smooth=1-Math.exp(-dt*7);camera.position.lerp(targetPos,smooth);camLook.lerp(targetLook,smooth);camera.lookAt(camLook);
}
function update(dt){
 if(!state.started||state.over||state.paused)return;
 state.seconds+=dt;state.fireCooldown=Math.max(0,state.fireCooldown-dt);
 const kx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),kz=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);
 const ix=THREE.MathUtils.clamp(kx+state.moveX,-1,1),iz=THREE.MathUtils.clamp(kz+state.moveZ,-1,1),len=Math.hypot(ix,iz),yaw=state.aimYaw;
 if(len>.08){const mx=(-Math.sin(yaw)*(-iz)+Math.cos(yaw)*ix)/Math.max(1,len),mz=(-Math.cos(yaw)*(-iz)-Math.sin(yaw)*ix)/Math.max(1,len);player.root.position.x+=mx*7.2*dt;player.root.position.z+=mz*7.2*dt;player.root.rotation.y=Math.atan2(-mx,-mz);player.walk+=dt*12;}
 else{player.walk+=dt*2;player.root.rotation.y+=(yaw-player.root.rotation.y)*Math.min(1,dt*4);}
 const radius=Math.hypot(player.root.position.x,player.root.position.z);if(radius>81){player.root.position.x*=81/radius;player.root.position.z*=81/radius;}
 player.root.position.y=groundY(player.root.position.x,player.root.position.z);
 const moving=len>.08;player.legs[0].rotation.x=moving?Math.sin(player.walk)*.58:0;player.legs[1].rotation.x=moving?-Math.sin(player.walk)*.58:0;player.arms[0].rotation.x=-.35+(moving?Math.sin(player.walk)*.12:0);player.arms[1].rotation.x=-.35;
 if(state.shootHeld)shoot();
 if(state.reloading){state.reloadTimer-=dt;if(state.reloadTimer<=0){const n=Math.min(24-state.ammo,state.reserve);state.ammo+=n;state.reserve-=n;state.reloading=false;$('reload-indicator').classList.remove('show');updateAmmo();}}
 updateBots(dt);
 drops.forEach(d=>{if(d.active){d.group.position.y=groundY(d.x,d.z)+.18+Math.sin(performance.now()*.002+d.phase)*.1;d.group.rotation.y+=dt*.32;}});
 zone.elapsed+=dt;const delay=12,progress=THREE.MathUtils.clamp((zone.elapsed-delay)/(zone.duration-delay),0,1);zone.radius=THREE.MathUtils.lerp(zone.start,zone.end,progress);zoneRing.scale.setScalar(zone.radius);zoneRing.position.x=zone.center.x;zoneRing.position.z=zone.center.y;
 const outside=Math.hypot(player.root.position.x-zone.center.x,player.root.position.z-zone.center.y)>zone.radius;
 $('zone-alert').classList.toggle('show',zone.elapsed>delay-7&&zone.elapsed<zone.duration);
 if(outside){state.elapsedSinceDamage+=dt;if(state.elapsedSinceDamage>1){state.elapsedSinceDamage=0;hurt(4+progress*4,null);}}else state.elapsedSinceDamage=0;
 if(zone.elapsed>delay+4&&zone.elapsed<zone.duration)$('objective-text').textContent=`Safe zone · ${Math.ceil(zone.duration-zone.elapsed)}s`;
 else if(zone.elapsed>=zone.duration)$('objective-text').textContent='Storm closing in';
 $('clock').textContent=fmtTime(state.seconds);$('alive-count').textContent=1+bots.filter(b=>b.alive).length;
 updatePickupPrompt();drawMap();
 for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.life-=dt;t.line.material.opacity=Math.max(0,t.life/t.max);if(t.life<=0){scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();tracers.splice(i,1);}}
}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-lastTime)/1000||0);lastTime=now;update(dt);updateCamera(dt);renderer.render(scene,camera);}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);$('mobile-controls').hidden=innerWidth>760||!state.started;});
