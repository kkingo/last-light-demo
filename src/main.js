import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createWorld} from './world.js';
import {finalShader} from './shaders.js';
import {ObservatoryAudio} from './audio.js';
import {initUI,MEMORIES} from './ui.js';

const STORAGE_KEY='last-light-observatory-v1';
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion=motionPreference.matches;
let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch{}
const collected=new Set((Array.isArray(saved.collected)?saved.collected:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<5));
const state={time:.08,era:.08,paused:reduceMotion,audio:false,quality:innerWidth<700?'low':'high',explored:false,rebirth:false,holding:false};
const audio=new ObservatoryAudio();
let renderer,scene,camera,controls,composer,bloom,finishing,world;
let ui,cameraTransition=null,rebirthElapsed=null,simTime=0,pulse=0,birth=0,lastTime=performance.now(),contextLost=false;
let width=innerWidth,height=innerHeight,qualityDpr=1,frameCount=0,fps=60,fpsStart=performance.now(),performanceWindow=0,manualQuality=false;
let compactView=width<700;
const initialPosition=new THREE.Vector3(0,compactView?11.9:5.9,compactView?55:27.5);
const temporary=new THREE.Vector3(),cameraDirection=new THREE.Vector3();
const markerElements=[];
const persist=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify({collected:[...collected]}));}catch{}};
const chapter=()=>state.time<.34?0:state.time<.72?1:2;
const sync=(extra={})=>ui?.update({time:state.time,chapter:chapter(),collected:[...collected],paused:state.paused,audio:state.audio,quality:state.quality,explored:state.explored,rebirth:state.rebirth,...extra});

ui=initUI({
  onTime(value){state.time=Math.max(0,Math.min(1,value));audio.setEra(state.time);sync();},
  onExplore(){state.explored=true;sync();ui.toast('点击轨道间的光点，找回五段被时间遗忘的记忆。');},
  async onAudio(){try{state.audio=await audio.toggle();sync();}catch(error){ui.toast(error.message||'声音暂时无法开启，请再试一次。');}},
  onPause(){state.paused=!state.paused;sync();},
  onReset(){if(!camera)return;cameraTransition={from:camera.position.clone(),to:initialPosition.clone(),start:performance.now(),duration:1500};controls.target.set(0,0,0);state.explored=false;sync();ui.toast('已回到最初的观测位置。');},
  onQuality(){manualQuality=true;state.quality=state.quality==='high'?'low':'high';resize();sync();ui.toast(state.quality==='high'?'精致画质 · 更细腻的星尘与光晕':'流畅画质 · 降低渲染分辨率，保留完整场景');},
  onRebirth(){
    if(state.rebirth){
      state.rebirth=false;state.paused=false;state.time=.08;birth=0;rebirthElapsed=null;collected.clear();persist();
      world.architecture.scale.setScalar(1);
      world.memories.forEach((m,i)=>{m.collected=false;markerElements[i].disabled=false;markerElements[i].classList.remove('is-collected');markerElements[i].setAttribute('aria-label',`拾取记忆 ${MEMORIES[i].title}`);});
      sync();ui.toast('新的旅程已经开始。星海仍记得你曾来过。');return;
    }
    if(collected.size!==5)return;
    state.rebirth=true;state.paused=false;state.explored=true;state.time=1;rebirthElapsed=0;sync();audio.chime(4);ui.toast('被记住的事物，成为了下一次宇宙的光。');
  },
});

