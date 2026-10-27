(function(){
'use strict';
var T=window.THREE;
var N=7;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var Q=new URLSearchParams(location.search);
var forceT=Q.has('t')?parseFloat(Q.get('t')):null;   // test hook: ?t=0..6 jumps to a stop position
var still=Q.has('still');                            // test hook: stop after a few frames
var loaderEl=document.getElementById('loader');
function hideLoader(){loaderEl.classList.add('done');}
setTimeout(hideLoader,15000);if(still){loaderEl.style.display='none';}
function clamp(x,a,b){return Math.min(b,Math.max(a,x));}
function smooth(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function mix(a,b,t){return a+(b-a)*t;}

/* =====================================================================
   Story data: each photo has its own horizon, grade and pins
   h = horizon (0..1 from top), vx = vanishing point x, g = how much the ground plane moves
   ===================================================================== */
var STOPS=[
  {name:'Village gate',time:'Morning',file:'s0',h:0.72,vx:0.50,g:1.0,fx:0.5,fy:0.48,grade:[1.02,1.05,0.10,1.04],
   pins:[[0.50,0.13,'Welcome arch','Every guest walks in under it. Your host greets you here with a garland.'],[0.50,0.72,'The village road','A ten minute walk to the first courtyard.']]},
  {name:'Mud lane',time:'Early morning',file:'s1',h:0.56,vx:0.45,g:0.75,fx:0.5,fy:0.5,grade:[1.0,1.1,0.25,1.05],
   pins:[[0.45,0.42,'Clay and thatch','Thick mud walls keep the house cool, even at noon.'],[0.36,0.79,'Morning chores','Help with the first chores, then sit down for breakfast.']]},
  {name:'The fields',time:'Mid morning',file:'s2',h:0.38,vx:0.50,g:0.7,fx:0.5,fy:0.6,grade:[1.0,1.08,0.2,1.04],
   pins:[[0.62,0.50,'Cut a bundle','Hold the stalks low, cut with the sickle, tie a bundle.'],[0.33,0.30,'Shade trees','Lunch is served here, made from what you harvested.']]},
  {name:'Market',time:'Midday',file:'s3',h:0.2,vx:0.45,g:0.35,fx:0.5,fy:0.45,grade:[1.05,1.05,0.1,1.03],
   pins:[[0.25,0.32,'Warm welcomes','Stall owners will teach you a trade for the price of a smile.'],[0.84,0.42,'Fresh vegetables','Brinjal, beans and gourds, picked this morning.']]},
  {name:'Play ground',time:'Afternoon',file:'s4',h:0.62,vx:0.55,g:0.8,fx:0.5,fy:0.55,grade:[1.0,1.1,0.1,1.06],
   pins:[[0.66,0.46,'Bullock-cart race','Held every harvest festival. You can ride a calm cart at walking pace.'],[0.08,0.58,'The cheering crowd','Stand by the fence and shout for your favourite pair.']]},
  {name:'River',time:'Golden hour',file:'s5',h:0.17,vx:0.5,g:0.9,fx:0.5,fy:0.5,grade:[1.05,1.1,0.2,1.05],
   pins:[[0.21,0.63,'Wooden boats','Each boat seats four. Boatmen row and sing.'],[0.55,0.25,'Fishing boat','Evening fishermen bring in the catch at dusk.']]},
  {name:'Bonfire night',time:'Night',file:'s6',h:0.5,vx:0.5,g:0.15,fx:0.5,fy:0.45,grade:[1.0,1.05,0.0,1.1],
   pins:[[0.48,0.33,'The bonfire','Lit at dusk and fed all night with dry wood.'],[0.20,0.62,'Embers','Roast peanuts and sweet potatoes here.']]}
];
/* extra life layered over each photo */
var OV=[
  {dust:0.30,mist:0.15,birds:1,kites:0,fly:0,sparks:0},
  {dust:0.45,mist:0.12,birds:1,kites:0,fly:0,sparks:0},
  {dust:0.25,mist:0.10,birds:1,kites:0,fly:0,sparks:0},
  {dust:0.50,mist:0.00,birds:0,kites:0,fly:0,sparks:0},
  {dust:0.70,mist:0.00,birds:0,kites:1,fly:0,sparks:0},
  {dust:0.20,mist:0.30,birds:1,kites:0,fly:0,sparks:0},
  {dust:0.08,mist:0.00,birds:0,kites:0,fly:1,sparks:1}
];

/* ---------- planner ---------- */
var plan={who:'family',len:'night'};
var WHO={friends:'Friends',family:'Family',solo:'Solo'};
var LEN={
  day:{n:'Day trip',list:'Chai and breakfast, farm work, a market stroll, games and a boat ride, home before dark.'},
  night:{n:'One night',list:'Everything in the day trip, plus bonfire dancing, dinner under lanterns and a night in a clay hut.'},
  weekend:{n:'Weekend',list:'Two full days: the full tour, a second farm morning, a pottery class, and a longer game day with the village teams.'}
};
function renderPlan(){
  var el=document.getElementById('result');
  var extra=plan.who==='family'?'Kids get their own kite-making hour.':plan.who==='friends'?'You can enter the tug of war as a team.':'A host family sits with you at every meal.';
  el.innerHTML='<strong>'+WHO[plan.who]+' · '+LEN[plan.len].n+'</strong>'+LEN[plan.len].list+' '+extra;
}
document.querySelectorAll('.chips').forEach(function(g){
  g.addEventListener('click',function(e){
    var b=e.target.closest('.chip'); if(!b) return;
    plan[g.dataset.group]=b.dataset.v;
    g.querySelectorAll('.chip').forEach(function(c){c.setAttribute('aria-pressed',c===b?'true':'false');});
    renderPlan();
  });
});
renderPlan();

/* ---------- rail, credits ---------- */
var railEl=document.getElementById('rail'), railBtns=[];
STOPS.forEach(function(s,i){
  var b=document.createElement('button'); b.type='button'; b.setAttribute('aria-label','Go to stop '+(i+1)+': '+s.name);
  b.innerHTML='<span class="tick"></span><span class="nm">'+s.name+'</span>';
  b.addEventListener('click',function(){document.getElementById('stop-'+i).scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});});
  railEl.appendChild(b); railBtns.push(b);
});
var credits=null;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function shortTitle(t){return t.replace(/^File:/,'').replace(/\.[a-z]+$/i,'').replace(/_/g,' ').slice(0,60);}
fetch('photos/credits.json').then(function(r){return r.json();}).then(function(c){
  credits=c;
  document.querySelectorAll('.snap').forEach(function(f){
    var k=f.dataset.ph, it=c[k]; if(!it) return;
    f.querySelector('figcaption').innerHTML='<a href="'+esc(it.page)+'" target="_blank" rel="noopener">'+esc((it.artist||'Unknown').slice(0,34))+'</a> · '+esc(it.lic);
  });
  var ul=document.getElementById('creditList');
  Object.keys(c).sort().forEach(function(k){
    var it=c[k], li=document.createElement('li');
    li.innerHTML='<a href="'+esc(it.page)+'" target="_blank" rel="noopener">'+esc(shortTitle(it.title))+'</a> · '+esc((it.artist||'Unknown').slice(0,50))+' · '+esc(it.lic);
    ul.appendChild(li);
  });
}).catch(function(){});

/* ---------- scroll geometry ---------- */
var stopEls=[].slice.call(document.querySelectorAll('.stop')), panels=[].slice.call(document.querySelectorAll('.panel'));
var snaps=[].slice.call(document.querySelectorAll('.snap'));
var centers=[], midY=[], panelBox=[], vh=window.innerHeight;
function measure(){
  vh=window.innerHeight;
  panels.forEach(function(p){p.style.transform='none';});
  var sy=window.scrollY;
  centers=stopEls.map(function(el){var r=el.getBoundingClientRect();return r.top+sy+r.height/2-vh/2;});
  midY=stopEls.map(function(el){var r=el.getBoundingClientRect();return r.top+sy+r.height/2;});
  panelBox=panels.map(function(p){var r=p.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top+sy,b:r.bottom+sy};});
}
function sFromScroll(y){
  if(y<=centers[0]) return 0;
  for(var i=0;i<N-1;i++){ if(y<=centers[i+1]) return i+(y-centers[i])/Math.max(1,centers[i+1]-centers[i]); }
  return N-1;
}
measure();
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(measure);}
window.addEventListener('load',measure);

