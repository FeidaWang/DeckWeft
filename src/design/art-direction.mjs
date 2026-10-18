import {effectiveProfile,resolveTheme} from './theme-registry.mjs';
import {compositions} from './compositions.mjs';

/** Rendering direction, not a rewrite of the saved document or the author's plan. */
export function sceneDirection(document,plan,index){
 const scene=plan.scenes[index],profile=effectiveProfile(document,scene),blocks=scene.blockIds.map(id=>document.blocks.find(b=>b.id===id));
 const has=type=>blocks.some(b=>b.type===type),heading=blocks.find(b=>b.id===scene.focalBlockId&&b.type==='heading')||blocks.find(b=>b.type==='heading');
 const beat=index===0?'opening':index===plan.scenes.length-1?'closing':has('chart')?'evidence':has('table')?'comparison':has('image')?'image':has('metric')?'metric':scene.role;
 const visual=has('chart')||has('table')||has('diagram')||has('code'),sparse=!visual&&blocks.length<=6;
 const colorMode=scene.colorMode??(scene.composition==='violet-chapter'?'chapter':'default');
 const theme=resolveTheme(scene.theme,scene.themeVersion,document.locale,{profile,role:scene.role,colorMode});
 const zh=document.locale==='zh-CN',length=[...(heading?.text||'')].length;
 let headline=has('chart')?64:has('table')||has('diagram')||has('code')?72:has('metric')?(zh?76:96):beat==='opening'||beat==='closing'?112:88;
 // S3 families set their own tier: a chapter is a pause, a quotation carries its page, paired evidence needs the height.
 const family=compositions.find(c=>c.id===scene.composition)?.family;
 if(family==='chapter')headline=112;
 if(family==='quote')headline=zh?40:44;
 if(family==='before-after'||family==='small-multiples'||family==='system-map')headline=Math.min(headline,64);
 if(family==='closing')headline=Math.min(headline,88);
 // A long authored headline gets a different type tier, never truncation or hidden text.
 if(length>(zh?34:85))headline=Math.min(headline,76);
 if(length>(zh?60:140))headline=Math.min(headline,60);
 headline*=theme.displayScale;
 const readingHeadline=zh?Math.max(36,Math.min(48,Math.round(headline*.46))):Math.max(34,Math.min(58,Math.round(headline*.54)));
 return {readingHeadline,theme,beat,colorMode,sparse,headline:Math.round(headline),headlineWeight:scene.theme==='cream-collage'?(zh?600:400):scene.theme==='electric-violet'?750:650,headlineLeading:zh?1.12:1.02,headlineTracking:zh?'-.025em':scene.theme==='cream-collage'?'-.045em':'-.06em',body:profile.density==='compact'?20:22,lead:profile.density==='compact'?22:24,gutter:profile.density==='compact'?32:56,measure:visual?42:36};
}

/** Prefer a deliberate entrance, readable proof and a quieter final statement. */
export function narrativeCost(scene,descriptor,index,total){
 const family=descriptor.family,id=descriptor.id,phase=index===0?'opening':index===total-1?'closing':scene.role;
 let preferred;
 if(family==='statement')preferred=phase==='closing'?'statement-center':phase==='opening'?'statement-split':'statement-banner';
 if(family==='evidence')preferred='evidence-top';
 if(family==='metric')preferred=phase==='opening'?'metric-left':'metric-band';
 if(family==='image')preferred=phase==='closing'?'image-strip':'image-left';
 if(family==='comparison')preferred='comparison-matrix';
 if(family==='process')preferred=phase==='closing'?'process-line':'process-rail';
 if(family==='chapter')preferred=phase==='opening'?'chapter-index':'chapter-low';
 if(family==='before-after')preferred='before-after-split';
 if(family==='system-map')preferred='system-map-wide';
 if(family==='small-multiples')preferred='small-multiples-row';
 if(family==='quote')preferred=phase==='opening'||phase==='closing'?'quote-center':'quote-split';
 if(family==='closing')preferred=phase==='closing'?'closing-focus':'closing-split';
 return {phase,preferred:preferred||id,cost:preferred&&id!==preferred?3:0};
}