function resize(){
  if(!renderer||!camera)return;
  width=innerWidth;height=innerHeight;
  const nextCompact=width<700;
  controls.minDistance=nextCompact?26:15;controls.maxDistance=nextCompact?85:48;
  if(nextCompact!==compactView){
    compactView=nextCompact;initialPosition.set(0,compactView?11.9:5.9,compactView?55:27.5);
    camera.position.copy(initialPosition);cameraTransition=null;controls.update();
  }
  qualityDpr=Math.min(devicePixelRatio||1,state.quality==='high'?1.5:.85);
  renderer.setPixelRatio(qualityDpr);renderer.setSize(width,height);
  composer.setPixelRatio(qualityDpr);composer.setSize(width,height);
  camera.aspect=width/height;
  // A camera sensor offset keeps the orbital center on the editorial composition's right third.
  camera.setViewOffset(width,height,width>850?-width*.115:0,compactView?height*.18:0,width,height);
  camera.updateProjectionMatrix();
  finishing.uniforms.uResolution.value.set(width*qualityDpr,height*qualityDpr);
  bloom.strength=state.quality==='high'?.27:.22;
}

function collect(index){
  if(collected.has(index)){ui.showMemory(index);return;}
  collected.add(index);world.memories[index].collected=true;state.explored=true;pulse=1;persist();sync();ui.showMemory(index);audio.chime(index);
  markerElements[index].classList.add('is-collected');
  markerElements[index].disabled=true;
  markerElements[index].setAttribute('aria-label',`重读记忆 ${MEMORIES[index].title}`);
  if(collected.size===5)setTimeout(()=>ui.toast('五段记忆已完整。点击「唤醒一颗新星」，开启下一次宇宙。'),1100);
}

function createMarkers(){
  const container=document.getElementById('fragment-labels');
  world.memories.forEach((memory,index)=>{
    memory.collected=collected.has(index);
    const marker=document.createElement('button');marker.type='button';marker.className='fragment-marker';marker.dataset.memory=String(index);
    marker.innerHTML=`<span>0${index+1} · ${MEMORIES[index].title}</span>`;
    marker.setAttribute('aria-label',`${memory.collected?'重读':'拾取'}记忆 ${MEMORIES[index].title}`);
    marker.classList.toggle('is-collected',memory.collected);
    marker.disabled=memory.collected;
    marker.addEventListener('click',()=>collect(index));container.append(marker);markerElements.push(marker);
  });
}

function positionMarkers(){
  world.memories.forEach((memory,index)=>{
    temporary.copy(memory.group.position);temporary.project(camera);
    const screenX=(temporary.x*.5+.5)*width,screenY=(-temporary.y*.5+.5)*height;
    // Hide markers that are behind the event horizon instead of drawing through it.
    const ray=memory.group.position.clone().sub(camera.position);const len=ray.length();ray.normalize();
    const along=-camera.position.dot(ray);const closest=camera.position.clone().addScaledVector(ray,Math.max(0,Math.min(len,along))).length();
    const occulted=closest<3.0&&along>0&&along<len-.4;
    const visible=temporary.z<1&&temporary.z>-1&&screenX>25&&screenX<width-25&&screenY>85&&screenY<height-(width<700?180:140)&&!occulted;
    const el=markerElements[index];el.style.transform=`translate3d(${screenX}px,${screenY}px,0) translate(-50%,-50%)`;el.style.visibility=visible?'visible':'hidden';
  });
}

function setupPointer(){
  let timer=null,origin={x:0,y:0},activePointer=null;
  const activePointers=new Set();
  const stop=()=>{clearTimeout(timer);state.holding=false;activePointer=null;document.body.classList.remove('holding');};
  renderer.domElement.addEventListener('pointerdown',(event)=>{
    if(event.button!==0)return;
    activePointers.add(event.pointerId);stop();
    if(activePointers.size!==1)return;
    activePointer=event.pointerId;origin={x:event.clientX,y:event.clientY};
    timer=setTimeout(()=>{state.holding=true;document.body.classList.add('holding');},420);
  });
  renderer.domElement.addEventListener('pointermove',(event)=>{
    if(activePointer===event.pointerId&&Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>9)stop();
  });
  const release=(event)=>{activePointers.delete(event.pointerId);stop();};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  window.addEventListener('blur',()=>{activePointers.clear();stop();});
  renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());
  controls.addEventListener('start',()=>{cameraTransition=null;});
}

