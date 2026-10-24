import bankData from '../data/bank.json';
import type { Question, Difficulty, GameId, Round, Answer } from '../types';
export const bank = bankData as Question[];
export const games: {id: GameId; name: string; english: string; description: string; color: string; tag: string}[] = [
 {id:'shooter', name:'英文泡泡射手', english:'Word Pop Galaxy', description:'瞄準英文泡泡，發射星光彈，連擊學單字！', color:'blue', tag:'NEW・射擊・單字'},
 {id:'picture', name:'單字圖片配對', english:'Picture Match', description:'看一看，找出圖片的英文好朋友。', color:'mint', tag:'單字・觀察'},
 {id:'memory', name:'翻牌記憶', english:'Memory Garden', description:'翻開小卡片，把中英文配成一對！', color:'lavender', tag:'記憶・配對'},
 {id:'listening', name:'英文聽力挑戰', english:'Listen & Find', description:'豎起小耳朵，聽聽小芽說了什麼。', color:'peach', tag:'聽力・辨識'},
 {id:'spelling', name:'拼字大師', english:'Word Builder', description:'把迷路的字母排好，拼出新單字。', color:'blue', tag:'拼字・字母'},
 {id:'speed', name:'限時英文搶答', english:'Quick Quest', description:'和時間賽跑，挑戰你的連勝紀錄！', color:'yellow', tag:'反應・複習'},
 {id:'sentence', name:'英文句子排序', english:'Sentence Studio', description:'移動單字積木，組出完整的句子。', color:'pink', tag:'句型・語法'},
 {id:'reading', name:'英文閱讀冒險', english:'Story Explorer', description:'走進小故事，發現藏在文字裡的線索。', color:'lavender', tag:'閱讀・理解'},
 {id:'adventure', name:'英文冒險闖關', english:'Adventure Trail', description:'帶著小芽出發，點亮你的冒險地圖！', color:'mint', tag:'綜合・闖關'},
];
export const difficultyNames = {easy:'簡單',normal:'普通',hard:'困難'};
export const config = {easy:{count:5,pairs:4,seconds:25,choices:2,hints:3},normal:{count:8,pairs:6,seconds:18,choices:3,hints:2},hard:{count:10,pairs:8,seconds:12,choices:4,hints:0}};
export function shuffle<T>(items: readonly T[], random = Math.random): T[] { const a=[...items]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export function suitable(q: Question, game: GameId): boolean { if(['picture','memory','spelling','shooter'].includes(game)) return q.questionType==='vocabulary'; if(game==='sentence') return q.questionType==='sentence'; if(game==='reading') return q.questionType==='reading'; if(game==='listening') return ['vocabulary','sentence'].includes(q.questionType); return q.questionType!=='reading'; }
export function selectQuestions(grade:number,difficulty:Difficulty,game:GameId,topic='all',source=bank): {questions:Question[];expanded:boolean} {
 const gradePool=source.filter(q=>q.grade===grade&&suitable(q,game));
 const topical=gradePool.filter(q=>topic==='all'||q.topic===topic);
 const expanded=topical.length===0;
 const pool=expanded?gradePool:topical;
 const rank={easy:0,normal:1,hard:2};
 const preferred=shuffle(pool.filter(q=>rank[q.difficulty]<=rank[difficulty]));
 const extra=shuffle(pool.filter(q=>rank[q.difficulty]>rank[difficulty]));
 const count=game==='memory'?config[difficulty].pairs:config[difficulty].count;
 return { questions:[...preferred,...extra].slice(0,count), expanded:expanded||preferred.length<Math.min(count,pool.length) };
}
export function makeRounds(questions:Question[],game:GameId):Round[] { return questions.map((question,i)=>({question,mode:game==='adventure'?(question.questionType==='sentence'?'sentence':question.questionType==='alphabet'?'speed':i%2?'listening':'picture'):game})); }
export function reviewRounds(ids: string[], game: GameId, source = bank): Round[] {
 return [...new Set(ids)].flatMap(id => {
  const question = source.find(q => q.id === id);
  if (!question) return [];
  const mode: GameId = question.questionType==='sentence'?'sentence':question.questionType==='reading'?'reading':question.questionType==='alphabet'?'speed':game==='shooter'?'shooter':'picture';
  return [{ question, mode }];
 });
}
export function adventureRounds(grade:number,difficulty:Difficulty,level:number):Round[] {
 const rank={easy:0,normal:1,hard:2};
 const pool=bank.filter(q=>q.grade===grade&&q.questionType!=='reading'&&q.questionType!=='alphabet'&&rank[q.difficulty]<=rank[difficulty]);
 const words=shuffle(pool.filter(q=>q.questionType==='vocabulary'));
 const sentences=shuffle(pool.filter(q=>q.questionType==='sentence'));
 const count=Math.min(config[difficulty].count+level-1,12);
 return Array.from({length:count},(_,i):Round|null=>{const mode:GameId=i%3===2?'sentence':i%3===1?'listening':'picture'; const question=mode==='sentence'?sentences.pop():words.pop(); return question?{question,mode}:null;}).filter((r):r is Round=>r!==null);
}
export function choiceOptions(q:Question,mode:GameId,difficulty:Difficulty):string[] {
 const chinese=mode==='listening'; const answer=chinese?q.translation:q.correctAnswer;
 let distractors=chinese?bank.filter(x=>x.grade===q.grade&&x.questionType===q.questionType&&x.id!==q.id).map(x=>x.translation):q.choices.filter(x=>x!==answer);
 if(!distractors.length) distractors=bank.filter(x=>x.grade===q.grade&&x.questionType===q.questionType&&x.id!==q.id).map(x=>x.correctAnswer);
 return shuffle([answer,...shuffle([...new Set(distractors)].filter(x=>x&&x!==answer)).slice(0,config[difficulty].choices-1)]);
}
export const normalize=(s:string)=>s.trim().replace(/\s+/g,' ');
export function starsFor(correct:number,total:number):number { if(!total||!correct)return 0; const ratio=correct/total; return ratio>=.9?3:ratio>=.7?2:1; }
export function scoreAnswer(correct:boolean,streak:number,game:GameId):number {return correct?100+((game==='speed'||game==='shooter')?Math.min(streak,5)*20:0):0;}
export function accuracy(answers:Answer[]):number {return answers.length?Math.round(100*answers.filter(a=>a.correct).length/answers.length):0;}
export function localDay(date=new Date()):string {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
