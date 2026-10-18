import {assertVisualProject,assertVisualLocks} from '../core/visual-project.mjs';
import {effectiveProfile} from '../design/theme-registry.mjs';
import {applySceneTheme} from '../design/profile.mjs';
import {DeckError} from '../core/errors.mjs';
export const preferenceOptions=Object.freeze({uiLanguage:['en','zh-CN'],promptLanguage:['en','zh-CN'],outputLanguage:['en','zh-CN'],contentTone:['neutral','concise','formal'],visualStyle:['cream-collage','electric-violet','dark-data'],colorIntensity:['restrained','bold'],assetEmphasis:['balanced','large'],updatePreference:['manual','review-each-change']});
export const defaultPreferences=Object.freeze(Object.fromEntries(Object.entries(preferenceOptions).map(([k,v])=>[k,v[0]])));
export function preferences(input={}){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(preferenceOptions,k)))throw new DeckError('WORKBENCH_PREFERENCES','Use documented language and design preferences.',422);const result={...defaultPreferences,...input};for(const [key,values]of Object.entries(preferenceOptions))if(!values.includes(result[key]))throw new DeckError('WORKBENCH_PREFERENCES','Invalid preference: '+key,422);return result;}
/** Apply an explicit scoped choice. Never turn scene preferences into a project default. */
export function applyChoices(project,{id,profile,scope,projectWide=false,keepImages=[]}){
 const before=assertVisualProject(project);let next=structuredClone(before);const ids=scope||next.plan.scenes.map(s=>s.id);
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!next.plan.scenes.some(s=>s.id===id)))throw new DeckError('TOOL_SCOPE','Choose existing scene identities.',409);
 if(!Array.isArray(keepImages)||keepImages.some(id=>!next.document.blocks.some(b=>b.id===id&&b.type==='image')))throw new DeckError('WORKBENCH_IMAGE_LOCK','Choose existing image blocks.',422);
 const previous=next.extensions.deckweftWorkbench;for(const scene of next.plan.scenes){const locks=next.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===scene.id)?.fields||[];if(locks.includes('theme')&&!scene.profile)scene.profile=effectiveProfile(before,scene);}
 if(projectWide){next.document.visualBrief??={audience:'',outputLanguage:next.document.locale};next.document.visualBrief.profile={...(next.document.visualBrief.profile||{typographicContrast:'expressive',density:'comfortable',motionIntensity:'off'}),colorIntensity:profile.colorIntensity,imageEmphasis:profile.assetEmphasis};}
 for(const sceneId of ids){const scene=next.plan.scenes.find(s=>s.id===sceneId),locks=next.document.authorOverrides.sceneLocks?.find(l=>l.sceneId===sceneId)?.fields||[];if(!projectWide&&locks.includes('theme')&&scene.theme!==profile.visualStyle)throw new DeckError('AUTHOR_LOCK','This page theme is locked.',409);if(!projectWide&&!locks.includes('profile')&&!locks.includes('theme'))scene.profile={...effectiveProfile(next,scene),colorIntensity:profile.colorIntensity,imageEmphasis:profile.assetEmphasis};if(scene.theme!==profile.visualStyle&&!locks.includes('theme'))next=applySceneTheme(next,sceneId,profile.visualStyle);}
 next.document.authorOverrides.lockedBlockIds=[...new Set([...next.document.authorOverrides.lockedBlockIds,...keepImages])];
 next.extensions.deckweftWorkbench={id,preferences:projectWide?profile:previous?.preferences||profile,sceneChoices:[...(previous?.sceneChoices||[]),...(!projectWide?[{sceneIds:ids,visualStyle:profile.visualStyle,colorIntensity:profile.colorIntensity,assetEmphasis:profile.assetEmphasis}]:[])].slice(-100)};
 // All automatic operations retain every existing lock, even when a caller removes a field.
 if(JSON.stringify(next.document.authorOverrides.sceneLocks)!==JSON.stringify(before.document.authorOverrides.sceneLocks))throw new DeckError('AUTHOR_LOCK','Choices cannot remove scene locks.',409);
 assertVisualLocks(before,next);return assertVisualProject(next);
}
