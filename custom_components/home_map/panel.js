/* ============================================================
 *  Home Map v4 – Dark dashboard aesthetic
 * ============================================================ */
const GRID = 10, HANDLE = 10, MARKER = 16, MIN_ROOM = 40, HEATMAP_RES = 6, PAD = 60;
const TEMP_MIN = 12, TEMP_MAX = 28, HUM_MIN = 30, HUM_MAX = 90, DEFAULT_UPM = 50;

/* ── palette ───────────────────────────────────────────── */
const C = {
  bg:"#060608", card:"#111114", border:"#222228",
  text:"#DFDFEA", textMid:"#BAC0CA", textMuted:"#7A86A4",
  accent:"#7B61FF", accentDim:"rgba(123,97,255,.25)",
  amber:"#E5A620", coral:"#FF6B4A", green:"#4CAF50",
  wallStroke:"rgba(186,192,202,.22)", wallStrokeSel:"rgba(123,97,255,.7)",
  roomFill:"rgba(186,192,202,.03)",
  font:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};

const LAYERS = [
  { id: "temperature", label: "Temperature" }, { id: "humidity", label: "Humidity" },
  { id: "occupancy", label: "People" }, { id: "windows", label: "Windows" },
  { id: "lights", label: "Lights" }, { id: "heating", label: "Heating" },
];
const SENSOR_CLASSES = { temperature: ["temperature"], humidity: ["humidity"], occupancy: ["occupancy","motion","presence"] };
const ELEM_COL = { temperature:"#E5A620", humidity:"#2196f3", occupancy:"#4caf50", lights:"#fdd835", climate:"#f44336", windows:"#7B61FF" };

/* ── colour helpers ─────────────────────────────────────── */
function hslToRgb(h,s,l){h/=360;s/=100;l/=100;let r,g,b;if(s===0){r=g=b=l}else{const q2r=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};const q=l<.5?l*(1+s):l+s-l*s;const p=2*l-q;r=q2r(p,q,h+1/3);g=q2r(p,q,h);b=q2r(p,q,h-1/3)}return[Math.round(r*255),Math.round(g*255),Math.round(b*255)]}
// Multi-stop color interpolation helper
function lerpStops(t,stops){
  t=Math.max(0,Math.min(1,t));
  for(let i=0;i<stops.length-1;i++){
    if(t>=stops[i][0]&&t<=stops[i+1][0]){
      const f=(t-stops[i][0])/(stops[i+1][0]-stops[i][0]);
      return[Math.round(stops[i][1]+(stops[i+1][1]-stops[i][1])*f),Math.round(stops[i][2]+(stops[i+1][2]-stops[i][2])*f),Math.round(stops[i][3]+(stops[i+1][3]-stops[i][3])*f)];
    }
  }
  const l=stops[stops.length-1];return[l[1],l[2],l[3]];
}
// Temperature: deep blue → teal → amber → orange → red (no pale midpoint)
const TEMP_STOPS=[[0,30,70,180],[.25,50,150,190],[.5,180,170,60],[.75,220,120,30],[1,190,40,30]];
// Humidity: warm tan → teal → deep blue
const HUM_STOPS=[[0,200,170,80],[.35,100,190,160],[.65,50,130,200],[1,30,50,170]];
function tempToRgb(v,mn,mx){return lerpStops((v-(mn!=null?mn:TEMP_MIN))/((mx!=null?mx:TEMP_MAX)-(mn!=null?mn:TEMP_MIN)),TEMP_STOPS)}
function humToRgb(v,mn,mx){return lerpStops((v-(mn!=null?mn:HUM_MIN))/((mx!=null?mx:HUM_MAX)-(mn!=null?mn:HUM_MIN)),HUM_STOPS)}
function snap(v){return Math.round(v/GRID)*GRID}
function uid(){return Math.random().toString(36).slice(2,10)}
function clamp01(v){return Math.max(0,Math.min(1,v))}

/* ── room geometry helpers (multi-rect) ─────────────────── */
function rmRects(rm){return rm.rects&&rm.rects.length?rm.rects:[{x:rm.x,y:rm.y,w:rm.w,h:rm.h}]}
function rmBounds(rm){
  const rs=rmRects(rm);let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const r of rs){x0=Math.min(x0,r.x);y0=Math.min(y0,r.y);x1=Math.max(x1,r.x+r.w);y1=Math.max(y1,r.y+r.h)}
  return{x:x0,y:y0,w:x1-x0,h:y1-y0};
}
function ptInRoom(wx,wy,rm){for(const r of rmRects(rm))if(wx>=r.x&&wx<=r.x+r.w&&wy>=r.y&&wy<=r.y+r.h)return true;return false}
function ptInRect(wx,wy,r){return wx>=r.x&&wx<=r.x+r.w&&wy>=r.y&&wy<=r.y+r.h}

/* ── icon drawing ───────────────────────────────────────── */
function drawIcon(ctx, type, cx, cy, sz, active) {
  ctx.save(); ctx.translate(cx, cy);
  const c = active !== false ? ELEM_COL[type] : "rgba(150,150,150,.6)";
  switch(type) {
    case "temperature": // thermometer
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, -sz*.55); ctx.lineTo(0, sz*.1); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, sz*.25, sz*.3, 0, Math.PI*2); ctx.fill();
      break;
    case "humidity": // water droplet
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(0, -sz*.55);
      ctx.bezierCurveTo(sz*.45, -sz*.05, sz*.45, sz*.35, 0, sz*.55);
      ctx.bezierCurveTo(-sz*.45, sz*.35, -sz*.45, -sz*.05, 0, -sz*.55);
      ctx.fill(); break;
    case "occupancy": // person
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, -sz*.25, sz*.22, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, sz*.25, sz*.35, sz*.3, 0, Math.PI, 0, true); ctx.fill();
      break;
    case "lights": // sun/bulb
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, sz*.28, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*sz*.38,Math.sin(a)*sz*.38);ctx.lineTo(Math.cos(a)*sz*.55,Math.sin(a)*sz*.55);ctx.stroke()}
      break;
    case "climate": // radiator
      ctx.fillStyle = c;
      ctx.fillRect(-sz*.45, -sz*.3, sz*.9, sz*.6);
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1.5;
      for(let i=0;i<4;i++){const lx=-sz*.3+i*sz*.2;ctx.beginPath();ctx.moveTo(lx,-sz*.4);ctx.lineTo(lx,sz*.4);ctx.stroke()}
      break;
    case "windows": // window — two-pane arch
      ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.lineCap = "round";
      // outer frame with rounded top
      ctx.beginPath();
      ctx.moveTo(-sz*.35, sz*.45); ctx.lineTo(-sz*.35, -sz*.2);
      ctx.quadraticCurveTo(-sz*.35, -sz*.45, 0, -sz*.45);
      ctx.quadraticCurveTo(sz*.35, -sz*.45, sz*.35, -sz*.2);
      ctx.lineTo(sz*.35, sz*.45); ctx.closePath(); ctx.stroke();
      // center divider
      ctx.beginPath(); ctx.moveTo(0, -sz*.4); ctx.lineTo(0, sz*.45); ctx.stroke();
      // horizontal bar
      ctx.beginPath(); ctx.moveTo(-sz*.35, sz*.05); ctx.lineTo(sz*.35, sz*.05); ctx.stroke();
      break;
  }
  ctx.restore();
}