/* =====================================================================
   Stage
   ===================================================================== */
var canvas=document.getElementById('stage'), renderer=null;
try{ renderer=new T.WebGLRenderer({canvas:canvas,antialias:false,powerPreference:'high-performance'}); }catch(e){ renderer=null; }
if(!renderer){ document.body.classList.add('no-webgl'); hideLoader(); return; }
var maxDpr=Math.min(window.devicePixelRatio||1,1.5), dpr=maxDpr;
renderer.setPixelRatio(dpr);
renderer.setClearColor(0x0b0d1a,1);
var scene=new T.Scene(), cam=new T.OrthographicCamera(-1,1,1,-1,0,10);
var W=window.innerWidth,H=window.innerHeight;

var VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
var FS=[
'precision highp float;',
'uniform sampler2D tA;uniform sampler2D tB;',
'uniform vec4 pA;uniform vec4 pB;uniform vec4 cA;uniform vec4 cB;uniform vec4 gA;uniform vec4 gB;',
'uniform float mixF;uniform float blurA;uniform float blurB;uniform float uTime;uniform vec2 uMouse;uniform float uSway;uniform vec2 uRes;',
'varying vec2 vUv;',
'vec3 photo(sampler2D t,vec4 p,vec4 c,vec4 g,float blur){',
'  vec2 s=vec2(vUv.x,1.0-vUv.y);',
'  vec2 q=(s-0.5)*c.xy+c.zw;',
'  float h=p.x;vec2 vp=vec2(p.y,min(h,1.0));float m=p.z;float gr=p.w;',
'  float a=max((q.y-h)/max(1.0-h,0.05),0.0);',
'  float qs=a/(1.0+m*a);',
'  float f=1.0-m*(0.14+0.86*gr*clamp(qs,0.0,1.2));',
'  vec2 src=vp+(q-vp)*f;',
'  src+=(uMouse*vec2(0.012,0.006)+vec2(uSway,0.0))*(0.25+qs*gr);',
'  vec3 col=vec3(0.0);float ws=0.0;',
'  for(int i=0;i<6;i++){',
'    float k=float(i)/5.0;float sc=1.0-blur*0.07*k;',
'    vec2 u=vp+(src-vp)*sc;float w=1.0-k*0.55;',
'    col+=texture2D(t,vec2(u.x,1.0-u.y)).rgb*w;ws+=w;',
'  }',
'  col/=ws;',
'  col*=g.x;',
'  float l=dot(col,vec3(0.299,0.587,0.114));',
'  col=mix(vec3(l),col,g.y);',
'  col.r*=1.0+g.z*0.08;col.b*=1.0-g.z*0.10;',
'  col=(col-0.5)*g.w+0.5;',
'  return col;',
'}',
'void main(){',
'  vec3 col=photo(tA,pA,cA,gA,blurA);',
'  if(mixF>0.001){vec3 b=photo(tB,pB,cB,gB,blurB);col=mix(col,b,mixF);}',
'  vec2 d=(vUv-0.5)*vec2(uRes.x/uRes.y,1.0);',
'  float v=smoothstep(0.38,1.1,length(d));col*=1.0-v*0.36;',
'  float n=fract(sin(dot(vUv*uRes+vec2(uTime*37.0,uTime*11.0),vec2(12.9898,78.233)))*43758.5453);',
'  col+=(n-0.5)*0.03;',
'  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);',
'}'
].join('\n');

