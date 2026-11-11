export const noiseGLSL = /* glsl */`
float hash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.1,0.2,0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x+p.y+p.z)); }
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) { float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p);p=p*2.03+vec3(7.1,3.7,1.1);a*=0.48;} return v; }
`;

export const skyVertex = /* glsl */`
varying vec3 vDirection;
void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
export const skyFragment = /* glsl */`
varying vec3 vDirection;
uniform float uTime;
uniform float uEra;
${noiseGLSL}
void main(){
  vec3 d=normalize(vDirection); vec3 p=d*3.2;
  float n=fbm(p+vec3(0.,uTime*.001,0.));
  float dust=fbm(p*3.0+vec3(n*3.0));
  float band=exp(-abs(d.y*.8+d.x*.36+.12)*4.8);
  float cloud=pow(max(n*.7+dust*.3,0.),2.8)*band;
  vec3 warm=vec3(.23,.19,.13), cool=vec3(.075,.17,.19);
  vec3 tint=mix(warm,cool,clamp(smoothstep(.30,.7,dust)+sin(uEra*3.14159)*.65,0.,1.));
  vec3 col=vec3(.005,.007,.009)+tint*cloud*.90;
  col+=vec3(.16,.15,.12)*pow(dust,5.0)*band*.5;
  col*=1.0-smoothstep(.45,.75,fbm(p*5.0))*0.75;
  gl_FragColor=vec4(col,1.0);
}`;

export const holeVertex = /* glsl */`
varying vec3 vWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}
`;
export const holeFragment = /* glsl */`
precision highp float;
varying vec3 vWorld;
uniform float uTime;
uniform float uEra;
uniform float uPulse;
uniform float uBirth;
uniform sampler2D uNoise;
const float PI=3.14159265359;

vec4 disk(vec3 p) {
  float r=length(p.xz), a=atan(p.z,p.x);
  if(r<2.8||r>9.2)return vec4(0.);
  float spin=uTime*.11;
  vec2 uv=vec2(a/(2.*PI)+spin/(pow(r,.7)),r*.19-spin*.027);
  float n=texture2D(uNoise,uv*vec2(3.,1.)).r;
  float fine=texture2D(uNoise,uv*vec2(8.,2.)+vec2(r*.1,0.)).r;
  float filaments=pow(.5+.5*sin(r*44.+n*6.+a*1.8-spin*2.),3.);
  float inner=smoothstep(2.8,3.35,r);
  float outer=1.-smoothstep(4.4,9.2,r);
  float density=inner*outer*(.40+n*.65+filaments*.8+fine*.12);
  float hot=exp(-(r-3.1)*.48);
  vec3 color=mix(vec3(.40,.23,.10),vec3(1.1,.89,.58),hot);
  float quiet=sin(uEra*PI);
  color=mix(color,vec3(.22,.45,.64),quiet*.85);
  float doppler=.7+.65*smoothstep(-1.,1.,p.x/r);
  return vec4(color*density*doppler*(1.35+uPulse*.9)*(1.-quiet*.32),clamp(density*.84,0.,.96));
}
void main(){
  vec3 ro=cameraPosition;
  vec3 rd=normalize(vWorld-ro);
  float b=dot(ro,rd), c=dot(ro,ro)-169.;
  float discriminant=b*b-c;
  if(discriminant<0.)discard;
  vec3 p=ro+rd*max(0.,-b-sqrt(discriminant));
  vec3 col=vec3(0.);float alpha=0.;float minR=100.;bool swallowed=false;
  for(int i=0;i<100;i++){
    float r=length(p);minR=min(minR,r);
    if(r<1.90){swallowed=true;break;}
    if(r>13.2)break;
    float ds=clamp(r*.105,.105,1.25);
    vec3 pull=-p/(r*r*r);
    rd=normalize(rd+pull*ds*2.15);
    vec3 nextP=p+rd*ds;
    if(p.y*nextP.y<0.){
      vec3 q=mix(p,nextP,p.y/(p.y-nextP.y));
      vec4 light=disk(q);
      col+=light.rgb*(1.-alpha);
      alpha+=light.a*(1.-alpha);
    }
    p=nextP;
  }
  float impact=length(cross(ro,normalize(vWorld-ro)));
  float ring=exp(-pow((impact-4.94)*46.,2.));
  float halo=exp(-abs(impact-4.94)*4.0)*.025;
  vec3 photon=mix(vec3(1.2,.96,.62),vec3(.40,.76,1.1),sin(uEra*PI)*.8);
  col+=photon*(ring*.75+halo)*(1.+uPulse*.5);
  alpha=max(alpha,clamp(ring+halo,0.,1.));
  if(swallowed){alpha=1.;col+=vec3(.0015,.002,.003);}
  float newStar=exp(-impact*impact*.18)*uBirth;
  col=mix(col,col+vec3(1.4,1.05,.61)*newStar*4.,uBirth);
  alpha=max(alpha,newStar);
  if(alpha<.002)discard;
  gl_FragColor=vec4(col,alpha);
}`;

export const particleVertex = /* glsl */`
attribute float aSize;attribute float aSeed;attribute vec3 aColor;
uniform float uTime;uniform float uDpr;uniform float uEra;uniform float uPulse;
varying vec3 vColor;varying float vAlpha;
void main(){
  vec3 p=position;
  float angle=uTime*(.008+aSeed*.012);
  p.x=position.x*cos(angle)-position.z*sin(angle);
  p.z=position.x*sin(angle)+position.z*cos(angle);
  p.y+=sin(uTime*.13+aSeed*60.)*.12;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp(aSize*uDpr*(120./-mv.z),.7,8.);
  vColor=aColor;vAlpha=(.45+.35*sin(aSeed*100.+uTime*.3))*(1.+uPulse*.3);
}`;
export const particleFragment = /* glsl */`
varying vec3 vColor;varying float vAlpha;
void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=pow(1.-d,2.2);gl_FragColor=vec4(vColor,a*vAlpha);}
`;

export const atmosphereVertex = /* glsl */`
varying vec3 vNormal;varying vec3 vPosition;
void main(){vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vPosition=mv.xyz;gl_Position=projectionMatrix*mv;}
`;
export const atmosphereFragment = /* glsl */`
varying vec3 vNormal;varying vec3 vPosition;uniform vec3 uColor;
void main(){float rim=pow(1.-max(dot(normalize(vNormal),normalize(-vPosition)),0.),4.);gl_FragColor=vec4(uColor*rim,rim*.5);}
`;

export const finalShader = {
  uniforms:{tDiffuse:{value:null},uTime:{value:0},uPulse:{value:0},uBirth:{value:0},uResolution:{value:null}},
  vertexShader:/* glsl */`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:/* glsl */`
  uniform sampler2D tDiffuse;uniform float uTime;uniform float uPulse;uniform float uBirth;uniform vec2 uResolution;varying vec2 vUv;
  float rand(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){
    vec2 center=vUv-.5;vec2 offset=center*.00055*(1.+uPulse*2.);
    vec3 color=vec3(texture2D(tDiffuse,vUv+offset).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-offset).b);
    float vignette=1.-smoothstep(.25,.80,length(center*vec2(.9,1.)))*.56;
    color*=vignette;
    color+=(rand(vUv*uResolution+fract(uTime)*500.)-.5)*.012;
    color+=vec3(.32,.23,.12)*uBirth*.12;
    gl_FragColor=vec4(color,1.);
  }`,
};
