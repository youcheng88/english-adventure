import {Images,Copy,Headphones,SpellCheck,Zap,Blocks,BookOpen,Map,Crosshair} from 'lucide-react';
import type {GameId} from '../types';
const icons={picture:Images,memory:Copy,listening:Headphones,spelling:SpellCheck,speed:Zap,sentence:Blocks,reading:BookOpen,adventure:Map,shooter:Crosshair};
export function GameIcon({game,size=28}:{game:GameId;size?:number}){const Icon=icons[game];return <Icon size={size} strokeWidth={1.7} aria-hidden="true"/>;}