var blank=new T.DataTexture(new Uint8Array([20,20,30,255]),1,1,T.RGBAFormat); blank.needsUpdate=true;
var U={
  tA:{value:blank},tB:{value:blank},
  pA:{value:new T.Vector4(0.5,0.5,0,1)},pB:{value:new T.Vector4(0.5,0.5,0,1)},
  cA:{value:new T.Vector4(1,1,0.5,0.5)},cB:{value:new T.Vector4(1,1,0.5,0.5)},
  gA:{value:new T.Vector4(1,1,0,1)},gB:{value:new T.Vector4(1,1,0,1)},
  mixF:{value:0},blurA:{value:0},blurB:{value:0},uTime:{value:0},uMouse:{value:new T.Vector2()},uSway:{value:0},uRes:{value:new T.Vector2(W,H)}
};
var quad=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:U,vertexShader:VS,fragmentShader:FS,depthTest:false,depthWrite:false}));
quad.frustumCulled=false; scene.add(quad);

/* ---- photos ---- */
var photos=STOPS.map(function(s){return {tex:null,aspect:1.5,ready:false};});
var loader=new T.TextureLoader();
function loadPhoto(i,cb){
  loader.load('photos/'+STOPS[i].file+'.jpg',function(t){
    t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=false;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;
    photos[i].tex=t;photos[i].aspect=t.image.width/t.image.height;photos[i].ready=true;
    if(cb)cb();
  },undefined,function(){if(cb)cb();});
}
function coverOf(i,out){
  var as=W/H, ai=photos[i].aspect, sx=1, sy=1, z=0.95;
  if(as>ai){sy=ai/as;}else{sx=as/ai;}
  sx*=z;sy*=z;
  var cx=clamp(STOPS[i].fx,sx/2,1-sx/2), cy=clamp(STOPS[i].fy,sy/2,1-sy/2);
  out.set(sx,sy,cx,cy);
}

/* ---- soft sprite helpers ---- */
function radialTex(stops,w){
  var c=document.createElement('canvas');c.width=c.height=w||128;
  var x=c.getContext('2d'),g=x.createRadialGradient(c.width/2,c.height/2,0,c.width/2,c.height/2,c.width/2);
  stops.forEach(function(s){g.addColorStop(s[0],s[1]);});
  x.fillStyle=g;x.fillRect(0,0,c.width,c.height);return new T.CanvasTexture(c);
}