/* ── panel ──────────────────────────────────────────────── */
class HomeMapPanel extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:"open"});
    this._hass=null; this._floors=[]; this._floorIdx=0; this._upm=DEFAULT_UPM;
    this._layers={temperature:true,humidity:false,occupancy:true,windows:true,lights:true,heating:false};
    this._editMode=false; this._selRoom=null; this._selRect=0; this._selElem=null; this._addingSection=false; this._mergeSet=new Set();
    this._action=null; this._actionData={};
    this._areas=[]; this._entityReg=[]; this._deviceReg=[];
    this._hmCache=null; this._hmKey=""; this._scale=1; this._panX=0; this._panY=0;
    this._rendered=false; this._saveTimer=null; this._rafId=null; this._ro=null; this._dpr=1; this._cvW=0; this._cvH=0;
    this._boundMouse={down:e=>this._onDown(e),move:e=>this._onMove(e),up:e=>this._onUp(e)};
  }
  set hass(h){const p=this._hass;this._hass=h;
    // Hot-reload: if a newer version of the JS loaded, rebuild DOM with its _buildDom
    const gv=window.__homeMapV||0;
    if(!this._rendered||this._bv!==gv){
      if(window.__homeMapBuildDom)this._buildDom=window.__homeMapBuildDom;
      this._buildDom();this._rendered=true;this._bv=gv;this._loadData();
    }
    if(this._sc(p,h)){this._hmCache=null;this._scheduleRender()}}
  _sc(a,b){if(!a)return true;const f=this._floor();if(!f)return false;for(const rm of f.rooms){for(const k of["temperature","humidity","occupancy"])for(const el of(rm.sensors?.[k]||[]))if(el.entity_id&&a.states[el.entity_id]?.state!==b.states[el.entity_id]?.state)return true;for(const k of["lights","climate","windows"])for(const el of(rm[k]||[]))if(el.entity_id&&a.states[el.entity_id]?.state!==b.states[el.entity_id]?.state)return true}return false}

  /* ── data ─────────────────────────────────────────────── */
  async _loadData(){
    try{this._areas=await this._hass.callWS({type:"config/area_registry/list"});this._entityReg=await this._hass.callWS({type:"config/entity_registry/list"});this._deviceReg=await this._hass.callWS({type:"config/device_registry/list"})}catch{}
    let has=false;
    try{const r=await this._hass.callApi("GET","home_map/floor_plan");if(r?.floors?.length){this._floors=r.floors;this._upm=r.unitsPerMeter||DEFAULT_UPM;this._migrate();has=true}}catch{}
    if(!has){await this._autoGen();this._debounceSave()}
    // Sync floor structure with HA (moves rooms between floors, reorders)
    await this._syncFloors();
    this._refreshTabs();this._scheduleRender();
  }
  async _syncFloors(){
    try{
      const haFloors=await this._hass.callWS({type:"config/floor_registry/list"});
      const areas=this._areas||[];

      // Build area_id → floor_id mapping from HA
      const areaFloor={};for(const a of areas)if(a.floor_id)areaFloor[a.area_id]=a.floor_id;

      // Build floor_id → our floor object mapping
      const ourFloorMap={};for(const f of this._floors)ourFloorMap[f.id]=f;

      // Create any HA floors we don't have yet
      for(const hf of haFloors){
        if(!ourFloorMap[hf.floor_id]){
          const nf={id:hf.floor_id,name:hf.name,rooms:[]};
          this._floors.push(nf);ourFloorMap[hf.floor_id]=nf;
        }
      }

      // Move rooms to correct floors based on current area→floor mapping
      // Collect all rooms from all floors
      const allRooms=[];for(const f of this._floors)for(const rm of f.rooms)allRooms.push({rm,currentFloorId:f.id});

      for(const{rm,currentFloorId}of allRooms){
        if(!rm.area_id)continue;
        const targetFloorId=areaFloor[rm.area_id]||"other";
        if(targetFloorId===currentFloorId)continue;
        // Move room to target floor
        const srcFloor=ourFloorMap[currentFloorId];
        let dstFloor=ourFloorMap[targetFloorId];
        if(!dstFloor){dstFloor={id:targetFloorId,name:targetFloorId,rooms:[]};this._floors.push(dstFloor);ourFloorMap[targetFloorId]=dstFloor}
        const idx=srcFloor.rooms.indexOf(rm);if(idx>=0)srcFloor.rooms.splice(idx,1);
        dstFloor.rooms.push(rm);
      }

      // Remove empty floors (except if they have rooms)
      this._floors=this._floors.filter(f=>f.rooms.length>0||haFloors.some(hf=>hf.floor_id===f.id));

      // Sort by level
      const levelMap={};for(const hf of haFloors)levelMap[hf.floor_id]=hf.level??99;
      this._floors.sort((a,b)=>(levelMap[a.id]??50)-(levelMap[b.id]??50));

      // Clamp floor index
      if(this._floorIdx>=this._floors.length)this._floorIdx=Math.max(0,this._floors.length-1);

      this._debounceSave();
    }catch(e){console.error("syncFloors",e)}
  }
  _migrate(){let c=false;for(const f of this._floors)for(const rm of f.rooms){
    // Migrate to rects array
    if(!rm.rects){rm.rects=[{x:rm.x,y:rm.y,w:rm.w,h:rm.h}];c=true}
    if(!rm.sensors)rm.sensors={};for(const k of["temperature","humidity","occupancy"]){const v=rm.sensors[k];if(typeof v==="string"){rm.sensors[k]=v?[{entity_id:v,x:.5,y:.5}]:[];c=true}else if(!Array.isArray(v))rm.sensors[k]=[]}for(const k of["lights","climate","windows"]){if(!rm[k]){rm[k]=[];continue}if(rm[k].length>0&&typeof rm[k][0]==="string"){const dy=k==="windows"?0:k==="climate"?.95:.3;rm[k]=rm[k].map((eid,i,a)=>({entity_id:eid,x:(i+1)/(a.length+1),y:dy}));c=true}}}if(c)this._debounceSave()}
  async _autoGen(){
    let hf=[];try{hf=await this._hass.callWS({type:"config/floor_registry/list"})}catch{}
    hf.sort((a,b)=>(a.level||0)-(b.level||0));
    const fa={},un=[];for(const a of(this._areas||[]))a.floor_id?(fa[a.floor_id]||=[]).push(a):un.push(a);
    this._floors=[];for(const f of hf){const as=fa[f.floor_id]||[];if(as.length)this._floors.push({id:f.floor_id,name:f.name,rooms:this._layRooms(as)})}
    if(un.length)this._floors.push({id:"other",name:"Other",rooms:this._layRooms(un)});
    if(!this._floors.length)this._floors=[{id:uid(),name:"Ground Floor",rooms:this._layRooms(this._areas||[])}];
  }
  _layRooms(areas){const rooms=[],cols=Math.ceil(Math.sqrt(areas.length)),W=200,H=160,g=10;for(let i=0;i<areas.length;i++){const rx=(i%cols)*(W+g),ry=Math.floor(i/cols)*(H+g);rooms.push({id:uid(),name:areas[i].name,rects:[{x:rx,y:ry,w:W,h:H}],area_id:areas[i].area_id,sensors:{temperature:[],humidity:[],occupancy:[]},lights:[],climate:[],windows:[]})}return rooms}
  async _save(){try{await this._hass.callApi("POST","home_map/floor_plan",{floors:this._floors,unitsPerMeter:this._upm})}catch(e){console.error("save fail",e)}}
  _debounceSave(){clearTimeout(this._saveTimer);this._saveTimer=setTimeout(()=>this._save(),400)}
  _floor(){return this._floors[this._floorIdx]||null}

  /* ── DOM ──────────────────────────────────────────────── */
  _buildDom(){
    this.shadowRoot.innerHTML=`<style>
:host{display:block;height:100%;font-family:${C.font}}*{box-sizing:border-box}
.shell{display:flex;flex-direction:column;height:100%;background:${C.bg};color:${C.text}}
.toolbar{display:flex;align-items:center;gap:6px;padding:8px 12px;background:${C.card};border-bottom:1px solid ${C.border};flex-wrap:wrap;min-height:48px}
.toolbar .section{display:flex;gap:4px;align-items:center}.toolbar .sep{width:1px;height:28px;background:${C.border};margin:0 4px}
.tab{padding:6px 14px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;background:transparent;border:1px solid rgba(186,192,202,.2);color:${C.textMid};transition:all .15s}
.tab.active{background:${C.accent};color:#fff;border-color:${C.accent}}.tab:hover{color:${C.text}}.tab.add{font-size:18px;padding:4px 12px}
.lbtn{padding:5px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;background:transparent;border:1px solid rgba(186,192,202,.2);color:${C.textMid};transition:all .15s}
.lbtn.on{background:${C.accent};color:#fff;border-color:${C.accent}}.lbtn:hover{color:${C.text}}
.edit-btn{padding:6px 16px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;background:transparent;border:1px solid rgba(186,192,202,.2);color:${C.textMid};margin-left:auto;transition:all .15s}
.edit-btn.on{background:${C.coral};color:#fff;border-color:${C.coral}}
.main{display:flex;flex:1;overflow:hidden;position:relative}
canvas{flex:1;display:block;cursor:default;min-width:0}
.sidebar{width:420px;min-width:420px;background:${C.card};border-left:1px solid ${C.border};padding:16px;overflow-y:auto;display:none;flex-shrink:0;font-size:15px}
.sidebar.open{display:block}
.sidebar h3{margin:0 0 12px;font-size:22px;font-weight:600;color:${C.text}}.sidebar label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:${C.textMuted};margin:14px 0 6px}
.sidebar input,.sidebar select{width:100%;padding:10px 12px;border-radius:6px;font-size:16px;background:${C.bg};color:${C.text};border:1px solid ${C.border};font-family:${C.font}}
.sidebar input:focus,.sidebar select:focus{outline:none;border-color:${C.accent};box-shadow:0 0 0 2px ${C.accentDim}}
.sidebar .er{display:flex;align-items:center;gap:10px;margin:5px 0;font-size:15px;padding:8px;border-radius:6px}.sidebar .er:hover{background:rgba(255,255,255,.04)}.sidebar .er[draggable]:active{opacity:.5}
.sidebar .er .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}.sidebar .er .eid{flex:1;color:${C.text};font-size:14px;word-break:break-word}
.sidebar .er .val{font-weight:600;white-space:nowrap;font-size:14px;color:${C.textMid};font-variant-numeric:tabular-nums}.sidebar .er .rm{cursor:pointer;color:${C.coral};font-size:22px;padding:0 6px;background:none;border:none}
.sidebar button{padding:10px 16px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;background:${C.accentDim};color:${C.accent};border:1px solid rgba(123,97,255,.3);margin-top:8px;font-family:${C.font}}
.sidebar button.danger{background:rgba(255,107,74,.15);color:${C.coral};border:1px solid rgba(255,107,74,.3)}
.sidebar .fe{margin-top:16px;padding-top:12px;border-top:1px solid ${C.border}}
.legend{position:absolute;bottom:12px;left:12px;display:flex;align-items:center;gap:8px;background:rgba(6,6,8,.85);padding:8px 12px;border-radius:6px;font-size:12px;color:${C.textMid};border:1px solid ${C.border};pointer-events:none}
.legend canvas{border-radius:2px}
.people-bar{position:absolute;top:12px;right:20px;display:flex;gap:12px;pointer-events:none}
.person-badge{display:flex;flex-direction:column;align-items:center;gap:2px}
.person-badge .avatar{width:36px;height:36px;border-radius:50%;background:${C.accent};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff}
.person-badge .pname{font-size:12px;color:${C.textMuted}}
</style>
<div class="shell">
<div class="toolbar"><div class="section" id="ft"></div><div class="sep"></div><div class="section" id="lb"></div><button class="edit-btn" id="eb">Edit</button></div>
<div class="main"><canvas id="cv"></canvas><div class="sidebar" id="sb"></div><div class="legend" id="lg"></div><div class="people-bar" id="pb"></div></div>
</div>`;
    const S=this.shadowRoot;this._cv=S.getElementById("cv");this._ctx=this._cv.getContext("2d");this._sb=S.getElementById("sb");this._lg=S.getElementById("lg");this._pb=S.getElementById("pb");
    const lc=S.getElementById("lb");
    for(const L of LAYERS){const b=document.createElement("button");b.className="lbtn"+(this._layers[L.id]?" on":"");b.textContent=L.label;b.dataset.layer=L.id;b.addEventListener("click",()=>{this._layers[L.id]=!this._layers[L.id];b.classList.toggle("on",this._layers[L.id]);this._hmCache=null;this._scheduleRender();this._updateLegend()});lc.appendChild(b)}
    S.getElementById("eb").addEventListener("click",()=>{this._editMode=!this._editMode;const eb=S.getElementById("eb");eb.classList.toggle("on",this._editMode);eb.textContent=this._editMode?"Done":"Edit";this._selRoom=null;this._selElem=null;this._mergeSet.clear();this._refreshTabs();this._renderSidebar();this._scheduleRender()});
    this._cv.addEventListener("mousedown",this._boundMouse.down);this._cv.addEventListener("mousemove",this._boundMouse.move);this._cv.addEventListener("mouseup",this._boundMouse.up);this._cv.addEventListener("mouseleave",this._boundMouse.up);
    // Prevent context menu on canvas
    this._cv.addEventListener("contextmenu",(e)=>e.preventDefault());
    // Double-click to reset view
    this._cv.addEventListener("dblclick",()=>{this._userZoom=false;this._hmCache=null;this._scheduleRender()});
    // Wheel: trackpad scroll = pan, pinch or ctrl+scroll = zoom
    this._cv.addEventListener("wheel",(e)=>{
      e.preventDefault();
      if(e.ctrlKey){
        // Pinch-to-zoom or ctrl+scroll → zoom centered on cursor
        const[sx,sy]=this._canvasXY(e);
        const[wx,wy]=this._toWorld(sx,sy);
        // Gentle zoom: use actual delta for smooth pinch
        const factor=Math.pow(0.99,e.deltaY);
        this._scale=Math.max(0.1,Math.min(10,this._scale*factor));
        this._panX=sx-wx*this._scale;
        this._panY=sy-wy*this._scale;
      }else{
        // Regular two-finger scroll → pan
        this._panX-=e.deltaX;
        this._panY-=e.deltaY;
      }
      this._userZoom=true;this._hmCache=null;this._scheduleRender();
    },{passive:false});
    // Drag-and-drop from sidebar onto canvas
    this._cv.addEventListener("dragover",(e)=>{e.preventDefault();e.dataTransfer.dropEffect="copy"});
    this._cv.addEventListener("drop",(e)=>{
      e.preventDefault();
      try{
        const data=JSON.parse(e.dataTransfer.getData("text/plain"));
        if(!data.eid||!data.sec||!data.cont||!this._selRoom)return;
        const[sx,sy]=[e.offsetX,e.offsetY];
        const[wx,wy]=this._toWorld(sx,sy);
        const b=rmBounds(this._selRoom);
        const rx=clamp01((wx-b.x)/b.w), ry=clamp01((wy-b.y)/b.h);
        const arr=data.cont==="sensors"?this._selRoom.sensors[data.sec]:this._selRoom[data.sec];
        arr.push({entity_id:data.eid,x:rx,y:ry});
        this._hmCache=null;this._debounceSave();this._scheduleRender();this._renderEL(this._selRoom);
      }catch{}
    });
    // Delete key to remove selected room
    this._cv.setAttribute("tabindex","0");
    this._cv.addEventListener("keydown",(e)=>{
      if(!this._editMode||!this._selRoom)return;
      if(e.key==="Delete"||e.key==="Backspace"){
        e.preventDefault();
        // If an element is selected, delete that element, not the room
        if(this._selElem){
          const rm=this._selRoom;
          const arr=["temperature","humidity","occupancy"].includes(this._selElem.type)?rm.sensors[this._selElem.type]:rm[this._selElem.type];
          if(arr&&this._selElem.index<arr.length){
            arr.splice(this._selElem.index,1);
            this._selElem=null;this._hmCache=null;
            this._debounceSave();this._renderSidebar();this._scheduleRender();
          }
          return;
        }
        // Otherwise delete the room
        const f=this._floor();if(!f)return;
        const idx=f.rooms.indexOf(this._selRoom);
        if(idx>=0&&confirm(`Delete "${this._selRoom.name}"?`)){
          f.rooms.splice(idx,1);this._selRoom=null;this._selElem=null;this._hmCache=null;
          this._debounceSave();this._renderSidebar();this._scheduleRender();
        }
      }
    });
    this._ro=new ResizeObserver(()=>this._resizeCanvas());this._ro.observe(this._cv);this._resizeCanvas();this._updateLegend();
  }
  disconnectedCallback(){if(this._ro)this._ro.disconnect();cancelAnimationFrame(this._rafId)}

  _refreshTabs(){const c=this.shadowRoot.getElementById("ft");if(!c)return;c.innerHTML="";this._floors.forEach((f,i)=>{const b=document.createElement("button");b.className="tab"+(i===this._floorIdx?" active":"");b.textContent=f.name;b.addEventListener("click",()=>{this._floorIdx=i;this._selRoom=null;this._selElem=null;this._hmCache=null;this._refreshTabs();this._renderSidebar();this._scheduleRender()});c.appendChild(b)});if(this._editMode){const ab=document.createElement("button");ab.className="tab add";ab.textContent="+";ab.addEventListener("click",()=>{const n=prompt("Floor name:",`Floor ${this._floors.length+1}`);if(!n)return;this._floors.push({id:uid(),name:n,rooms:[]});this._floorIdx=this._floors.length-1;this._debounceSave();this._refreshTabs();this._scheduleRender()});c.appendChild(ab)}}

  _updateLegend(){const l=this._lg;if(!l)return;l.innerHTML="";const a=this._layers.temperature?"temperature":this._layers.humidity?"humidity":null;if(!a){l.style.display="none";return}l.style.display="flex";
    const isT=a==="temperature";const u=isT?"\u00b0C":"%";
    // Use dynamic range if available, otherwise defaults
    const range=this._hmRange&&this._hmRange.type===a?this._hmRange:null;
    const lo=range?range.min:(isT?TEMP_MIN:HUM_MIN);
    const hi=range?range.max:(isT?TEMP_MAX:HUM_MAX);
    const fn=isT?(v)=>tempToRgb(v,lo,hi):(v)=>humToRgb(v,lo,hi);
    l.appendChild(Object.assign(document.createElement("span"),{textContent:`${lo.toFixed(1)}${u}`}));const bar=document.createElement("canvas");bar.width=160;bar.height=16;const bc=bar.getContext("2d");for(let x=0;x<160;x++){const[r,g,b]=fn(lo+(x/159)*(hi-lo));bc.fillStyle=`rgb(${r},${g},${b})`;bc.fillRect(x,0,1,16)}l.appendChild(bar);l.appendChild(Object.assign(document.createElement("span"),{textContent:`${hi.toFixed(1)}${u}`}))}

  _updatePeople(){
    const pb=this._pb;if(!pb||!this._hass)return;
    pb.innerHTML="";
    const persons=Object.entries(this._hass.states).filter(([e])=>e.startsWith("person."));
    for(const[eid,s]of persons){
      const name=s.attributes?.friendly_name||eid.split(".")[1];
      const home=s.state.toLowerCase()==="home";
      const initials=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
      const d=document.createElement("div");d.className="person-badge";
      d.innerHTML=`<div class="avatar" style="opacity:${home?1:.3}">${initials}</div><div class="pname">${name.split(" ")[0]}${home?"":" (away)"}</div>`;
      pb.appendChild(d);
    }
  }

  _resizeCanvas(){const cv=this._cv;if(!cv)return;const d=window.devicePixelRatio||1;const r=cv.getBoundingClientRect();cv.width=r.width*d;cv.height=r.height*d;this._dpr=d;this._cvW=r.width;this._cvH=r.height;this._hmCache=null;this._userZoom=false;this._scheduleRender()}
  _scheduleRender(){if(this._rafId)return;this._rafId=requestAnimationFrame(()=>{this._rafId=null;this._draw()})}

  _autoFit(){
    // Skip auto-fit during interactions or if user has manually zoomed/panned
    if(this._action||this._userZoom)return;
    const f=this._floor();if(!f||!f.rooms.length){this._scale=1;this._panX=this._cvW/2;this._panY=this._cvH/2;return}
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const rm of f.rooms){const b=rmBounds(rm);x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h)}
    const fw=x1-x0,fh=y1-y0;if(fw<=0||fh<=0){this._scale=1;this._panX=this._cvW/2;this._panY=this._cvH/2;return}
    this._scale=Math.min((this._cvW-PAD*2)/fw,(this._cvH-PAD*2)/fh,3);
    this._panX=(this._cvW-fw*this._scale)/2-x0*this._scale;
    this._panY=(this._cvH-fh*this._scale)/2-y0*this._scale;
  }
  _resetView(){this._userZoom=false;this._hmCache=null;this._scheduleRender()}
  _toWorld(sx,sy){return[(sx-this._panX)/this._scale,(sy-this._panY)/this._scale]}
  _toScreen(wx,wy){return[wx*this._scale+this._panX,wy*this._scale+this._panY]}
  _elemWorld(rm,el){const b=rmBounds(rm);return[b.x+el.x*b.w,b.y+el.y*b.h]}

  /* ── draw ─────────────────────────────────────────────── */
  _draw(){
    const ctx=this._ctx,dpr=this._dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,this._cvW,this._cvH);
    this._autoFit();const f=this._floor();if(!f)return;
    if(this._editMode)this._drawGrid(ctx);
    if(this._layers.temperature||this._layers.humidity)this._drawHeatMap(ctx,f);
    if(this._layers.lights)this._drawLights(ctx,f);
    this._drawRooms(ctx,f);
    if(this._layers.temperature)this._drawValues(ctx,f,"temperature","\u00b0C");
    if(this._layers.humidity)this._drawValues(ctx,f,"humidity","%");
    if(this._layers.heating)this._drawHeating(ctx,f);
    if(this._layers.windows)this._drawWindows(ctx,f);
    if(this._layers.occupancy)this._drawOccupancy(ctx,f);
    this._drawLabels(ctx,f);
    if(this._editMode){this._drawDimensions(ctx,f);this._drawElements(ctx,f);if(this._selRoom)this._drawHandles(ctx,this._selRoom)}
    this._drawScaleBar(ctx);
    if(this._editMode&&(this._action==="resize"||this._action==="move")&&this._selRoom)this._drawEdgeDims(ctx,this._selRoom);
    if(this._action==="draw"&&this._actionData.preview){const p=this._actionData.preview;const[sx,sy]=this._toScreen(p.x,p.y);ctx.strokeStyle="rgba(123,97,255,.7)";ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.strokeRect(sx,sy,p.w*this._scale,p.h*this._scale);ctx.setLineDash([]);this._drawEdgeDims(ctx,p)}
    this._updatePeople();
    this._updateLegend();
  }

  _drawGrid(ctx){const gs=GRID*this._scale;if(gs<4)return;const ms=this._upm*this._scale;ctx.strokeStyle="rgba(186,192,202,.04)";ctx.lineWidth=.5;const ox=this._panX%gs,oy=this._panY%gs;for(let x=ox;x<this._cvW;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this._cvH);ctx.stroke()}for(let y=oy;y<this._cvH;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this._cvW,y);ctx.stroke()}if(ms>20){ctx.strokeStyle="rgba(123,97,255,.08)";ctx.lineWidth=1;const mx=this._panX%ms,my=this._panY%ms;for(let x=mx;x<this._cvW;x+=ms){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this._cvH);ctx.stroke()}for(let y=my;y<this._cvH;y+=ms){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this._cvW,y);ctx.stroke()}}}

  _drawRooms(ctx,f){for(const rm of f.rooms){const isSel=rm===this._selRoom;const isMerge=this._mergeSet.has(rm);
    // Selected room: subtle glow
    if(isSel){ctx.save();ctx.shadowColor="rgba(123,97,255,.35)";ctx.shadowBlur=20}
    ctx.fillStyle=isMerge?"rgba(229,166,32,.06)":C.roomFill;
    ctx.strokeStyle=isSel?C.wallStrokeSel:isMerge?"rgba(229,166,32,.5)":C.wallStroke;
    ctx.lineWidth=isSel?1.5:1;
    for(const r of rmRects(rm)){const[sx,sy]=this._toScreen(r.x,r.y);ctx.fillRect(sx,sy,r.w*this._scale,r.h*this._scale);ctx.strokeRect(sx,sy,r.w*this._scale,r.h*this._scale)}
    if(isSel)ctx.restore()}}

  _drawLabels(ctx,f){ctx.textAlign="center";ctx.textBaseline="middle";for(const rm of f.rooms){const b=rmBounds(rm);const[cx,cy]=this._toScreen(b.x+b.w/2,b.y+b.h/2);const fs=Math.max(13,Math.min(20,b.w*this._scale*.12));ctx.font=`600 ${fs}px ${C.font}`;ctx.save();ctx.shadowColor="rgba(0,0,0,.6)";ctx.shadowBlur=4;ctx.fillStyle=C.text;ctx.fillText(rm.name||"?",cx,cy,b.w*this._scale-12);ctx.restore()}}

  _drawDimensions(ctx,f){ctx.textAlign="center";ctx.textBaseline="bottom";ctx.font=`500 13px ${C.font}`;ctx.fillStyle=C.textMuted;for(const rm of f.rooms){for(const r of rmRects(rm)){const wm=(r.w/this._upm).toFixed(1),hm=(r.h/this._upm).toFixed(1);const[cx,cy]=this._toScreen(r.x+r.w/2,r.y+r.h);ctx.fillText(`${wm} \u00d7 ${hm}m`,cx,cy-4)}}}

  /* show dimensions on edges while dragging/resizing/drawing */
  _drawEdgeDims(ctx,rm){
    const r=rm.rects?rm.rects[this._selRect||0]:rm;if(!r)return;
    const[sx,sy]=this._toScreen(r.x,r.y);const sw=r.w*this._scale,sh=r.h*this._scale;
    const wm=(r.w/this._upm).toFixed(2),hm=(r.h/this._upm).toFixed(2);
    ctx.font=`600 14px ${C.font}`;ctx.fillStyle=C.accent;
    // width on top
    ctx.textAlign="center";ctx.textBaseline="bottom";
    const pill=(text,x,y)=>{const tw=ctx.measureText(text).width+12;ctx.fillStyle="rgba(6,6,8,.85)";ctx.beginPath();ctx.roundRect(x-tw/2,y-22,tw,24,4);ctx.fill();ctx.fillStyle=C.accent;ctx.fillText(text,x,y-2)};
    pill(`${wm}m`,sx+sw/2,sy-2);
    // height on left
    ctx.save();ctx.translate(sx-4,sy+sh/2);ctx.rotate(-Math.PI/2);pill(`${hm}m`,0,0);ctx.restore();
  }

  _drawScaleBar(ctx){const bl=this._upm*this._scale;if(bl<20||bl>this._cvW*.4)return;const bx=this._cvW-24-bl,by=this._cvH-50;ctx.strokeStyle=C.textMuted;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+bl,by);ctx.stroke();ctx.beginPath();ctx.moveTo(bx,by-5);ctx.lineTo(bx,by+5);ctx.stroke();ctx.beginPath();ctx.moveTo(bx+bl,by-5);ctx.lineTo(bx+bl,by+5);ctx.stroke();ctx.font=`500 11px ${C.font}`;ctx.textAlign="center";ctx.textBaseline="bottom";ctx.fillStyle=C.textMuted;ctx.fillText("1m",bx+bl/2,by-7)}

  /* ── heatmap ──────────────────────────────────────────── */
  _drawHeatMap(ctx,f){
    const type=this._layers.temperature?"temperature":"humidity";

    // Build per-room sensor data
    const roomData=[];
    let allVals=[];
    for(const rm of f.rooms){
      const sensors=[];
      for(const el of(rm.sensors?.[type]||[])){
        const s=this._hass.states[el.entity_id];if(!s||isNaN(parseFloat(s.state)))continue;
        const[wx,wy]=this._elemWorld(rm,el);
        const v=parseFloat(s.state);sensors.push({wx,wy,v});allVals.push(v);
      }
      const screenRects=rmRects(rm).map(r=>{const[sx,sy]=this._toScreen(r.x,r.y);return{x:sx,y:sy,w:r.w*this._scale,h:r.h*this._scale}});
      if(sensors.length)roomData.push({rm,sensors,screenRects,screenSensors:sensors.map(s=>{const[sx,sy]=this._toScreen(s.wx,s.wy);return{x:sx,y:sy,v:s.v}})});
    }
    if(!allVals.length)return;

    // Fixed absolute scales: temp 0–30°C, humidity 0–100%
    let vMin,vMax;
    if(type==="temperature"){
      vMin=0;vMax=30;
    }else{
      vMin=0;vMax=100;
    }
    this._hmRange={min:vMin,max:vMax,type};
    const fn=type==="temperature"?(v)=>tempToRgb(v,vMin,vMax):(v)=>humToRgb(v,vMin,vMax);

    const key=type+"|"+allVals.join(",")+`|${this._scale}|${this._panX}|${this._panY}|${this._cvW}|${this._cvH}`;
    if(this._hmKey===key&&this._hmCache){ctx.putImageData(this._hmCache,0,0);return}

    const w=Math.max(1,Math.ceil(this._cvW/HEATMAP_RES)),h=Math.max(1,Math.ceil(this._cvH/HEATMAP_RES));
    if(!isFinite(w)||!isFinite(h))return;
    const off=new OffscreenCanvas(w,h);const oc=off.getContext("2d");const img=oc.createImageData(w,h);const d=img.data;

    for(let py=0;py<h;py++){const sy=py*HEATMAP_RES+HEATMAP_RES/2;
      for(let px=0;px<w;px++){const sx=px*HEATMAP_RES+HEATMAP_RES/2;
        // Find which room this pixel is in
        let rd=null;
        for(const r of roomData){for(const rc of r.screenRects){if(sx>=rc.x&&sx<=rc.x+rc.w&&sy>=rc.y&&sy<=rc.y+rc.h){rd=r;break}}if(rd)break}
        if(!rd)continue;

        let val;
        if(rd.screenSensors.length===1){
          // Single sensor: flat fill, no gradient
          val=rd.screenSensors[0].v;
        }else{
          // Multiple sensors in this room: IDW only from this room's sensors
          let wS=0,wV=0;
          for(const sp of rd.screenSensors){
            const dx=sx-sp.x,dy=sy-sp.y;
            const wt=1/Math.pow(Math.max(Math.sqrt(dx*dx+dy*dy),1),1.5);
            wS+=wt;wV+=wt*sp.v;
          }
          val=wV/wS;
        }
        const[r,g,b]=fn(val);
        const idx=(py*w+px)*4;d[idx]=r;d[idx+1]=g;d[idx+2]=b;d[idx+3]=150;
      }
    }
    oc.putImageData(img,0,0);ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    ctx.drawImage(off,0,0,w,h,0,0,this._cvW,this._cvH);ctx.restore();
    try{this._hmCache=ctx.getImageData(0,0,Math.max(1,Math.round(this._cvW*this._dpr)),Math.max(1,Math.round(this._cvH*this._dpr)))}catch{this._hmCache=null}
    this._hmKey=key;
  }

  /* ── sensor values ────────────────────────────────────── */
  _drawValues(ctx,f,type,unit){
    ctx.font=`600 13px ${C.font}`;ctx.textAlign="center";ctx.textBaseline="middle";
    const accent=type==="temperature"?C.amber:"#2196f3";
    for(const rm of f.rooms)for(const el of(rm.sensors?.[type]||[])){
      const s=this._hass.states[el.entity_id];if(!s||isNaN(parseFloat(s.state)))continue;
      const[wx,wy]=this._elemWorld(rm,el);const[cx,cy]=this._toScreen(wx,wy);
      const text=`${parseFloat(s.state).toFixed(1)}${unit}`;const tw=ctx.measureText(text).width+14;
      const ph=22,pr=11;
      ctx.fillStyle="rgba(6,6,8,.8)";ctx.beginPath();ctx.roundRect(cx-tw/2,cy-ph/2,tw,ph,pr);ctx.fill();
      ctx.strokeStyle="rgba(186,192,202,.12)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(cx-tw/2,cy-ph/2,tw,ph,pr);ctx.stroke();
      ctx.fillStyle=accent;ctx.fillText(text,cx,cy);
    }
  }

  /* ── lights ───────────────────────────────────────────── */
  _drawLights(ctx,f){for(const rm of f.rooms)for(const el of(rm.lights||[])){
    const s=this._hass.states[el.entity_id];if(!s)continue;
    const on=s.state==="on";
    const[wx,wy]=this._elemWorld(rm,el);const[cx,cy]=this._toScreen(wx,wy);
    if(on){
      const bri=s.attributes?.brightness||255;const pct=bri/255;
      // Get light color if available, otherwise warm white
      const rgb=s.attributes?.rgb_color;
      const r=rgb?rgb[0]:255, g=rgb?rgb[1]:210, b=rgb?rgb[2]:80;
      // Large, bright glow proportional to brightness
      const rad=(80+60*pct)*this._scale/2;
      const alpha=0.3+0.4*pct;
      const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,rad);
      grad.addColorStop(0,`rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.5,`rgba(${r},${g},${b},${alpha*0.4})`);
      grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.fill();
    } else {
      // Off light: small dim circle
      ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fillStyle="rgba(100,100,100,.3)";ctx.fill();
    }
  }}

  /* ── heating ──────────────────────────────────────────── */
  _drawHeating(ctx,f){for(const rm of f.rooms)for(const el of(rm.climate||[])){
    const s=this._hass.states[el.entity_id];if(!s)continue;
    const active=s.state==="heat"&&s.attributes?.temperature>(s.attributes?.current_temperature||0);
    const[wx,wy]=this._elemWorld(rm,el);const[cx,cy]=this._toScreen(wx,wy);
    // Active radiator: warm red glow
    if(active){
      const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,30*this._scale/2);
      grad.addColorStop(0,"rgba(255,60,20,.25)");grad.addColorStop(1,"rgba(255,60,20,0)");
      ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,cy,30*this._scale/2,0,Math.PI*2);ctx.fill();
    }
    // Dark circle background
    ctx.beginPath();ctx.arc(cx,cy,14,0,Math.PI*2);ctx.fillStyle="rgba(6,6,8,.7)";ctx.fill();
    drawIcon(ctx,"climate",cx,cy,16,active);
    const t=s.attributes?.temperature,c2=s.attributes?.current_temperature;
    if(t!=null){ctx.font=`600 12px ${C.font}`;ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillStyle=active?C.coral:C.textMuted;ctx.fillText(c2!=null?`${c2}\u2192${t}\u00b0`:`\u2192${t}\u00b0`,cx+18,cy)}
  }}

  /* ── windows ──────────────────────────────────────────── */
  _drawWindows(ctx,f){for(const rm of f.rooms)for(const el of(rm.windows||[])){
    const s=this._hass.states[el.entity_id];if(!s)continue;
    const isOpen=s.state==="on";
    const[wx,wy]=this._elemWorld(rm,el);const[cx,cy]=this._toScreen(wx,wy);
    // Dark circle background
    ctx.beginPath();ctx.arc(cx,cy,14,0,Math.PI*2);ctx.fillStyle="rgba(6,6,8,.7)";ctx.fill();
    if(isOpen){
      ctx.save();ctx.shadowColor="rgba(255,107,74,.3)";ctx.shadowBlur=12;
      drawIcon(ctx,"windows",cx,cy,18,true);
      ctx.restore();
      const label="Open";
      ctx.font=`600 11px ${C.font}`;ctx.textAlign="center";ctx.textBaseline="middle";
      const tw=ctx.measureText(label).width+10;const py=cy+16;
      ctx.fillStyle="rgba(255,107,74,.15)";ctx.beginPath();ctx.roundRect(cx-tw/2,py-9,tw,18,9);ctx.fill();
      ctx.fillStyle=C.coral;ctx.fillText(label,cx,py);
    }else{
      drawIcon(ctx,"windows",cx,cy,14,false);
      ctx.beginPath();ctx.arc(cx,cy+14,3,0,Math.PI*2);ctx.fillStyle=C.green;ctx.fill();
    }
  }}

  /* ── occupancy ────────────────────────────────────────── */
  _drawOccupancy(ctx,f){for(const rm of f.rooms)for(const el of(rm.sensors?.occupancy||[])){
    const s=this._hass.states[el.entity_id];if(!s)continue;
    const on=s.state==="on"||parseFloat(s.state)>0;
    const[wx,wy]=this._elemWorld(rm,el);const[cx,cy]=this._toScreen(wx,wy);
    // Dark circle background
    ctx.beginPath();ctx.arc(cx,cy,14,0,Math.PI*2);ctx.fillStyle="rgba(6,6,8,.7)";ctx.fill();
    if(on){
      // Glow halo
      const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,26);
      grad.addColorStop(0,"rgba(76,175,80,.2)");grad.addColorStop(1,"rgba(76,175,80,0)");
      ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,cy,26,0,Math.PI*2);ctx.fill();
      drawIcon(ctx,"occupancy",cx,cy,18,true);
    }else{
      drawIcon(ctx,"occupancy",cx,cy,14,false);
    }
  }}

  /* ── element markers (edit mode) ──────────────────────── */
  _drawElements(ctx,f){
    for(const rm of f.rooms){
      const all=this._allElems(rm);
      for(const{type,index,el}of all){
        const[wx,wy]=this._elemWorld(rm,el);const[cx,cy]=this._toScreen(wx,wy);
        const isSel=this._selRoom===rm&&this._selElem?.type===type&&this._selElem?.index===index;
        const sz=isSel?MARKER+4:MARKER;
        // background circle
        ctx.beginPath();ctx.arc(cx,cy,sz/2+4,0,Math.PI*2);
        ctx.fillStyle=isSel?C.card:"rgba(6,6,8,.6)";ctx.fill();
        ctx.strokeStyle=isSel?ELEM_COL[type]:"rgba(186,192,202,.3)";ctx.lineWidth=isSel?2:1;ctx.stroke();
        // icon
        drawIcon(ctx,type,cx,cy,sz,true);
        // label with friendly name
        const s=this._hass.states[el.entity_id];
        const name=s?.attributes?.friendly_name||el.entity_id.split(".").pop();
        const shortName=name.length>25?name.slice(0,22)+"...":name;
        ctx.font=`500 10px ${C.font}`;ctx.textAlign="left";ctx.textBaseline="middle";
        ctx.fillStyle=C.textMuted;
        ctx.fillText(shortName,cx+sz/2+6,cy);
      }
    }
  }

  _allElems(rm){const out=[];for(const k of["temperature","humidity","occupancy"])for(let i=0;i<(rm.sensors?.[k]?.length||0);i++)out.push({type:k,index:i,el:rm.sensors[k][i],container:rm.sensors[k]});for(const k of["lights","climate","windows"])for(let i=0;i<(rm[k]?.length||0);i++)out.push({type:k,index:i,el:rm[k][i],container:rm[k]});return out}

  _drawHandles(ctx,rm){for(const h of this._getHandles(rm)){const[sx,sy]=this._toScreen(h.wx,h.wy);ctx.beginPath();ctx.arc(sx,sy,HANDLE/2+1,0,Math.PI*2);ctx.fillStyle=C.card;ctx.fill();ctx.strokeStyle=C.accent;ctx.lineWidth=2;ctx.stroke()}}
  _getHandles(rm){if(!rm)return[];const rs=rmRects(rm);const r=rs[this._selRect]||rs[0];if(!r)return[];const{x,y,w,h}=r;return[{wx:x,wy:y,cursor:"nw-resize",dx:-1,dy:-1},{wx:x+w/2,wy:y,cursor:"n-resize",dx:0,dy:-1},{wx:x+w,wy:y,cursor:"ne-resize",dx:1,dy:-1},{wx:x,wy:y+h/2,cursor:"w-resize",dx:-1,dy:0},{wx:x+w,wy:y+h/2,cursor:"e-resize",dx:1,dy:0},{wx:x,wy:y+h,cursor:"sw-resize",dx:-1,dy:1},{wx:x+w/2,wy:y+h,cursor:"s-resize",dx:0,dy:1},{wx:x+w,wy:y+h,cursor:"se-resize",dx:1,dy:1}]}

  /* ── hit testing ──────────────────────────────────────── */
  _canvasXY(e){const r=this._cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
  _hitRoom(wx,wy,f){for(let i=f.rooms.length-1;i>=0;i--){if(ptInRoom(wx,wy,f.rooms[i]))return f.rooms[i]}return null}
  _hitSubRect(wx,wy,rm){const rs=rmRects(rm);for(let i=rs.length-1;i>=0;i--)if(ptInRect(wx,wy,rs[i]))return i;return 0}
  _hitHandle(sx,sy){if(!this._selRoom)return null;for(const h of this._getHandles(this._selRoom)){const[hx,hy]=this._toScreen(h.wx,h.wy);if(Math.abs(sx-hx)<HANDLE+2&&Math.abs(sy-hy)<HANDLE+2)return h}return null}
  _hitElement(sx,sy,room){if(!room)return null;const hitR=MARKER+8;for(const item of this._allElems(room)){const[wx,wy]=this._elemWorld(room,item.el);const[ex,ey]=this._toScreen(wx,wy);if(Math.abs(sx-ex)<hitR&&Math.abs(sy-ey)<hitR)return item}return null}

  /* ── mouse ────────────────────────────────────────────── */
  _onDown(e){this._cv.focus();const f=this._floor();if(!f)return;const[sx,sy]=this._canvasXY(e);const[wx,wy]=this._toWorld(sx,sy);
    // Middle-click or ctrl+left-click → pan
    if(e.button===1||(e.button===0&&e.ctrlKey&&!e.shiftKey)){
      e.preventDefault();this._action="pan";this._actionData={startSx:sx,startSy:sy,origPanX:this._panX,origPanY:this._panY};this._userZoom=true;return;
    }
    if(e.button!==0)return;
    if(this._editMode){
      // 1. Elements first (so edge-positioned windows/radiators can be grabbed)
      const hr=this._selRoom||this._hitRoom(wx,wy,f);
      // Also check nearby rooms for edge elements that extend slightly outside
      const roomsToCheck=hr?[hr]:[];
      if(this._selRoom&&this._selRoom!==hr)roomsToCheck.unshift(this._selRoom);
      for(const r of roomsToCheck){const el=this._hitElement(sx,sy,r);if(el){this._selRoom=r;this._selElem={type:el.type,index:el.index};this._action="drag_elem";this._actionData={elem:el,room:r};this._renderSidebar();this._scheduleRender();return}}
      // 2. Handles
      const h=this._hitHandle(sx,sy);if(h){const rs=rmRects(this._selRoom);const ar=rs[this._selRect]||rs[0];this._action="resize";this._actionData={handle:h,startWx:wx,startWy:wy,orig:{...ar},rectIdx:this._selRect||0};return}
      // 3. Room body — shift+click for merge selection
      const room=this._hitRoom(wx,wy,f);if(room){
        if(e.shiftKey){
          // Toggle room in merge set
          if(this._mergeSet.has(room))this._mergeSet.delete(room);
          else this._mergeSet.add(room);
          // Also add current selRoom to merge set if not already
          if(this._selRoom&&this._selRoom!==room&&!this._mergeSet.has(this._selRoom))this._mergeSet.add(this._selRoom);
          this._selRoom=room;this._selElem=null;
          this._renderSidebar();this._scheduleRender();return;
        }
        // Normal click clears merge set
        this._mergeSet.clear();
        this._selRoom=room;this._selRect=this._hitSubRect(wx,wy,room);this._selElem=null;
        if(this._addingSection){
          this._action="draw_section";this._actionData={startWx:snap(wx),startWy:snap(wy),preview:null};this._addingSection=false;this._renderSidebar();this._scheduleRender();return;
        }
        this._action="move";const rs=rmRects(room);this._actionData={startWx:wx,startWy:wy,origRects:rs.map(r=>({...r}))};this._renderSidebar();this._scheduleRender();return}
      // 4. Empty space
      this._selElem=null;
      if(this._addingSection&&this._selRoom){
        this._action="draw_section";this._actionData={startWx:snap(wx),startWy:snap(wy),preview:null};this._addingSection=false;this._renderSidebar();this._scheduleRender();return;
      }
      this._action="draw";this._actionData={startWx:snap(wx),startWy:snap(wy),preview:null};return
    }
    const room=this._hitRoom(wx,wy,f);if(room!==this._selRoom){this._selRoom=room;this._scheduleRender()}
  }
  _onMove(e){const[sx,sy]=this._canvasXY(e);const[wx,wy]=this._toWorld(sx,sy);const f=this._floor();
    if(this._action==="pan"){const d=this._actionData;this._panX=d.origPanX+(sx-d.startSx);this._panY=d.origPanY+(sy-d.startSy);this._hmCache=null;this._scheduleRender();return}
    if(this._action==="drag_elem"){const{elem,room}=this._actionData;const b=rmBounds(room);elem.el.x=clamp01((wx-b.x)/b.w);elem.el.y=clamp01((wy-b.y)/b.h);this._hmCache=null;this._scheduleRender();return}
    if(this._action==="move"){const d=this._actionData;const dx=snap(wx-d.startWx),dy=snap(wy-d.startWy);const rs=rmRects(this._selRoom);for(let i=0;i<rs.length;i++){rs[i].x=d.origRects[i].x+dx;rs[i].y=d.origRects[i].y+dy}this._hmCache=null;this._scheduleRender();return}
    if(this._action==="resize"){const{handle,startWx,startWy,orig,rectIdx}=this._actionData;const dw=wx-startWx,dh=wy-startWy;const r=rmRects(this._selRoom)[rectIdx];if(!r)return;if(handle.dx===-1){r.x=snap(orig.x+dw);r.w=snap(orig.w-dw)}if(handle.dx===1)r.w=snap(orig.w+dw);if(handle.dy===-1){r.y=snap(orig.y+dh);r.h=snap(orig.h-dh)}if(handle.dy===1)r.h=snap(orig.h+dh);if(r.w<MIN_ROOM)r.w=MIN_ROOM;if(r.h<MIN_ROOM)r.h=MIN_ROOM;this._hmCache=null;this._scheduleRender();return}
    if(this._action==="draw"||this._action==="draw_section"){const d=this._actionData;const ex=snap(wx),ey=snap(wy);d.preview={x:Math.min(d.startWx,ex),y:Math.min(d.startWy,ey),w:Math.abs(ex-d.startWx),h:Math.abs(ey-d.startWy)};this._scheduleRender();return}
    if(this._editMode&&f){const h=this._hitHandle(sx,sy);if(h){this._cv.style.cursor=h.cursor;return}const hr=this._selRoom||this._hitRoom(wx,wy,f);if(hr&&this._hitElement(sx,sy,hr)){this._cv.style.cursor="grab";return}this._cv.style.cursor=this._hitRoom(wx,wy,f)?"move":"crosshair"}else this._cv.style.cursor="default"
  }
  _onUp(){const f=this._floor();if(!f){this._action=null;return}
    if(this._action==="draw"&&this._actionData.preview){const p=this._actionData.preview;if(p.w>=MIN_ROOM&&p.h>=MIN_ROOM){const rm={id:uid(),name:"New Room",rects:[{x:p.x,y:p.y,w:p.w,h:p.h}],area_id:null,sensors:{temperature:[],humidity:[],occupancy:[]},lights:[],climate:[],windows:[]};f.rooms.push(rm);this._selRoom=rm;this._selRect=0;this._selElem=null;this._renderSidebar()}}
    if(this._action==="draw_section"&&this._actionData.preview&&this._selRoom){const p=this._actionData.preview;if(p.w>=MIN_ROOM&&p.h>=MIN_ROOM){if(!this._selRoom.rects)this._selRoom.rects=[{x:this._selRoom.x,y:this._selRoom.y,w:this._selRoom.w,h:this._selRoom.h}];this._selRoom.rects.push({x:p.x,y:p.y,w:p.w,h:p.h});this._selRect=this._selRoom.rects.length-1;this._renderSidebar()}}
    if(this._action){
      // Lock view after room interactions so auto-fit doesn't snap
      if(["move","resize","draw","draw_section"].includes(this._action))this._userZoom=true;
      this._hmCache=null;this._debounceSave();this._scheduleRender();
    }this._action=null;this._actionData={}}

  /* ── merge rooms ─────────────────────────────────────── */
  _mergeSelectedRooms(){
    const f=this._floor();if(!f)return;
    const rooms=[...this._mergeSet];if(rooms.length<2)return;
    const base=rooms[0];
    // Combine rects and elements from all rooms into the base
    for(let i=1;i<rooms.length;i++){
      const rm=rooms[i];
      // Add rects
      for(const r of rmRects(rm))base.rects.push({...r});
      // Merge sensors
      for(const k of["temperature","humidity","occupancy"])
        for(const el of(rm.sensors?.[k]||[]))base.sensors[k].push({...el});
      // Merge lights/climate/windows
      for(const k of["lights","climate","windows"])
        for(const el of(rm[k]||[]))base[k].push({...el});
      // Remove merged room from floor
      const idx=f.rooms.indexOf(rm);if(idx>=0)f.rooms.splice(idx,1);
    }
    this._mergeSet.clear();this._selRoom=base;this._selElem=null;this._hmCache=null;
    this._debounceSave();this._renderSidebar();this._scheduleRender();
  }

  /* ── sidebar ──────────────────────────────────────────── */
  _renderSidebar(){
    const sb=this._sb;if(!this._editMode){sb.classList.remove("open");this._mergeSet.clear();return}sb.classList.add("open");

    // Merge mode: show merge UI when multiple rooms selected
    if(this._mergeSet.size>=2){
      const names=[...this._mergeSet].map(r=>r.name||"?").join(", ");
      sb.innerHTML=`<h3>Merge Rooms</h3>
        <div style="font-size:18px;color:#ccc;margin-bottom:12px">${this._mergeSet.size} rooms selected:<br><strong style="color:#fff">${names}</strong></div>
        <p style="font-size:16px;color:#aaa">This will combine all sections and entities into one room. The first room's name and area will be kept.</p>
        <button id="do-merge" style="font-size:18px;padding:12px 20px;margin-top:12px;background:#ff9800">Merge ${this._mergeSet.size} rooms</button>
        <button id="cancel-merge" style="font-size:16px;margin-top:8px;background:transparent;border:1px solid #555;color:#ccc">Cancel</button>`;
      sb.querySelector("#do-merge").addEventListener("click",()=>this._mergeSelectedRooms());
      sb.querySelector("#cancel-merge").addEventListener("click",()=>{this._mergeSet.clear();this._renderSidebar();this._scheduleRender()});
      return;
    }

    if(!this._selRoom){const fl=this._floor();sb.innerHTML=`<h3>Edit Mode</h3><p style="font-size:13px;color:var(--secondary-text-color)">Drag on canvas to create rooms.<br>Click room to configure.<br>Drag markers to reposition.</p><label>Scale (units/m)</label><input id="su" type="number" value="${this._upm}" min="10" max="200" step="5"><div class="fe"><label>Floor name</label><input id="fn" value="${fl?.name||""}"><button class="danger" id="df" style="margin-top:12px">Delete floor</button></div>`;sb.querySelector("#su")?.addEventListener("change",e=>{this._upm=parseInt(e.target.value)||DEFAULT_UPM;this._debounceSave();this._scheduleRender()});sb.querySelector("#fn")?.addEventListener("change",e=>{if(fl){fl.name=e.target.value;this._refreshTabs();this._debounceSave()}});sb.querySelector("#df")?.addEventListener("click",()=>{if(this._floors.length<=1)return;if(!confirm(`Delete floor "${fl?.name}"?`))return;this._floors.splice(this._floorIdx,1);this._floorIdx=Math.min(this._floorIdx,this._floors.length-1);this._selRoom=null;this._refreshTabs();this._debounceSave();this._renderSidebar();this._scheduleRender()});return}
    const rm=this._selRoom;const ao=this._areas.map(a=>`<option value="${a.area_id}" ${a.area_id===rm.area_id?"selected":""}>${a.name}</option>`).join("");
    const b=rmBounds(rm);const wm=(b.w/this._upm).toFixed(1),hm=(b.h/this._upm).toFixed(1);
    const nRects=rmRects(rm).length;
    const secInfo=nRects>1?`<div style="font-size:14px;color:var(--secondary-text-color);margin:4px 0">${nRects} sections (click section to select, then resize)</div>`:"";
    sb.innerHTML=`<h3>${rm.name||"Room"}</h3><div style="font-size:16px;color:var(--primary-text-color,#ccc);margin-bottom:6px">${wm} \u00d7 ${hm} m</div>${secInfo}<label>Name</label><input id="sn" value="${rm.name||""}"><label>Area</label><select id="sa"><option value="">-- none --</option>${ao}</select><div style="display:flex;gap:6px;margin-top:8px"><button id="as">Add section</button>${nRects>1?`<button class="danger" id="rs">Remove section ${(this._selRect||0)+1}</button>`:""}</div><div id="se"></div><button class="danger" id="sd" style="margin-top:16px">Delete Room</button>`;
    sb.querySelector("#sn").addEventListener("change",e=>{rm.name=e.target.value;this._debounceSave();this._scheduleRender()});
    sb.querySelector("#sa").addEventListener("change",e=>{rm.area_id=e.target.value||null;this._hmCache=null;this._debounceSave();this._scheduleRender();this._renderEL(rm)});
    sb.querySelector("#as").addEventListener("click",()=>{this._addingSection=true;this._cv.style.cursor="crosshair";this._renderSidebar()});
    sb.querySelector("#rs")?.addEventListener("click",()=>{const rs=rmRects(rm);if(rs.length<=1)return;rs.splice(this._selRect||0,1);this._selRect=0;this._hmCache=null;this._debounceSave();this._renderSidebar();this._scheduleRender()});
    sb.querySelector("#sd").addEventListener("click",()=>{const fl=this._floor();const idx=fl.rooms.indexOf(rm);if(idx>=0)fl.rooms.splice(idx,1);this._selRoom=null;this._selElem=null;this._hmCache=null;this._debounceSave();this._renderSidebar();this._scheduleRender()});
    if(this._addingSection){sb.querySelector("#as").textContent="Draw new section on canvas...";sb.querySelector("#as").style.background="#e65100"}
    this._renderEL(rm);
  }

  _renderEL(rm){
    const c=this._sb.querySelector("#se");if(!c)return;
    const secs=[
      {key:"temperature",label:"Temperature",cont:"sensors",domain:"sensor",suffix:"_temperature"},
      {key:"humidity",label:"Humidity",cont:"sensors",domain:"sensor",suffix:"_humidity"},
      {key:"occupancy",label:"Motion / Occupancy",cont:"sensors",domain:"binary_sensor",dcMatch:["occupancy","motion","presence"]},
      {key:"lights",label:"Lights",cont:"direct",domain:"light"},
      {key:"climate",label:"Radiators / Climate",cont:"direct",domain:"climate"},
      {key:"windows",label:"Windows / Doors",cont:"direct",domain:"binary_sensor",dcMatch:["door","window","opening"]},
    ];

    // Get all entities in this room's area
    const available = this._getAreaEntities(rm.area_id);
    // Collect all entity_ids already added to this room
    const added = new Set();
    for(const k of["temperature","humidity","occupancy"])for(const el of(rm.sensors?.[k]||[]))added.add(el.entity_id);
    for(const k of["lights","climate","windows"])for(const el of(rm[k]||[]))added.add(el.entity_id);

    let html="";
    for(const sec of secs){
      const arr=sec.cont==="sensors"?(rm.sensors?.[sec.key]||[]):(rm[sec.key]||[]);
      const col=ELEM_COL[sec.key];

      // ── Added entities ──
      html+=`<label style="margin-top:14px">${sec.label} <span style="opacity:.5">(${arr.length} on map)</span></label>`;
      for(let i=0;i<arr.length;i++){
        const el=arr[i];const s=this._hass.states[el.entity_id];
        const name=s?.attributes?.friendly_name||el.entity_id;
        const val=s?`${s.state}${s.attributes?.unit_of_measurement||""}`:"?";
        const isSel=this._selElem?.type===sec.key&&this._selElem?.index===i;
        html+=`<div class="er" style="${isSel?"background:rgba(3,169,244,.15)":""}"><span class="dot" style="background:${col}"></span><span class="eid" title="${el.entity_id}">${name}</span><span class="val">${val}</span><button class="rm" data-s="${sec.key}" data-c="${sec.cont}" data-i="${i}">&times;</button></div>`;
      }

      // ── Available (not yet added) ──
      const avail=available.filter(e=>{
        if(added.has(e.entity_id))return false;
        const eid=e.entity_id.toLowerCase();
        if(sec.domain&&!eid.startsWith(sec.domain+"."))return false;
        if(sec.suffix&&!eid.endsWith(sec.suffix))return false;
        if(sec.dcMatch){
          const dc=e.original_device_class||e.device_class||this._hass.states[e.entity_id]?.attributes?.device_class;
          if(!dc||!sec.dcMatch.includes(dc))return false;
        }
        return true;
      });

      if(avail.length){
        html+=`<div style="margin-top:4px;padding:4px 0;font-size:18px;color:#ccc">Available in area:</div>`;
        for(const ae of avail){
          const s=this._hass.states[ae.entity_id];
          const name=s?.attributes?.friendly_name||ae.entity_id;
          const val=s?`${s.state}${s.attributes?.unit_of_measurement||""}`:"";
          html+=`<div class="er" draggable="true" data-drag-sec="${sec.key}" data-drag-cont="${sec.cont}" data-drag-eid="${ae.entity_id}" style="cursor:grab"><span class="dot" style="background:${col}"></span><span class="eid" title="${ae.entity_id}">${name}</span><span class="val">${val}</span><button class="add-btn" data-s="${sec.key}" data-c="${sec.cont}" data-eid="${ae.entity_id}" style="cursor:pointer;color:#4caf50;font-size:28px;padding:0 8px;background:none;border:none;font-weight:bold">+</button></div>`;
        }
      }

    }

    // ── "Other entities in area" — anything not matched by typed sections above ──
    const shownInSections=new Set();
    for(const sec of secs){
      const avail2=available.filter(e=>{if(added.has(e.entity_id))return false;const eid=e.entity_id.toLowerCase();if(sec.domain&&!eid.startsWith(sec.domain+"."))return false;if(sec.suffix&&!eid.endsWith(sec.suffix))return false;if(sec.dcMatch){const dc=e.original_device_class||e.device_class||this._hass.states[e.entity_id]?.attributes?.device_class;if(!dc||!sec.dcMatch.includes(dc))return false}return true});
      avail2.forEach(e=>shownInSections.add(e.entity_id));
    }
    const otherAvail=available.filter(e=>!added.has(e.entity_id)&&!shownInSections.has(e.entity_id)&&(e.entity_id.startsWith("sensor.")||e.entity_id.startsWith("binary_sensor.")||e.entity_id.startsWith("light.")||e.entity_id.startsWith("switch.")));
    if(otherAvail.length){
      html+=`<label style="margin-top:14px">Other entities in area <span style="opacity:.5">(${otherAvail.length})</span></label>`;
      for(const ae of otherAvail){
        const s=this._hass.states[ae.entity_id];const name=s?.attributes?.friendly_name||ae.entity_id;const val=s?`${s.state}`:"";
        html+=`<div class="er" draggable="true" data-drag-sec="occupancy" data-drag-cont="sensors" data-drag-eid="${ae.entity_id}" style="cursor:grab"><span class="dot" style="background:#888"></span><span class="eid" title="${ae.entity_id}">${name}</span><span class="val">${val}</span><button class="add-btn" data-s="occupancy" data-c="sensors" data-eid="${ae.entity_id}" style="cursor:pointer;color:#4caf50;font-size:28px;padding:0 8px;background:none;border:none;font-weight:bold">+</button></div>`;
      }
    }

    // ── Search all entities (for things not in this area) ──
    html+=`<label style="margin-top:14px">Search all entities</label><input id="entity-search" placeholder="Type to search..." style="font-size:18px"><div id="search-results"></div>`;

    c.innerHTML=html;

    // Remove buttons
    c.querySelectorAll(".rm").forEach(b=>{b.addEventListener("click",()=>{
      const{s,c:cont,i}=b.dataset;(cont==="sensors"?rm.sensors[s]:rm[s]).splice(parseInt(i),1);
      this._selElem=null;this._hmCache=null;this._debounceSave();this._scheduleRender();this._renderEL(rm);
    })});

    // Add buttons (from available list)
    c.querySelectorAll(".add-btn").forEach(b=>{b.addEventListener("click",()=>{
      const{s,c:cont,eid}=b.dataset;
      const dy=s==="windows"?0:s==="climate"?.95:s==="lights"?.3:.5;
      const arr=cont==="sensors"?rm.sensors[s]:rm[s];
      arr.push({entity_id:eid,x:.5,y:dy});
      this._hmCache=null;this._debounceSave();this._scheduleRender();this._renderEL(rm);
    })});

    // Drag from sidebar to canvas
    c.querySelectorAll("[draggable=true]").forEach(row=>{row.addEventListener("dragstart",(e)=>{
      e.dataTransfer.setData("text/plain",JSON.stringify({eid:row.dataset.dragEid,sec:row.dataset.dragSec,cont:row.dataset.dragCont}));
      e.dataTransfer.effectAllowed="copy";
    })});

    // Entity search
    const searchInput=c.querySelector("#entity-search");
    const searchResults=c.querySelector("#search-results");
    if(searchInput)searchInput.addEventListener("input",()=>{
      const q=searchInput.value.toLowerCase().trim();
      if(q.length<2){searchResults.innerHTML="";return}
      const matches=Object.entries(this._hass.states).filter(([eid,s])=>{
        if(added.has(eid))return false;
        const fn=(s.attributes?.friendly_name||"").toLowerCase();
        return eid.toLowerCase().includes(q)||fn.includes(q);
      }).slice(0,15);
      searchResults.innerHTML=matches.map(([eid,s])=>{
        const name=s.attributes?.friendly_name||eid;const val=`${s.state}${s.attributes?.unit_of_measurement||""}`;
        return`<div class="er" draggable="true" data-drag-sec="lights" data-drag-cont="direct" data-drag-eid="${eid}" style="cursor:grab"><span class="dot" style="background:#888"></span><span class="eid" title="${eid}">${name}</span><span class="val">${val}</span><button class="add-btn" data-s="lights" data-c="direct" data-eid="${eid}" style="cursor:pointer;color:#4caf50;font-size:28px;padding:0 8px;background:none;border:none;font-weight:bold">+</button></div>`;
      }).join("");
      // Wire up the dynamically added buttons
      searchResults.querySelectorAll(".add-btn").forEach(b=>{b.addEventListener("click",()=>{
        const eid=b.dataset.eid;const dy=.5;rm.lights.push({entity_id:eid,x:.5,y:dy});
        this._hmCache=null;this._debounceSave();this._scheduleRender();this._renderEL(rm);
      })});
      searchResults.querySelectorAll("[draggable=true]").forEach(row=>{row.addEventListener("dragstart",(e)=>{
        e.dataTransfer.setData("text/plain",JSON.stringify({eid:row.dataset.dragEid,sec:row.dataset.dragSec,cont:row.dataset.dragCont}));
        e.dataTransfer.effectAllowed="copy";
      })});
    });

  }

  /* ── get entities in an area ─────────────────────────────── */
  _getAreaEntities(areaId){
    if(!areaId)return[];
    const dids=new Set();
    for(const d of(this._deviceReg||[]))if(d.area_id===areaId)dids.add(d.id);
    return this._entityReg.filter(e=>e.area_id===areaId||dids.has(e.device_id));
  }
}
// Store latest buildDom on window so existing elements can pick it up
window.__homeMapBuildDom = HomeMapPanel.prototype._buildDom;
window.__homeMapV = 24;
if(!customElements.get("home-map-panel")) customElements.define("home-map-panel",HomeMapPanel);
