import schema from '../../schemas/design-profile.schema.json' with { type: 'json' };
import {validateSchema} from '../core/schema.mjs';
import {DeckError} from '../core/errors.mjs';
import {themePacks,resolveTheme,themeTokens,DEFAULT_PROFILE} from './theme-registry.mjs';
import {THEME_COMPOSITIONS,visibleBlockIds} from './plan.mjs';
/** S9a reusable design profiles (VIS-015's last acceptance sentence). A profile is promoted from an accepted design and keeps
 * only design: theme, profile choices, the composition used for each kind of page, and the type and motion tokens drawn.
 * Document text, data, sources, images, asset references and branding have no field, so none can travel to another deck. */
export const PAGE_KINDS=Object.freeze(['opening','closing','chart','table','image','metric','diagram','quote','list','text']);
const fail=(message,code='DESIGN_PROFILE',status=422,details)=>{throw new DeckError(code,message,status,details);};
/** The kind of page a composition choice is recorded for: the opening and closing by position, otherwise the first visible content type. */
export function pageKind(document,plan,scene){
 const i=plan.scenes.findIndex(s=>s.id===scene.id);if(i===0&&plan.scenes.length>1)return 'opening';if(i===plan.scenes.length-1&&plan.scenes.length>1)return 'closing';
 const types=visibleBlockIds(scene).map(id=>document.blocks.find(b=>b.id===id).type);
 return ['chart','table','image','metric','diagram','quote','list'].find(k=>types.includes(k))||'text';
}
export function assertDesignProfile(profile){
 const result=validateSchema(profile,schema);if(!result.ok)fail('Use the versioned design-profile contract.','DESIGN_PROFILE',422,result.errors);
 const pack=themePacks().find(p=>p.id===profile.theme.id);if(!pack||pack.version!==profile.theme.version)fail('The profile names a theme version this build does not have.');
 for(const c of profile.compositions){const own=THEME_COMPOSITIONS[c.composition];if(own&&own.theme!==pack.id)fail(`${c.composition} belongs to the ${own.theme} theme.`);if(!pack.compositions.includes(c.composition))fail(`${pack.id} has no ${c.composition} composition.`);}
 if(new Set(profile.compositions.map(c=>c.kind)).size!==profile.compositions.length)fail('Record one composition per kind of page.');
 return profile;
}
/** Type and motion tokens of a theme under a profile, as drawn: both locales, so a profile applied to either language matches. */
export function drawnTokens(themeId,profile){
 const pack=themePacks().find(p=>p.id===themeId),roles=locale=>{const t=resolveTheme(themeId,pack.version,locale,{profile});return {display:t.display,body:t.body,numeric:t.tokens.typography.numeric};};
 const m=themeTokens(themeId).motion;
 return {type:{en:roles('en'),'zh-CN':roles('zh-CN'),displayScale:resolveTheme(themeId,pack.version,'en',{profile}).displayScale},motion:{durationMs:pack.motion.durationMs,effect:pack.motion.effect,distance:m.distance,easing:m.easing,delay:m.delay,fallback:m.fallback}};
}
/** Promote an accepted design. The dominant theme (most pages, then the opening's) is recorded with the composition its pages used per kind. */
export function promoteProfile(project,{id,name,acceptance}){
 const {document,plan}=project,count=new Map();for(const s of plan.scenes)count.set(s.theme,(count.get(s.theme)||0)+1);
 const theme=[...count].sort((a,b)=>b[1]-a[1]||(a[0]===plan.scenes[0].theme?-1:b[0]===plan.scenes[0].theme?1:0))[0][0],pack=themePacks().find(p=>p.id===theme);
 const profile={...DEFAULT_PROFILE,...document.visualBrief?.profile},chosen=new Map(),skipped=[];
 for(const s of plan.scenes){if(s.theme!==theme){skipped.push({sceneId:s.id,reason:'other-theme'});continue;}const kind=pageKind(document,plan,s),k=chosen.get(kind)||new Map();k.set(s.composition,(k.get(s.composition)||0)+1);chosen.set(kind,k);}
 const compositions=PAGE_KINDS.filter(k=>chosen.has(k)).map(kind=>({kind,composition:[...chosen.get(kind)].sort((a,b)=>b[1]-a[1])[0][0]}));
 const tokens=drawnTokens(theme,profile);
 return {profile:assertDesignProfile({format:'deckweft-design-profile',version:1,id,name,theme:{id:theme,version:pack.version},profile,compositions,type:tokens.type,motion:tokens.motion,acceptance}),skipped};
}
/** Token drift: the pack's current drawing of the recorded theme differs from what was accepted. Reported, never hidden. */
export function tokenDrift(profile){
 const now=drawnTokens(profile.theme.id,profile.profile),drift=[];
 if(now.type.displayScale!==profile.type.displayScale)drift.push('type.displayScale');
 for(const l of ['en','zh-CN'])for(const r of ['display','body','numeric'])if(now.type[l][r]!==profile.type[l][r])drift.push(`type.${l}.${r}`);
 for(const [k,v] of Object.entries(profile.motion))if(now.motion[k]!==v)drift.push('motion.'+k);
 return drift;
}