/* ---- particles (dust, fireflies, sparks) ---- */
var PVS=[
'attribute vec2 aBase;attribute vec4 aRnd;',
'uniform float uTime;uniform float uPR;uniform float uSize;uniform float uMode;uniform vec2 uOrigin;uniform float uRise;uniform float uAlpha;',
'varying float vA;',
'void main(){',
'  vec2 p;float a=1.0;',
'  if(uMode<0.5){',
'    vec2 q=fract(aBase+vec2(0.010,0.006)*(0.4+aRnd.y)*uTime+0.012*vec2(sin(uTime*0.7+aRnd.w*6.28),cos(uTime*0.5+aRnd.w*9.0)));',
'    p=q*2.0-1.0;a=0.35+0.65*(0.5+0.5*sin(uTime*(0.6+aRnd.y)+aRnd.w*6.28));',
'  }else if(uMode<1.5){',
'    p=(aBase*2.0-1.0)*vec2(1.0,0.75)+vec2(0.0,-0.1)+0.07*vec2(sin(uTime*0.4*(0.5+aRnd.y)+aRnd.w*20.0),cos(uTime*0.33*(0.5+aRnd.y)+aRnd.w*13.0));',
'    a=pow(0.5+0.5*sin(uTime*(1.0+aRnd.y)+aRnd.w*30.0),3.0);',
'  }else{',
'    float life=fract(uTime*(0.10+aRnd.y*0.22)+aRnd.x);',
'    p=uOrigin+vec2((aBase.x-0.5)*0.30+sin(life*7.0+aRnd.w*12.0)*0.05*life,life*uRise);',
'    a=(1.0-life)*smoothstep(0.0,0.08,life);',
'  }',
'  vA=a*uAlpha;',
'  gl_Position=vec4(p,0.0,1.0);',
'  gl_PointSize=uSize*uPR*aRnd.z;',
'}'
].join('\n');
var PFS='uniform vec3 uColor;varying float vA;void main(){vec2 d=gl_PointCoord-0.5;float r=length(d)*2.0;float k=smoothstep(1.0,0.0,r);gl_FragColor=vec4(uColor,vA*k*k);}';
function makePoints(count,mode,size,color){
  var g=new T.BufferGeometry(),base=new Float32Array(count*2),rnd=new Float32Array(count*4),pos=new Float32Array(count*3);
  for(var i=0;i<count;i++){base[i*2]=Math.random();base[i*2+1]=Math.random();rnd[i*4]=Math.random();rnd[i*4+1]=Math.random();rnd[i*4+2]=0.5+Math.random()*1.1;rnd[i*4+3]=Math.random();}
  g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('aBase',new T.BufferAttribute(base,2));g.setAttribute('aRnd',new T.BufferAttribute(rnd,4));
  var m=new T.ShaderMaterial({uniforms:{uTime:U.uTime,uPR:{value:dpr},uSize:{value:size},uMode:{value:mode},uOrigin:{value:new T.Vector2(0,-0.3)},uRise:{value:0.9},uAlpha:{value:0},uColor:{value:new T.Color(color)}},vertexShader:PVS,fragmentShader:PFS,transparent:true,depthTest:false,depthWrite:false,blending:T.AdditiveBlending});
  var p=new T.Points(g,m);p.frustumCulled=false;p.renderOrder=2;scene.add(p);return p;
}
var dust=makePoints(110,0,7,0xffe6b8), flies=makePoints(60,1,9,0xd8ff80), sparks=makePoints(70,2,8,0xffa850);

/* ---- mist ---- */
var mistTex=radialTex([[0,'rgba(255,255,255,.55)'],[0.5,'rgba(255,255,255,.18)'],[1,'rgba(255,255,255,0)']],128);
var mists=[];
for(var mi=0;mi<5;mi++){
  var mm=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:mistTex,transparent:true,opacity:0,depthTest:false,depthWrite:false,color:0xfff0d8}));
  mm.renderOrder=1;mm.userData={x:-1.4+mi*0.7,y:-0.3+Math.random()*0.5,v:0.004+Math.random()*0.006,s:1.1+Math.random()*0.8};scene.add(mm);mists.push(mm);
}

/* ---- birds ---- */
var birdTex=(function(){
  var c=document.createElement('canvas');c.width=64;c.height=32;var x=c.getContext('2d');
  x.strokeStyle='rgba(20,16,14,.9)';x.lineWidth=3.2;x.lineCap='round';x.beginPath();x.moveTo(4,22);x.quadraticCurveTo(18,2,32,18);x.quadraticCurveTo(46,2,60,22);x.stroke();
  return new T.CanvasTexture(c);
})();
var birds=[];
for(var bi=0;bi<6;bi++){
  var bm=new T.Mesh(new T.PlaneGeometry(1,0.5),new T.MeshBasicMaterial({map:birdTex,transparent:true,opacity:0,depthTest:false,depthWrite:false}));
  bm.renderOrder=3;bm.userData={t:Math.random()*30,v:0.025+Math.random()*0.03,y:0.45+Math.random()*0.4,px:26+Math.random()*30,ph:Math.random()*6};scene.add(bm);birds.push(bm);
}

/* ---- kites ---- */
function makeKiteCanvas(c1,c2){
  var c=document.createElement('canvas');c.width=96;c.height=192;var x=c.getContext('2d');
  x.save();x.beginPath();x.moveTo(48,4);x.lineTo(92,56);x.lineTo(48,104);x.lineTo(4,56);x.closePath();x.clip();
  x.fillStyle=c1;x.fillRect(0,0,48,110);x.fillStyle=c2;x.fillRect(48,0,48,110);
  x.fillStyle='rgba(255,255,255,.35)';x.fillRect(0,50,96,4);x.restore();
  x.strokeStyle='rgba(40,30,20,.7)';x.lineWidth=1.5;x.beginPath();x.moveTo(48,4);x.lineTo(48,104);x.moveTo(4,56);x.lineTo(92,56);x.stroke();
  for(var i=0;i<7;i++){x.fillStyle=i%2?c1:c2;x.beginPath();x.moveTo(46+Math.sin(i*1.2)*6,108+i*11);x.lineTo(54+Math.sin(i*1.2)*6,112+i*11);x.lineTo(46+Math.sin(i*1.2+1)*6,118+i*11);x.closePath();x.fill();}
  return new T.CanvasTexture(c);
}
var kitePal=[['#e5484d','#f7c548'],['#2b8ad9','#ffffff'],['#23a094','#f0a92b'],['#8e4ec6','#ff9ec4'],['#f0a92b','#c2562f']];
var kites=[];
for(var ki=0;ki<5;ki++){
  var km=new T.Mesh(new T.PlaneGeometry(1,2),new T.MeshBasicMaterial({map:makeKiteCanvas(kitePal[ki][0],kitePal[ki][1]),transparent:true,opacity:0,depthTest:false,depthWrite:false}));
  km.renderOrder=3;scene.add(km);
  var lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3));
  var ln=new T.Line(lg,new T.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthTest:false}));ln.frustumCulled=false;ln.renderOrder=3;scene.add(ln);
  kites.push({m:km,l:ln,x:-0.7+ki*0.38,y:0.55+0.25*Math.sin(ki*2.1),ph:Math.random()*6,px:62+Math.random()*34});
}