async function start(){
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});
    renderer.setClearColor(0x06080b,1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    renderer.domElement.setAttribute('aria-label','拖拽旋转宇宙，滚轮缩放，长按减缓时间');
    renderer.domElement.setAttribute('role','img');
    document.getElementById('universe').append(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(43,width/height,.1,400);camera.position.copy(initialPosition);
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.045;controls.enablePan=false;controls.minDistance=compactView?26:15;controls.maxDistance=compactView?85:48;controls.minPolarAngle=.24;controls.maxPolarAngle=Math.PI-.24;controls.rotateSpeed=.45;controls.zoomSpeed=.65;controls.autoRotate=false;controls.target.set(0,0,0);controls.update();
    world=createWorld(renderer,scene,{mobile:width<700});
    composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
    bloom=new UnrealBloomPass(new THREE.Vector2(width,height),.27,.48,1.05);composer.addPass(bloom);
    composer.addPass(new OutputPass());
    finishing=new ShaderPass(finalShader);finishing.uniforms.uResolution.value=new THREE.Vector2(width,height);composer.addPass(finishing);
    createMarkers();setupPointer();resize();sync();
    window.addEventListener('resize',resize);
    motionPreference.addEventListener('change',(event)=>{reduceMotion=event.matches;if(reduceMotion){state.paused=true;sync();}});
    renderer.domElement.addEventListener('webglcontextlost',(event)=>{event.preventDefault();contextLost=true;ui.setError('图形连接暂时中断，请刷新页面重新进入。');});
    document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(document.hidden)audio.suspend();else audio.resume();});
    await renderer.compileAsync(scene,camera);
    composer.render();ui.ready();
    window.__observatory={
      get state(){return {...state,collected:[...collected],simTime,birth};},
      get diagnostics(){return {ready:true,fps,quality:state.quality,dpr:qualityDpr,stars:world.starCount,fragments:world.rubbleCount,drawCalls:renderer.info.render.calls,camera:camera.position.toArray(),width,height,webgl:2};},
    };
    requestAnimationFrame(animate);
  }catch(error){console.error('Observatory initialization failed',error);ui.setError('未能建立与星海的连接。请刷新页面再试一次。');}
}

function animate(now){
  requestAnimationFrame(animate);
  if(document.hidden||contextLost)return;
  const dt=Math.min((now-lastTime)/1000,.08);lastTime=now;
  if(!state.paused)simTime+=dt*(state.holding?.06:1)*(1-state.era*.7);
  state.era=THREE.MathUtils.damp(state.era,state.time,2,dt);
  pulse=THREE.MathUtils.damp(pulse,state.holding?.65:0,2.2,dt);
  if(rebirthElapsed!==null){
    if(!state.paused)rebirthElapsed+=dt;
    const age=rebirthElapsed;
    birth=THREE.MathUtils.smoothstep(age,0,8);
    world.architecture.scale.setScalar(1+THREE.MathUtils.clamp(age-3,0,6)*.025);
  }
  if(cameraTransition){
    const progress=Math.min(1,(now-cameraTransition.start)/cameraTransition.duration);const eased=1-Math.pow(1-progress,3);
    camera.position.lerpVectors(cameraTransition.from,cameraTransition.to,eased);if(progress===1)cameraTransition=null;
  }
  controls.update(dt);camera.updateMatrixWorld();
  world.update({time:simTime,era:state.era,pulse,birth,camera,dpr:qualityDpr,reduceMotion});
  positionMarkers();
  renderer.toneMappingExposure=1.25-state.era*.14+birth*.13;
  finishing.uniforms.uTime.value=simTime;finishing.uniforms.uPulse.value=pulse;finishing.uniforms.uBirth.value=birth;
  composer.render(dt);
  frameCount++;
  if(now-fpsStart>1500){
    fps=Math.round(frameCount*1000/(now-fpsStart));frameCount=0;fpsStart=now;
    if(fps<26)performanceWindow++;else performanceWindow=0;
    if(performanceWindow>=3&&state.quality==='high'&&!manualQuality){state.quality='low';resize();sync();performanceWindow=0;}
  }
}
start();
