import { useEffect, useState } from 'react';
let context:AudioContext|undefined;
export function chime(correct:boolean,enabled:boolean){if(!enabled)return;try{context??=new AudioContext();void context.resume().catch(()=>{});const o=context.createOscillator(),g=context.createGain();o.connect(g);g.connect(context.destination);o.type='sine';o.frequency.setValueAtTime(correct?660:220,context.currentTime);o.frequency.exponentialRampToValueAtTime(correct?880:165,context.currentTime+.16);g.gain.setValueAtTime(.055,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.25);o.start();o.stop(context.currentTime+.26);}catch{/* Sound is optional. */}}
export function useSpeech(rate:number){
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]); const [failed,setFailed]=useState(false);
 const supported=typeof window!=='undefined'&&'speechSynthesis'in window;
 useEffect(()=>{if(!supported)return;const update=()=>setVoices(window.speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang)||v.lang==='en'));update();window.speechSynthesis.addEventListener('voiceschanged',update);return()=>{window.speechSynthesis.removeEventListener('voiceschanged',update);window.speechSynthesis.cancel();};},[supported]);
 function speak(text:string){if(!supported||!voices.length){setFailed(true);return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=voices.find(v=>v.lang==='en-US')??voices[0];u.lang=u.voice.lang;u.rate=rate;u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))setFailed(true);};try{window.speechSynthesis.speak(u);}catch{setFailed(true);}}
 return {speak,available:supported&&voices.length>0&&!failed};
}