/* =====================================================================
   Sound: wind, birds, crowd, river, crickets, fire, drums (all generated)
   ===================================================================== */
var AC=null, mix_={}, sndOn=false, sndBtn=document.getElementById('snd');
function startAudio(){
  var AX=window.AudioContext||window.webkitAudioContext; if(!AX) return false;
  AC=new AX();
  var master=AC.createGain();master.gain.value=0;master.connect(AC.destination);mix_.master=master;
  var len=AC.sampleRate*3,nb=AC.createBuffer(1,len,AC.sampleRate),d=nb.getChannelData(0),b0=0,b1=0,b2=0;
  for(var i=0;i<len;i++){var w=Math.random()*2-1;b0=0.99765*b0+w*0.0990460;b1=0.96300*b1+w*0.2965164;b2=0.57000*b2+w*1.0526913;d[i]=(b0+b1+b2+w*0.1848)*0.2;}
  function noise(){var s=AC.createBufferSource();s.buffer=nb;s.loop=true;s.start();return s;}
  function chain(src,nodes,gain){var prev=src;nodes.forEach(function(n){prev.connect(n);prev=n;});var g=AC.createGain();g.gain.value=gain;prev.connect(g);g.connect(master);return g;}
  var bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=480;bp.Q.value=0.6;
  mix_.wind=chain(noise(),[bp],0.35);
  var lfo=AC.createOscillator();lfo.frequency.value=0.09;var lg=AC.createGain();lg.gain.value=0.12;lfo.connect(lg);lg.connect(mix_.wind.gain);lfo.start();
  var lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;mix_.water=chain(noise(),[lp],0);
  var cb=AC.createBiquadFilter();cb.type='bandpass';cb.frequency.value=320;cb.Q.value=0.8;mix_.crowd=chain(noise(),[cb],0);
  var cl=AC.createOscillator();cl.frequency.value=0.7;var clg=AC.createGain();clg.gain.value=0.25;cl.connect(clg);clg.connect(mix_.crowd.gain);cl.start();
  var hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=2400;mix_.fire=chain(noise(),[hp],0);
  var cr=AC.createOscillator();cr.type='sine';cr.frequency.value=4300;var pg=AC.createGain();pg.gain.value=0.5;cr.connect(pg);
  var pl=AC.createOscillator();pl.frequency.value=17;var plg=AC.createGain();plg.gain.value=0.5;pl.connect(plg);plg.connect(pg.gain);
  mix_.cricket=AC.createGain();mix_.cricket.gain.value=0;pg.connect(mix_.cricket);mix_.cricket.connect(master);cr.start();pl.start();
  mix_.birds=AC.createGain();mix_.birds.gain.value=0;mix_.birds.connect(master);
  mix_.drums=AC.createGain();mix_.drums.gain.value=0;mix_.drums.connect(master);
  function chirp(){
    if(!AC||!sndOn){return;}
    var t=AC.currentTime,n=1+Math.floor(Math.random()*3),f0=2200+Math.random()*1600;
    for(var k=0;k<n;k++){var o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(f0,t+k*0.16);o.frequency.exponentialRampToValueAtTime(f0*1.5,t+k*0.16+0.1);g.gain.setValueAtTime(0,t+k*0.16);g.gain.linearRampToValueAtTime(0.5,t+k*0.16+0.02);g.gain.exponentialRampToValueAtTime(0.001,t+k*0.16+0.13);o.connect(g);g.connect(mix_.birds);o.start(t+k*0.16);o.stop(t+k*0.16+0.15);}
    setTimeout(chirp,900+Math.random()*3200);
  }
  function crackle(){
    if(!AC||!sndOn){return;}
    var g=mix_.fire.gain,t=AC.currentTime,lv=mix_.fireLevel||0;
    g.cancelScheduledValues(t);g.setValueAtTime(lv*(0.3+Math.random()*0.7),t);g.setTargetAtTime(lv*0.25,t+0.02,0.04);
    setTimeout(crackle,60+Math.random()*140);
  }
  var beat=0;
  function drum(){
    if(!AC||!sndOn){return;}
    var t=AC.currentTime,pat=[1,0,0.5,0,1,0.5,0,0.5][beat%8];beat++;
    if(pat>0){var o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(pat>0.7?120:190,t);o.frequency.exponentialRampToValueAtTime(pat>0.7?55:90,t+0.18);g.gain.setValueAtTime(pat*0.9,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.3);o.connect(g);g.connect(mix_.drums);o.start(t);o.stop(t+0.32);}
    setTimeout(drum,230);
  }
  chirp();crackle();drum();
  return true;
}
function setSound(on){
  sndOn=on;sndBtn.setAttribute('aria-pressed',on?'true':'false');
  if(on){
    if(!AC){if(!startAudio()){sndOn=false;sndBtn.setAttribute('aria-pressed','false');return;}}
    else{AC.resume();}
    mix_.master.gain.setTargetAtTime(0.9,AC.currentTime,0.4);
  }else if(AC){mix_.master.gain.setTargetAtTime(0,AC.currentTime,0.25);}
}
sndBtn.addEventListener('click',function(){setSound(!sndOn);});
function bump(s,c,w){return Math.max(0,1-Math.abs(s-c)/w);}
function updateAudio(s){
  if(!AC||!sndOn)return;
  var t=AC.currentTime,day=1-smooth(5.2,5.9,s);
  mix_.water.gain.setTargetAtTime(0.5*bump(s,5,1.1)+0.1*smooth(4.4,5,s)*day,t,0.3);
  mix_.crowd.gain.setTargetAtTime(0.5*bump(s,3,1.0)+0.15*bump(s,4,0.8),t,0.3);
  mix_.birds.gain.setTargetAtTime(0.16*day*(1-bump(s,3,0.8)*0.7),t,0.4);
  mix_.cricket.gain.setTargetAtTime(0.05*smooth(5.4,6,s),t,0.5);
  mix_.fireLevel=0.55*smooth(5.4,6,s);
  mix_.drums.gain.setTargetAtTime(0.28*smooth(5.7,6.1,s),t,0.4);
  mix_.wind.gain.setTargetAtTime(0.3*(1-0.5*smooth(5.4,6,s)),t,0.5);
}

