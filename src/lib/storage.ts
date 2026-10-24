import type { Progress, Result } from '../types';
import { accuracy, localDay } from './engine';
import { shooterPreferences } from './shooter';
export const STORAGE_KEY='english-adventure-v1';
export function resultBestKey(r: Pick<Result, 'grade' | 'game' | 'difficulty' | 'shooterPace'>) {
 return `${r.grade}-${r.game}-${r.difficulty}${r.game==='shooter'&&r.shooterPace==='relaxed'?'-relaxed':''}`;
}
export function freshProgress():Progress { return {version:1,settings:{grade:1,difficulty:'easy',topic:'all',sound:true,motion:true,rate:.85,...shooterPreferences({})},history:[],mistakes:[],levels:{},coins:0,daily:[],totalPlayed:0,totalStars:0,best:{}}; }
export function readProgress():Progress {try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return freshProgress();return validateProgress(JSON.parse(raw));}catch{return freshProgress();}}
export function validateProgress(value:unknown):Progress {
 const base=freshProgress(); if(!value||typeof value!=='object')return base;
 const p=value as Partial<Progress>;
 if(p.version!==1)return base;
 const s=p.settings;
 if(s&&[1,2,3,4,5,6].includes(s.grade)&&['easy','normal','hard'].includes(s.difficulty))base.settings={grade:s.grade,difficulty:s.difficulty,topic:typeof s.topic==='string'?s.topic:'all',sound:s.sound!==false,motion:s.motion!==false,rate:[.65,.85,1,1.15].includes(s.rate)?s.rate:.85,...shooterPreferences(s)};
 base.history=Array.isArray(p.history)?p.history.filter((r)=>r&&typeof r.id==='string'&&[1,2,3,4,5,6].includes(r.grade)&&Array.isArray(r.answers)&&r.answers.every(a=>a&&typeof a.questionId==='string'&&typeof a.correct==='boolean'&&typeof a.given==='string')&&Number.isFinite(r.score)&&r.score>=0&&Number.isFinite(r.seconds)&&r.seconds>=0&&Number.isInteger(r.stars)&&r.stars>=0&&r.stars<=3&&["easy","normal","hard"].includes(r.difficulty)&&["picture","memory","listening","spelling","speed","sentence","reading","adventure","shooter"].includes(r.game)&&typeof r.date==='string'&&(r.shooterPace===undefined||['challenge','relaxed'].includes(r.shooterPace))).slice(-300):[];
 base.mistakes=Array.isArray(p.mistakes)?[...new Set(p.mistakes.filter(x=>typeof x==='string'))]:[];
 if(p.levels&&typeof p.levels==='object') for(const [g,l] of Object.entries(p.levels))if(/^[1-6]$/.test(g)&&Array.isArray(l))base.levels[g]=l.slice(0,5).map(x=>Number.isInteger(x)&&x>=0&&x<=3?x:0);
 base.coins=Number.isFinite(p.coins)&&p.coins!>=0?p.coins!:0;
 base.totalPlayed=Number.isFinite(p.totalPlayed)&&p.totalPlayed!>=0?p.totalPlayed!:base.history.length;
 base.totalStars=Number.isFinite(p.totalStars)&&p.totalStars!>=0?p.totalStars!:base.history.reduce((n,r)=>n+r.stars,0);
 base.daily=Array.isArray(p.daily)?p.daily.filter(x=>typeof x==='string').slice(-365):[];
 if(p.best&&typeof p.best==='object')for(const [k,v]of Object.entries(p.best))if(Number.isFinite(v)&&v>=0)base.best[k]=v;
 return base;
}
export function writeProgress(p:Progress):boolean {try{localStorage.setItem(STORAGE_KEY,JSON.stringify(p));return true;}catch{return false;}}
export function recordResult(p:Progress,r:Result):Progress {
 if(p.history.some(x=>x.id===r.id))return p;
 const wrong=new Set(p.mistakes);
 for(const a of r.answers){if(a.correct)wrong.delete(a.questionId);else wrong.add(a.questionId);}
 const levels={...p.levels};
 if(r.game==='adventure'&&r.level&&accuracy(r.answers)>=60){const l=[...(levels[r.grade]??[0,0,0,0,0])];l[r.level-1]=Math.max(l[r.level-1]??0,r.stars);levels[r.grade]=l;}
 const day=localDay(); const newDaily=!!r.daily&&accuracy(r.answers)>=80&&!p.daily.includes(day);
 const bestKey=resultBestKey(r);
 return {...p,history:[...p.history,r].slice(-300),mistakes:[...wrong],levels,coins:p.coins+r.stars*10+(newDaily?20:0),daily:newDaily?[...p.daily,day].slice(-365):p.daily,totalPlayed:p.totalPlayed+1,totalStars:p.totalStars+r.stars,best:{...p.best,[bestKey]:Math.max(p.best[bestKey]??0,r.score)}};
}
export function badges(p:Progress){return [{name:'勇敢出發',icon:'🌱',detail:'完成第一次遊戲',earned:p.totalPlayed>=1},{name:'閃亮新星',icon:'⭐',detail:'累積 15 顆星星',earned:p.totalStars>=15},{name:'全能探險家',icon:'🧭',detail:'探索 8 款不同遊戲',earned:new Set(p.history.map(r=>r.game)).size>=8},{name:'完美挑戰',icon:'🏆',detail:'完成一次全對挑戰',earned:p.history.some(r=>accuracy(r.answers)===100)},{name:'勤學小隊長',icon:'🎒',detail:'完成 10 次遊戲',earned:p.totalPlayed>=10},{name:'森林守護者',icon:'🌳',detail:'完成任一年級 5 關',earned:Object.values(p.levels).some(l=>l.filter(Boolean).length===5)}];}
