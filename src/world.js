import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {noiseGLSL,skyVertex,skyFragment,holeVertex,holeFragment,particleVertex,particleFragment,atmosphereVertex,atmosphereFragment} from './shaders.js';

export function createWorld(renderer,scene,{mobile=false}={}){
  let seed=120711;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const shared={uTime:{value:0},uEra:{value:0},uPulse:{value:0},uBirth:{value:0},uDpr:{value:1}};
  const environment=new RoomEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environmentMap=pmrem.fromScene(environment,.06);
  scene.environment=environmentMap.texture;scene.environmentIntensity=.55;
  environment.dispose();pmrem.dispose();
  scene.add(new THREE.AmbientLight(0x71808a,.55));
  const sun=new THREE.DirectionalLight(0xffdfad,3.5);sun.position.set(-5,10,8);scene.add(sun);
  const ice=new THREE.DirectionalLight(0x91c3dc,1.6);ice.position.set(6,-4,-8);scene.add(ice);
  const coreLight=new THREE.PointLight(0xffc677,34,35,1.7);coreLight.position.set(0,1,0);scene.add(coreLight);

  const sky=new THREE.Mesh(new THREE.SphereGeometry(180,32,24),new THREE.ShaderMaterial({vertexShader:skyVertex,fragmentShader:skyFragment,uniforms:shared,side:THREE.BackSide,depthWrite:false}));
  sky.renderOrder=-20;scene.add(sky);

  const count=mobile?4200:8000;
  const positions=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const theta=random()*Math.PI*2, v=random()*2-1, radius=60+random()*100;
    const n=Math.sqrt(1-v*v);positions.set([Math.cos(theta)*n*radius,v*radius,Math.sin(theta)*n*radius],i*3);
    sizes[i]=.3+Math.pow(random(),9)*2.2;seeds[i]=random();
    const tint=random(),brightness=.48+random()*.9;colors.set([brightness*(tint>.8?.60:1),brightness*(.78+random()*.2),brightness*(tint>.8?1.2:.69)],i*3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));geometry.setAttribute('aColor',new THREE.BufferAttribute(colors,3));
  const particleMaterial=new THREE.ShaderMaterial({uniforms:shared,vertexShader:particleVertex,fragmentShader:particleFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const stars=new THREE.Points(geometry,particleMaterial);stars.renderOrder=-10;scene.add(stars);

  const noiseSize=256,data=new Uint8Array(noiseSize*noiseSize*4);
  for(let i=0;i<noiseSize*noiseSize;i++){const n=random()*255;data[i*4]=n;data[i*4+1]=n;data[i*4+2]=n;data[i*4+3]=255;}
  const noiseTexture=new THREE.DataTexture(data,noiseSize,noiseSize,THREE.RGBAFormat);noiseTexture.wrapS=noiseTexture.wrapT=THREE.RepeatWrapping;noiseTexture.magFilter=THREE.LinearFilter;noiseTexture.minFilter=THREE.LinearFilter;noiseTexture.needsUpdate=true;
  const hole=new THREE.Mesh(new THREE.PlaneGeometry(29,29),new THREE.ShaderMaterial({uniforms:{...shared,uNoise:{value:noiseTexture}},vertexShader:holeVertex,fragmentShader:holeFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  hole.renderOrder=0;scene.add(hole);

  const architecture=new THREE.Group();scene.add(architecture);
  const bronze=new THREE.MeshStandardMaterial({color:0x8d8068,metalness:.92,roughness:.33,emissive:0x21170b,emissiveIntensity:.12});
  const darkBronze=new THREE.MeshStandardMaterial({color:0x302d27,metalness:.9,roughness:.42});
  const edgeMaterial=new THREE.MeshBasicMaterial({color:0xb9a77f,transparent:true,opacity:.42,toneMapped:false});
  const ringGroups=[];
  const createRing=(radius,rotation,count,thickness)=>{
    const group=new THREE.Group();group.rotation.set(...rotation);architecture.add(group);ringGroups.push(group);
    let offset=.08;
    for(let i=0;i<count;i++){
      const interval=Math.PI*2/count;const start=offset+i*interval;const length=interval*(.52+random()*.35);
      const shape=new THREE.Shape();shape.absarc(0,0,radius+thickness,start,start+length,false);shape.absarc(0,0,radius,start+length,start,true);shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:1,steps:1,curveSegments:16});
      const mesh=new THREE.Mesh(geo,i%5===0?darkBronze:bronze);group.add(mesh);
      const arc=new THREE.Mesh(new THREE.TorusGeometry(radius+thickness,.009,4,Math.max(12,Math.floor(length*40)),length),edgeMaterial);arc.rotation.z=start;arc.position.z=.11;group.add(arc);
      if(i%3===0){mesh.position.z=(random()-.5)*.22;mesh.rotation.x=(random()-.5)*.05;}
    }
    const ticks=[];
    for(let i=0;i<180;i++){
      const angle=i/180*Math.PI*2;const major=i%15===0;const r=radius-.16;
      ticks.push(Math.cos(angle)*r,Math.sin(angle)*r,0,Math.cos(angle)*(r-(major?.3:.075)),Math.sin(angle)*(r-(major?.3:.075)),0);
    }
    const ticksGeo=new THREE.BufferGeometry();ticksGeo.setAttribute('position',new THREE.Float32BufferAttribute(ticks,3));
    group.add(new THREE.LineSegments(ticksGeo,new THREE.LineBasicMaterial({color:0xb2a68b,transparent:true,opacity:.46})));
    return group;
  };
  const primary=createRing(7.25,[.47,-.25,.28],26,.15);
  const secondary=createRing(8.6,[1.08,.50,-.34],18,.075);
  const outer=createRing(10.1,[.68,-.70,.25],12,.045);
  outer.children.forEach(o=>{if(o.isMesh&&o.material===bronze)o.material=darkBronze;});
  const thinOrbit=(r,rotation,color,opacity)=>{
    const geo=new THREE.BufferGeometry().setFromPoints(Array.from({length:257},(_,i)=>new THREE.Vector3(Math.cos(i/256*Math.PI*2)*r,Math.sin(i/256*Math.PI*2)*r,0)));
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity}));line.rotation.set(...rotation);architecture.add(line);return line;
  };
  thinOrbit(11.3,[.81,-.50,.22],0xc7bda0,.10);
  thinOrbit(8.9,[1.13,.52,-.34],0xa69a7d,.25);
  thinOrbit(7.05,[.47,-.25,.28],0xe4c792,.18);

  // Hundreds of individually lit pieces, submitted as a single instanced draw.
  const rubbleCount=mobile?150:290;
  const rubbleGeo=new THREE.IcosahedronGeometry(1,0);
  const rubble=new THREE.InstancedMesh(rubbleGeo,darkBronze,rubbleCount);rubble.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const rubbleData=[],dummy=new THREE.Object3D();
  for(let i=0;i<rubbleCount;i++){
    const angle=random()*Math.PI*2,r=6.8+Math.pow(random(),1.8)*6.;const size=.025+Math.pow(random(),3)*.21;
    rubbleData.push({angle,r,y:(random()-.5)*2.4,size,seed:random()*20});
    dummy.position.set(Math.cos(angle)*r,(random()-.5)*2.4,Math.sin(angle)*r);dummy.scale.set(size,size*(1+random()*2),size*.6);dummy.rotation.set(random()*3,random()*3,random()*3);dummy.updateMatrix();rubble.setMatrixAt(i,dummy.matrix);
  }
  scene.add(rubble);

  const dustCount=mobile?2400:5000;
  const dustPositions=new Float32Array(dustCount*3),dustSizes=new Float32Array(dustCount),dustSeeds=new Float32Array(dustCount),dustColors=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){
    const angle=random()*Math.PI*2,r=6.5+Math.pow(random(),1.7)*13.;const h=(random()-.5)*(.18+(r-6)*.10);
    dustPositions.set([Math.cos(angle)*r,h,Math.sin(angle)*r],i*3);dustSizes[i]=.12+random()*.35;dustSeeds[i]=random();dustColors.set([.48+random()*.28,.38+random()*.22,.24+random()*.12],i*3);
  }
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));dustGeo.setAttribute('aSize',new THREE.BufferAttribute(dustSizes,1));dustGeo.setAttribute('aSeed',new THREE.BufferAttribute(dustSeeds,1));dustGeo.setAttribute('aColor',new THREE.BufferAttribute(dustColors,3));
  const dust=new THREE.Points(dustGeo,particleMaterial);scene.add(dust);

  const planetMaterial=new THREE.MeshStandardMaterial({color:0x77756c,roughness:1,metalness:.05});
  planetMaterial.onBeforeCompile=(shader)=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRockPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRockPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRockPosition;\n'+noiseGLSL).replace('#include <color_fragment>','#include <color_fragment>\nfloat crust=fbm(vRockPosition*7.);float ridges=fbm(vRockPosition*23.);diffuseColor.rgb*=.25+crust*.8+ridges*.4;');
  };
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.85,48,32),planetMaterial);moon.position.set(-8.1,3.9,-6);scene.add(moon);
  const foregroundMoon=new THREE.Mesh(new THREE.SphereGeometry(.53,40,24),planetMaterial);foregroundMoon.position.set(8,-3.9,6.5);scene.add(foregroundMoon);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(.87,40,24),new THREE.ShaderMaterial({vertexShader:atmosphereVertex,fragmentShader:atmosphereFragment,uniforms:{uColor:{value:new THREE.Color(.45,.56,.66)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));atmosphere.position.copy(moon.position);scene.add(atmosphere);

  const memoryCoordinates=[[-5.5,2.0,3.1],[3.9,4.2,1.6],[6.7,-.5,2.6],[-3.3,-4.2,4.0],[1.2,-4.8,-1.9]];
  const memories=memoryCoordinates.map((p,i)=>{
    const group=new THREE.Group();group.position.set(...p);scene.add(group);
    const material=new THREE.MeshStandardMaterial({color:i%2?0xc3d5ce:0xf0dcaf,metalness:.55,roughness:.13,emissive:i%2?0x79a0a0:0xb68c4a,emissiveIntensity:1.7});
    const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.13),material);crystal.scale.set(.65,1.7,.65);group.add(crystal);
    const orbit=new THREE.Mesh(new THREE.TorusGeometry(.30,.006,4,48),new THREE.MeshBasicMaterial({color:0xd9cfb3,transparent:true,opacity:.5}));orbit.rotation.x=.6;group.add(orbit);
    const hit=new THREE.Mesh(new THREE.SphereGeometry(.55,12,8),new THREE.MeshBasicMaterial({visible:false}));group.add(hit);
    return {group,crystal,orbit,hit,base:new THREE.Vector3(...p),index:i,collected:false};
  });

  const flareCanvas=document.createElement('canvas');flareCanvas.width=flareCanvas.height=128;
  const ctx=flareCanvas.getContext('2d');const g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,245,215,1)');g.addColorStop(.04,'rgba(255,240,205,.8)');g.addColorStop(.15,'rgba(225,205,160,.15)');g.addColorStop(1,'rgba(200,180,140,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const flareTexture=new THREE.CanvasTexture(flareCanvas);
  [[-12,7,-18],[12,5,-12],[-7,-5,-20],[9,-7,-10]].forEach((p,i)=>{const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTexture,color:i%2?0x90aebc:0xe9d3a5,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sprite.position.set(...p);sprite.scale.setScalar(i===0?1.2:.7);scene.add(sprite);});

  let frame=0;
  function update({time,era,pulse,birth,camera,dpr,reduceMotion}){
    shared.uTime.value=time;shared.uEra.value=era;shared.uPulse.value=pulse;shared.uBirth.value=birth;shared.uDpr.value=dpr;
    hole.quaternion.copy(camera.quaternion);
    primary.rotation.z=.28+time*.006;secondary.rotation.z=-.34-time*.004;outer.rotation.y=-.70+Math.sin(time*.025)*.08;
    moon.rotation.y=time*.03;foregroundMoon.rotation.y=time*.05;
    coreLight.intensity=34+pulse*12+birth*50;
    memories.forEach((m,i)=>{m.group.position.copy(m.base);m.group.position.y+=Math.sin(time*.4+i*1.7)*.18;m.crystal.rotation.y=time*.5+i;m.crystal.rotation.z=Math.sin(time*.3+i)*.2;m.orbit.rotation.z=time*.2;m.group.scale.setScalar(m.collected?.25:1);m.crystal.material.emissiveIntensity=m.collected?.2:1.5+pulse;});
    if(++frame%3===0&&!reduceMotion){
      rubbleData.forEach((d,i)=>{const a=d.angle+time*.009/(d.r*.1);dummy.position.set(Math.cos(a)*d.r,d.y+Math.sin(time*.15+d.seed)*.12,Math.sin(a)*d.r);dummy.scale.set(d.size,d.size*(1.2+Math.sin(d.seed)*.4),d.size*.65);dummy.rotation.set(d.seed+time*.04,d.seed*.8+time*.03,d.seed);dummy.updateMatrix();rubble.setMatrixAt(i,dummy.matrix);});rubble.instanceMatrix.needsUpdate=true;
    }
  }
  return {update,memories,shared,hole,architecture,starCount:count+dustCount,rubbleCount};
}
