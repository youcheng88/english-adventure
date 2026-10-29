import bankData from '../data/bank.json';
import type { Question, Difficulty, GameId, Round } from '../types';
export const bank = bankData as Question[];
import { config, shuffle } from './catalog';
export { games, difficultyNames, config, shuffle, normalize, starsFor, scoreAnswer, accuracy, localDay } from './catalog';
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
