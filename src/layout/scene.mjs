import {compileRecipe} from './recipes.mjs';
import {compileShowcase} from './showcase.mjs';
import { estimatedTextMeasurer,fontPreference } from './text.mjs';
export const PALETTES = {
  signal: { background: '#FFFFFF', ink: '#101010', muted: '#62645F', accent: '#075FFF', tint: '#EDF2FF', surface: '#FFFFFF', line: '#DADCD8' },
  paper: { background: '#F8F5EE', ink: '#232B27', muted: '#5D655E', accent: '#A6422A', tint: '#EDE5D7', surface: '#FFFFFF', line: '#D8D1C4' },
  midnight: { background: '#182923', ink: '#F6F2E8', muted: '#C1CCC3', accent: '#F2B69E', tint: '#294139', surface: '#22372F', line: '#4C6155' },
  ocean: { background: '#EEF4F3', ink: '#163F40', muted: '#506769', accent: '#166C65', tint: '#D9E8E4', surface: '#FFFFFF', line: '#B6D1C9' }
};
export const DIMENSIONS = { '16:9': [1280,720], '4:3':[960,720], '1:1':[960,960], '9:16':[720,1280] };
export const LAYOUT_INFO = {
  editorial: { label: 'Editorial split', explanation: 'Give the headline room; keep the support in a separate column.', roles: ['opening','context','decision'] },
  spotlight: { label: 'Statement stage', explanation: 'Make one idea the focal point, with the support underneath.', roles: ['opening','closing','decision'] },
  grid: { label: 'Evidence grid', explanation: 'Give each fact or supporting point its own clear space.', roles: ['evidence','context'] },
  timeline: { label: 'Step by step', explanation: 'Read the supporting points in an explicit sequence.', roles: ['process','decision'] }
};
export function compileSlide(project, slide, layout = 'editorial', {measurer=estimatedTextMeasurer,assetResources={}}={}) {
  if(project.schemaVersion===2)return compileRecipe(project,slide,layout,{measurer,assetResources,palette:PALETTES[project.theme],dimensions:DIMENSIONS[project.aspectRatio]});
  if(project.extensions?.deckweftShowcase?.style==='cosmos-dots')return compileShowcase(project,slide,layout,{measurer});
  const [w,h] = DIMENSIONS[project.aspectRatio];
  const p = PALETTES[project.theme], m = Math.round(Math.min(w,h)*.075), gap = 24;
  const inner = w-2*m, bottom = h-m-30, portrait = w/h < .85;
  const scene = { format:'deckweft-scene', version:1, id:slide.id, layout, width:w,height:h,background:p.background,measurement:measurer.kind,nodes:[],issues:[] };
  let n = 0;
  function box(x,y,bw,bh,fill=p.surface,radius=0,shape='rect') {
    scene.nodes.push({ id:`${slide.id}_shape_${n++}`,type:shape,x,y,w:bw,h:bh,fill,radius });
  }
  function text(key,value,x,y,bw,bh,preferred=30,minimum=20,color=p.ink,display=false) {
    if (!value) return;
    const id=`${slide.id}_${key}_${n++}`;
    const style={...fontPreference(project.locale,project.theme==='signal'?false:display),preferred,minimum,leading:display?1.10:1.27};
    const fit=measurer.fit(value,{w:bw,h:bh},style,`${layout}:${id}`);
    scene.nodes.push({id,type:'text',role:key,x,y,w:bw,h:bh,color,...fit});
    if (fit.overflow) scene.issues.push({ code:'TEXT_OVERFLOW',severity:'error',node:key,message:`${key}: shorten the text or choose another layout.`,requiredHeight:fit.requiredHeight,availableHeight:bh });
  }
  function support(x,y,bw,bh,mode='list') {
    const c = slide.content;
    const entries = [...c.metrics.map(v=>({label:v.label,value:v.value})), ...c.items.map(label=>({label,value:''}))];
    let top = y;
    if (c.body) {
      const bodyH = entries.length ? Math.min(bh*.30,120) : bh;
      text('body',c.body,x,top,bw,bodyH,entries.length?25:32,20,p.muted);
      top += bodyH + (entries.length?gap:0);
    }
    if (!entries.length) return;
    const remain = y+bh-top;
    const cols = mode==='cards' && !portrait && entries.length>1 ? 2 : 1;
    const rows = Math.ceil(entries.length/cols), cellW = (bw-gap*(cols-1))/cols;
    const cellH = (remain-gap*(rows-1))/rows;
    entries.forEach((entry,i)=>{
      const ex = x+(i%cols)*(cellW+gap), ey=top+Math.floor(i/cols)*(cellH+gap);
      if (cellH < 34) scene.issues.push({code:'DENSE_CONTENT',severity:'error',node:'items',message:'Too many points. Split this into two slides.'});
      if (mode==='cards') {
        box(ex,ey,cellW,Math.max(1,cellH),p.tint,12);
        if(entry.value) {
          // Reserve a full CJK label line, instead of allocating half the card
          // to the number and discovering that a real 18 px font needs 26+ px.
          // Small cards still report overflow; never shrink below the type floor.
          const valueH=Math.max(24,Math.min(cellH*.49,cellH-25-32));
          text('metric-value',entry.value,ex+20,ey+14,cellW-40,valueH,48,24,p.accent,true);
          text('metric-label',entry.label,ex+20,ey+valueH+16,cellW-40,Math.max(12,cellH-valueH-25),23,18,p.muted);
        } else text('item',entry.label,ex+20,ey+18,cellW-40,Math.max(12,cellH-36),29,20);
      } else {
        const pad = mode==='steps'?48:24;
        if(mode==='steps') {
          box(ex,ey+2,32,32,p.accent,16,'ellipse');
          text('step-number',String(i+1),ex+9,ey+8,24,24,16,16,p.background);
          if(i<entries.length-1) box(ex+15,ey+40,2,Math.max(1,cellH-20),p.line);
        } else box(ex,ey+7,4,Math.max(16,cellH-10),p.accent,2);
        text(entry.value?'metric':'item',entry.value?`${entry.value}  ${entry.label}`:entry.label,ex+pad,ey,cellW-pad,Math.max(12,cellH),30,20);
      }
    });
  }
  // All layout recipes use the same content and node model. Nothing is silently omitted.
  text('eyebrow',slide.content.eyebrow || 'DECKWEFT',m,m,inner*.84,30,16,14,p.accent);
  const title=slide.content.title;
  if(layout==='editorial') {
    if(portrait){
      text('title',title,m,m+78,inner,Math.min(340,h*.30),64,32,p.ink,true);
      box(m,m+432,inner,2,p.line);
      support(m,m+466,inner,bottom-(m+466));
    } else {
      const left=inner*.52, rightX=m+left+48, rightW=inner-left-48;
      box(m,m+80,4,Math.min(340,h*.43),p.accent,2);
      text('title',title,m+28,m+76,left-28,bottom-m-92,66,32,p.ink,true);
      support(rightX,m+100,rightW,bottom-m-100);
    }
  } else if(layout==='spotlight') {
    box(w-m-90,m,72,8,p.accent,4);
    const ty=m+90, th=portrait?340:h*.34;
    text('title',title,m,ty,inner*(portrait?1:.90),th,portrait?68:80,32,p.ink,true);
    const sy=ty+th+36;
    box(m,sy-16,inner,2,p.line);
    support(m,sy+12,inner,bottom-sy-12,slide.content.metrics.length?'cards':'list');
  } else if(layout==='grid') {
    const ty=m+66, th=portrait?220:h*.19;
    text('title',title,m,ty,inner,th,56,30,p.ink,true);
    support(m,ty+th+32,inner,bottom-ty-th-32,'cards');
  } else if(layout==='timeline') {
    if(!portrait){
      const left=inner*.40;
      text('title',title,m,m+90,left,Math.min(360,bottom-m-90),58,30,p.ink,true);
      support(m+left+56,m+90,inner-left-56,bottom-m-90,'steps');
    }else{
      text('title',title,m,m+74,inner,240,60,30,p.ink,true);
      support(m,m+346,inner,bottom-m-346,'steps');
    }
  } else throw new Error(`Unknown layout: ${layout}`);
  box(m,h-m-10,inner,1,p.line);
  const index=project.slides.findIndex(s=>s.id===slide.id)+1;
  text('footer',`${String(index).padStart(2,'0')} / ${String(project.slides.length).padStart(2,'0')}`,w-m-100,h-m+8,100,22,14,14,p.muted);
  if(slide.sourceIds.length) text('source-note',project.locale==='zh-CN'?'来源见讲者备注':'Sources in speaker notes',m,h-m+8,inner-110,22,14,14,p.muted);
  return scene;
}
