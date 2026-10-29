import { useCallback, useEffect, useState } from 'react';
let context:AudioContext|undefined;
export function chime(correct:boolean,enabled:boolean){if(!enabled)return;try{context??=new AudioContext();void context.resume().catch(()=>{});const o=context.createOscillator(),g=context.createGain();o.connect(g);g.connect(context.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.type='sine';o.frequency.setValueAtTime(correct?660:220,context.currentTime);o.frequency.exponentialRampToValueAtTime(correct?880:165,context.currentTime+.16);g.gain.setValueAtTime(.055,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.25);o.start();o.stop(context.currentTime+.26);}catch{/* Sound is optional. */}}

function readEnglishVoices(): SpeechSynthesisVoice[] {
 try { return window.speechSynthesis.getVoices().filter(voice => /^en(?:[-_]|$)/i.test(voice.lang)); }
 catch { return []; }
}

export function useSpeech(rate:number){
 const supported=typeof window!=='undefined'&&'speechSynthesis'in window;
 // A new question can use voices already loaded by the browser on its first render.
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>(()=>supported?readEnglishVoices():[]);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!supported)return;
  const update=()=>{
   const next=readEnglishVoices();
   setVoices(previous=>previous.length===next.length&&previous.every((voice,index)=>voice===next[index])?previous:next);
  };
  window.speechSynthesis.addEventListener('voiceschanged',update);
  update();
  return()=>{window.speechSynthesis.removeEventListener('voiceschanged',update);window.speechSynthesis.cancel();};
 },[supported]);
 const speak=useCallback((text:string)=>{if(!supported||!voices.length){setFailed(true);return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=voices.find(v=>v.lang==='en-US')??voices[0];u.lang=u.voice.lang;u.rate=rate;u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))setFailed(true);};try{window.speechSynthesis.speak(u);}catch{setFailed(true);}},[supported,voices,rate]);
 return {speak,available:supported&&voices.length>0&&!failed};
}
export function launchSound(enabled:boolean){
 if(!enabled)return;
 try{context??=new AudioContext();void context.resume().catch(()=>{});const o=context.createOscillator(),g=context.createGain();o.connect(g);g.connect(context.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.type='sine';o.frequency.setValueAtTime(320,context.currentTime);o.frequency.exponentialRampToValueAtTime(1100,context.currentTime+.12);g.gain.setValueAtTime(.035,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.15);o.start();o.stop(context.currentTime+.16);}catch{/* Optional game audio. */}
}
