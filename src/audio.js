// Procedural score: all oscillators and noise are generated locally after opt-in.
export class ObservatoryAudio {
  constructor(){this.context=null;this.enabled=false;this.voices=[];}
  async toggle(){
    if(!this.context){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('当前浏览器不支持空间音频');
      this.context=new Audio();const ctx=this.context;
      this.master=ctx.createGain();this.master.gain.value=0;this.master.connect(ctx.destination);
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;filter.connect(this.master);
      for(const [frequency,volume] of [[55,.13],[82.41,.08],[110,.045],[164.81,.028],[220,.016]]){
        const osc=ctx.createOscillator(), gain=ctx.createGain();osc.type='sine';osc.frequency.value=frequency;gain.gain.value=volume;
        osc.connect(gain);gain.connect(filter);osc.start();this.voices.push(osc);
      }
      const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);const samples=buffer.getChannelData(0);let last=0;
      for(let i=0;i<samples.length;i++){last=(last+(Math.random()*2-1)*.02)/1.02;samples[i]=last*1.8;}
      const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
      const noiseGain=ctx.createGain();noiseGain.gain.value=.07;noise.connect(noiseGain);noiseGain.connect(filter);noise.start();
    }
    await this.context.resume();this.enabled=!this.enabled;
    this.master.gain.setTargetAtTime(this.enabled?.6:0,this.context.currentTime,.5);
    return this.enabled;
  }
  chime(index=0){
    if(!this.enabled||!this.context)return;const ctx=this.context;
    const frequencies=[261.63,329.63,392,523.25,659.25];
    [1,2.005].forEach((o,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=frequencies[index%5]*o;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.055/(i+1),ctx.currentTime+.03);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+3.5);osc.connect(gain);gain.connect(this.master);osc.start();osc.stop(ctx.currentTime+4);});
  }
  setEra(value){if(!this.context)return;this.voices.forEach((o,i)=>o.detune.setTargetAtTime(value*75+Math.sin(i)*3,this.context.currentTime,1));}
  suspend(){if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
  resume(){if(this.enabled&&this.context?.state==='suspended')this.context.resume().catch(()=>{});}
}
