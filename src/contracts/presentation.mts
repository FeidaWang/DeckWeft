// Project comes from the runtime schema. Generated declarations live only in dist.
import type { Project as ProjectV2 } from '../../dist/types/project.mjs';
import type { Project as ProjectV1 } from '../../dist/types/project-v1.mjs';
export type Project=ProjectV1|ProjectV2;
export type {ProjectV1,ProjectV2};
export type Preferences={appearance:'system'|'light'|'dark';motion:'system'|'full'|'reduced'|'off'};
export type MotionPolicy='full'|'reduced'|'off';
export type SpeechOptions={wpm?:number;cpm?:number;pauseSeconds?:number};
export type SpeechCue={text:string;from:number;to:number;start:number;end:number};
export type PublicSlide={id:string;title:string;svg:string;motion:'none'|'fade'|'rise'};
export type AudienceView={version:1;sequence:number;title:string;locale:'en'|'zh-CN';index:number;total:number;slide:PublicSlide;motion:MotionPolicy};
export type SceneNode={id:string;x:number;y:number;w:number;h:number}&(
 | {type:'text';text:string;lines:string[];fontSize:number;color:string}
 | {type:'rect'|'ellipse';fill:string;radius?:number}
 | {type:'image';asset:string;alt:string});
export type Scene={format:'deckweft-scene';version:1;nodes:SceneNode[];width:number;height:number;background:string};
export type AssetReference={kind:'bundled-image';id:string;alt:string};
export type PresentationState=
 | {status:'idle'}
 | {status:'starting'}
 | {status:'ready';id:string;index:number;audienceUrl:string}
 | {status:'failed';message:string};
export type HostCapability={modelSelection:boolean;effortSelection:boolean;reportedModel:string|null};
export type DurableJobStatus='queued'|'running'|'validating'|'needs-review'|'applied'|'blocked'|'failed'|'cancelled'|'expired';
export type ModelEvidence={requested:{model:string;effort:string};reported:{model:string;effort:string|null};apiConfirmed:null};
export type JobState={status:'queued'|'running'}|{status:'complete';artifactHash:string}|{status:'failed';message:string};
