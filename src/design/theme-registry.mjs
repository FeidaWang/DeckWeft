import cream from '../../themes/cream-collage/theme.json' with { type: 'json' };
import dark from '../../themes/dark-data/theme.json' with { type: 'json' };
import violet from '../../themes/electric-violet/theme.json' with { type: 'json' };
import schema from '../../schemas/theme-pack.schema.json' with { type: 'json' };
import { validateSchema } from '../core/schema.mjs';
import { resolveScopedRules } from './rules.mjs';
import { DeckError } from '../core/errors.mjs';
export const DEFAULT_PROFILE={colorIntensity:'bold',typographicContrast:'expressive',density:'comfortable',motionIntensity:'off',imageEmphasis:'large'};
const packs=[cream,dark,violet];
for(const p of packs)if(!validateSchema(p,schema).ok)throw Error('Invalid packaged theme: '+p.id);
export const themePacks=()=>structuredClone(packs);
export const effectiveProfile=(document,scene)=>({...DEFAULT_PROFILE,...document.visualBrief?.profile,...scene.profile});
export function resolveTheme(id,version,locale,{profile=DEFAULT_PROFILE,colorMode='default',role='context'}={}) {
 const pack=packs.find(p=>p.id===id);
 if(!pack||version!==pack.version||!['en','zh-CN'].includes(locale))throw new DeckError('THEME_VERSION','Choose an available versioned theme and locale.');
 const palette={...pack.palette};
 if(colorMode==='chapter'&&pack.modes.chapter==='violet')Object.assign(palette,{paper:palette.accent,ink:'#FFFFFF',accent:'#FFFFFF',secondary:'#121212'});
 if(profile.colorIntensity==='restrained'&&id==='electric-violet')Object.assign(palette,{paper:'#F5F2FF',ink:'#28115C',accent:'#5114F6'});
 const channels=palette.paper.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),darkSurface=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722<.18;
 return structuredClone({id,version,...palette,chart:darkSurface?dark.chartColors:pack.chartColors,display:locale==='zh-CN'?pack.typography.displayZh:pack.typography.displayEn,body:locale==='zh-CN'?pack.typography.bodyZh:pack.typography.bodyEn,code:pack.typography.code,locale,page:profile.density==='compact'?32:pack.spacing.page,gap:pack.spacing.gap,displayScale:profile.typographicContrast==='balanced'?.85:pack.typography.displayScale,split:profile.imageEmphasis==='large'?pack.imageGrammar.split:.44,motion:profile.motionIntensity==='off'?{durationMs:0,effect:'none'}:pack.motion,colorIntensity:profile.colorIntensity,compositions:pack.compositions,rules:resolveScopedRules(pack,{role,mode:colorMode})});
}