/* =====================================================================
   Pins
   ===================================================================== */
var pinsEl=document.getElementById('pins'), pins=[];
STOPS.forEach(function(st,i){
  st.pins.forEach(function(p,j){
    var el=document.createElement('div');el.className='pin';
    el.innerHTML='<button type="button" aria-label="'+esc(p[2])+'"></button><div class="tip" role="tooltip"><b>'+esc(p[2])+'</b>'+esc(p[3])+'</div>';
    var btn=el.querySelector('button');
    btn.addEventListener('click',function(){var o=el.classList.contains('open');pins.forEach(function(q){q.el.classList.remove('open');});if(!o)el.classList.add('open');});
    pinsEl.appendChild(el);pins.push({el:el,stop:i,x:p[0],y:p[1]});
  });
});
function photoToScreen(P,i,params,px,py,out){
  var c=params.c,h=params.h,vx=params.vx,m=params.m,g=params.g;
  var qx=px,qy=py,par=params.par;
  for(var k=0;k<5;k++){
    var a=Math.max((qy-h)/Math.max(1-h,0.05),0),qs=a/(1+m*a),f=1-m*(0.14+0.86*g*Math.min(qs,1.2));
    qx=vx+(px-vx-par[0]*(0.25+qs*g))/f; qy=Math.min(h,1)+(py-Math.min(h,1)-par[1]*(0.25+qs*g))/f;
  }
  out[0]=((qx-c.z)/c.x+0.5)*W; out[1]=((qy-c.w)/c.y+0.5)*H;
}

/* =====================================================================
   Loop
   ===================================================================== */
var cur=0,vel=0,tgt=0,time=0,last=performance.now(),mx=0,my=0,mxS=0,myS=0,lastStop=-1,frames=0,accDt=0,framesDone=0,started=false;
var coverTmpA=new T.Vector4(),coverTmpB=new T.Vector4();
var scr=[0,0];
function resize(){
  W=window.innerWidth;H=window.innerHeight;
  renderer.setSize(W,H,false);
  U.uRes.value.set(W*dpr,H*dpr);
  measure();
  onScroll();
}
function onScroll(){if(forceT!=null&&!isNaN(forceT))return;tgt=sFromScroll(window.scrollY);}
window.addEventListener('scroll',onScroll,{passive:true});
window.addEventListener('resize',resize);
window.addEventListener('pointermove',function(e){mx=(e.clientX/W-0.5)*2;my=(e.clientY/H-0.5)*2;},{passive:true});
resize();
if(forceT!=null&&!isNaN(forceT)){
  if(!Q.has('noscroll'))window.scrollTo(0,centers[Math.floor(forceT)]+(forceT-Math.floor(forceT))*((centers[Math.min(N-1,Math.floor(forceT)+1)]||0)-centers[Math.floor(forceT)]));
  tgt=forceT;cur=forceT;
}else cur=tgt;

var clockEl=document.getElementById('clock'),barEl=document.getElementById('bar');
var HOLD=0.24;
var paramsA={c:new T.Vector4(),h:0.5,vx:0.5,m:0,g:1,par:[0,0]},paramsB={c:new T.Vector4(),h:0.5,vx:0.5,m:0,g:1,par:[0,0]};

