import { fitText,fontStack,visibleLine } from '/shared/text.mjs';
/** Canvas shapes the entire substring, not a sum of approximate character widths. */
export class BrowserTextMeasurer {
  constructor(){this.kind='browser-canvas';this.context=document.createElement('canvas').getContext('2d');if(!this.context)throw Error('Canvas text measurement is unavailable.');this.availability=new Map();this.cache=new Map();}
  async prepare(requests){
    await document.fonts.ready;
    const families=[...new Set(requests.flatMap(r=>r.style.families))];
    await Promise.all(families.filter(f=>!this.availability.has(f)).map(async family=>{
      // FontFaceSet.check alone returns true for nonexistent families. local() probes
      // distinguish those cases where the browser actually permits local lookup.
      const probe=new FontFace(`DeckWeftProbe${this.availability.size}_${Math.random().toString(36).slice(2)}`,`local("${family}")`);
      let available=false;try{await probe.load();available=true;}catch{}
      this.availability.set(family,available);
    }));
  }
  fit(text,box,style){
    const family=style.families.find(f=>this.availability.get(f))||style.fontFamily;
    const stack=fontStack([family,...style.families.filter(f=>f!==family)],style.generic);
    const measure=(string,size)=>{
      const key=stack+'\0'+size+'\0'+string;if(this.cache.has(key))return this.cache.get(key);
      const c=this.context;c.font=`normal 400 ${size}px ${stack}`;c.fontKerning='normal';c.textAlign='left';c.textBaseline='alphabetic';c.direction='ltr';
      const raw=c.measureText(visibleLine(string));
      const data={width:raw.width,left:Math.max(0,raw.actualBoundingBoxLeft||0),right:Math.max(0,raw.actualBoundingBoxRight||0),
        ascent:Math.max(raw.actualBoundingBoxAscent||0,raw.fontBoundingBoxAscent||0),descent:Math.max(raw.actualBoundingBoxDescent||0,raw.fontBoundingBoxDescent||0)};
      if(this.cache.size>12000)this.cache.clear();this.cache.set(key,data);return data;
    };
    const fitted=fitText(text,box,style,measure);
    return {...fitted,measurement:this.kind,fontFamily:family,fontStack:stack};
  }
  async resolve(plan,{signal,onProgress}={}){
    await this.prepare(plan.requests);const results=[];
    for(let i=0;i<plan.requests.length;i++){
      if(signal?.aborted)throw new DOMException('Measurement cancelled','AbortError');
      const r=plan.requests[i],fit=this.fit(r.text,r.box,r.style);
      results.push({id:r.id,fontSize:fit.fontSize,ranges:fit.ranges,widths:fit.widths,ascent:fit.ascent,descent:fit.descent,fontFamily:fit.fontFamily});
      if(i%12===0){onProgress?.(i,plan.requests.length);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    return {results,environment:{method:this.kind,fontProbes:Object.fromEntries([...new Set(plan.requests.flatMap(r=>r.style.families))].map(f=>[f,this.availability.get(f)])),warning:'Local font probes can be privacy-restricted. The browser may use per-glyph fallback; PowerPoint, Figma, and AE may substitute fonts.'}};
  }
}