function frame(now){
  var dt=Math.min(0.05,(now-last)/1000);last=now;time+=dt;
  if(reduce||forceT!=null){cur=tgt;vel=0;}
  else{var om=2/0.55,xx=om*dt,ex=1/(1+xx+0.48*xx*xx+0.235*xx*xx*xx),ch=cur-tgt,tp=(vel+om*ch)*dt;vel=(vel-om*tp)*ex;cur=tgt+(ch+tp)*ex;}
  var s=clamp(cur,0,N-1);
  var i=Math.min(N-2,Math.floor(s)),f=s-i; if(s>=N-1){i=N-2;f=1;}
  var t=smooth(HOLD,1-HOLD,f), eT=t*t*(1.4-0.4*t);
  var iA=i,iB=i+1;
  var mixF=smooth(0.30,0.72,t);
  if(!photos[iB].ready)mixF=0;
  /* push-in: slow creep while resting, strong dolly while travelling */
  var restA=0.05+0.03*clamp(f/HOLD,0,1), restB=0.05+0.03*clamp((f-1)/HOLD,-1,0)+0.0;
  var mA=restA+0.78*eT, mB=0.05;
  if(reduce){mA=0.05;mB=0.05;}
  var sway=reduce?0:Math.sin(time*0.35)*0.0022;
  mxS+=(mx-mxS)*0.05;myS+=(my-myS)*0.05;
  var trav=Math.sin(Math.PI*t);
  var blurA=reduce?0:clamp(trav*1.0+Math.abs(vel)*0.25,0,1.6), blurB=reduce?0:clamp((1-t)*0.8*(mixF>0?1:0),0,1);

  var A=STOPS[iA],Bs=STOPS[iB];
  coverOf(iA,coverTmpA);coverOf(iB,coverTmpB);
  var flick=1+0.05*Math.sin(time*13)+0.035*Math.sin(time*7.7+1.3)+0.03*Math.sin(time*21.1);
  var gAx=A.grade[0]*(iA===6?flick:1), gBx=Bs.grade[0]*(iB===6?flick:1);
  U.tA.value=photos[iA].tex||blank;U.tB.value=photos[iB].tex||blank;
  U.pA.value.set(A.h,A.vx,mA,A.g);U.pB.value.set(Bs.h,Bs.vx,mB,Bs.g);
  U.cA.value.copy(coverTmpA);U.cB.value.copy(coverTmpB);
  U.gA.value.set(gAx,A.grade[1],A.grade[2],A.grade[3]);U.gB.value.set(gBx,Bs.grade[1],Bs.grade[2],Bs.grade[3]);
  U.mixF.value=mixF;U.blurA.value=blurA;U.blurB.value=blurB;U.uTime.value=time;
  U.uMouse.value.set(mxS,myS);U.uSway.value=sway;

  /* pins glued to the photo */
  var par=[mxS*0.012+sway,myS*0.006];
  paramsA.c.copy(coverTmpA);paramsA.h=A.h;paramsA.vx=A.vx;paramsA.m=mA;paramsA.g=A.g;paramsA.par=par;
  paramsB.c.copy(coverTmpB);paramsB.h=Bs.h;paramsB.vx=Bs.vx;paramsB.m=mB;paramsB.g=Bs.g;paramsB.par=par;
  for(var pi=0;pi<pins.length;pi++){
    var pn=pins[pi],show=false;
    if(pn.stop===iA&&mixF<0.12&&t<0.12){photoToScreen(null,iA,paramsA,pn.x,pn.y,scr);show=true;}
    else if(pn.stop===iB&&mixF>0.88&&t>0.88){photoToScreen(null,iB,paramsB,pn.x,pn.y,scr);show=true;}
    if(show&&(scr[0]<24||scr[0]>W-24||scr[1]<70||scr[1]>H-24))show=false;
    if(show){var pb=panelBox[pn.stop],pt=pb.t-window.scrollY,pbt=pb.b-window.scrollY;if(scr[0]>pb.l-24&&scr[0]<pb.r+24&&scr[1]>pt-24&&scr[1]<pbt+24&&parseFloat(panels[pn.stop].style.opacity||1)>0.1)show=false;}
    if(show){pn.el.style.transform='translate3d('+scr[0].toFixed(1)+'px,'+scr[1].toFixed(1)+'px,0)';pn.el.classList.toggle('flipTip',scr[0]>W-260);}
    else pn.el.classList.remove('open');
    pn.el.classList.toggle('on',show);
  }

  /* overlays follow the two photos */
  var oa=OV[iA],ob=OV[iB],wA=1-mixF,wB=mixF;
  dust.material.uniforms.uAlpha.value=(oa.dust*wA+ob.dust*wB)*(reduce?0:1);
  flies.material.uniforms.uAlpha.value=(oa.fly*wA+ob.fly*wB)*0.9;
  var sp=oa.sparks*wA+ob.sparks*wB;
  sparks.material.uniforms.uAlpha.value=sp*1.1;
  if(sp>0.01){var idxF=(iA===6)?iA:iB,prm=(iA===6)?paramsA:paramsB;photoToScreen(null,idxF,prm,0.48,0.52,scr);sparks.material.uniforms.uOrigin.value.set(scr[0]/W*2-1,-(scr[1]/H*2-1));}
  dust.material.uniforms.uColor.value.set(s>5.3?0xffc890:0xffe6b8);
  var mistA=oa.mist*wA+ob.mist*wB;
  for(var q=0;q<mists.length;q++){
    var mm=mists[q],ud=mm.userData;ud.x+=ud.v*dt;if(ud.x>1.8)ud.x=-1.8;
    mm.position.set(ud.x,-0.45+ud.y*0.6,0);mm.scale.set(ud.s*1.6,ud.s*0.7*(W/H>1?1.4:0.7),1);mm.material.opacity=mistA*0.8;
  }
  var birdsA=oa.birds*wA+ob.birds*wB;
  for(var b=0;b<birds.length;b++){
    var bm=birds[b],bd=bm.userData;bd.t+=dt*bd.v;if(bd.t>1.4)bd.t=-0.4;
    var bx=-1.2+bd.t*2.6,by=bd.y+Math.sin(bd.t*9+bd.ph)*0.02;
    bm.position.set(bx,by,0);var wpx=bd.px,fl=0.45+0.55*Math.abs(Math.sin(time*7+bd.ph));
    bm.scale.set(wpx/W*2,wpx*0.5/H*2*fl*1.4,1);bm.material.opacity=birdsA*0.85;
  }
  var kA=oa.kites*wA+ob.kites*wB;
  for(var k=0;k<kites.length;k++){
    var kt=kites[k],kx=kt.x+Math.sin(time*0.5+kt.ph)*0.06,ky=kt.y+Math.sin(time*0.7+kt.ph*2)*0.04+0.04*Math.sin(time*0.23+k);
    kt.m.position.set(kx,ky,0);kt.m.rotation.z=Math.sin(time*0.9+kt.ph)*0.18;
    var kw=kt.px*(W<700?0.7:1);kt.m.scale.set(kw/W*2,kw*2/H*2,1);kt.m.material.opacity=kA*0.95;
    var la=kt.l.geometry.attributes.position;la.setXYZ(0,kx,ky-kw/H*0.17,0);la.setXYZ(1,kx*0.3-0.1,-1.05,0);la.needsUpdate=true;kt.l.material.opacity=kA*0.45;
  }

  renderer.render(scene,cam);

  /* HUD, panels, snapshots */
  var idx=Math.round(s);
  if(idx!==lastStop){lastStop=idx;railBtns.forEach(function(b,n){b.setAttribute('aria-current',n===idx?'true':'false');});clockEl.textContent=STOPS[idx].time;}
  barEl.style.width=(s/(N-1)*100).toFixed(1)+'%';
  var sy=window.scrollY;
  for(var pI=0;pI<panels.length;pI++){
    var off=(midY[pI]-sy-vh/2)/vh;
    panels[pI].style.opacity=(1-smooth(0.34,0.7,Math.abs(off))).toFixed(3);
    panels[pI].style.transform='translate3d(0,'+(off*20).toFixed(1)+'px,0)';
  }
  for(var sI=0;sI<snaps.length;sI++){
    var sn=snaps[sI],si=parseInt(sn.dataset.ph.charAt(1),10),offs=(midY[si]-sy-vh/2)/vh;
    sn.style.setProperty('--ty',(offs*(sn.classList.contains('a')?-70:-120)).toFixed(1)+'px');
    sn.style.opacity=(1-smooth(0.5,0.95,Math.abs(offs))).toFixed(3);
  }
  updateAudio(s);

  /* adaptive resolution */
  frames++;accDt+=dt;
  if(frames>=40){var avg=accDt/frames;frames=0;accDt=0;
    if(avg>0.03&&dpr>0.7){dpr=Math.max(0.7,dpr-0.2);renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);U.uRes.value.set(W*dpr,H*dpr);dust.material.uniforms.uPR.value=dpr;flies.material.uniforms.uPR.value=dpr;sparks.material.uniforms.uPR.value=dpr;}
    else if(avg<0.02&&dpr<maxDpr){dpr=Math.min(maxDpr,dpr+0.1);renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);U.uRes.value.set(W*dpr,H*dpr);dust.material.uniforms.uPR.value=dpr;flies.material.uniforms.uPR.value=dpr;sparks.material.uniforms.uPR.value=dpr;}
  }
  if(!started){started=true;setTimeout(hideLoader,250);}
  if(!still||need.every(function(n){return photos[n].ready;}))framesDone++;
  if(still&&framesDone>=3){document.title='ready '+photos.map(function(p){return p.ready?1:0;}).join('')+' s'+s.toFixed(2)+' mix'+mixF.toFixed(2)+' m'+mA.toFixed(2);return;}
  requestAnimationFrame(frame);
}
/* load the first photo, start, then fetch the rest in order */
var need=(forceT!=null&&!isNaN(forceT))?[clamp(Math.floor(forceT),0,N-1),clamp(Math.floor(forceT)+1,0,N-1)]:[0];
var order=need.concat([0,1,2,3,4,5,6].filter(function(n){return need.indexOf(n)<0;}));
loadPhoto(order[0],function(){
  requestAnimationFrame(frame);
  (function next(k){if(k>=order.length)return;loadPhoto(order[k],function(){next(k+1);});})(1);
});
})();
