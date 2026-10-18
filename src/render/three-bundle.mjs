// Deterministic two-file linker for the pinned Three.js source, not arbitrary input.
// Keeps the offline export self-contained without introducing a package dependency.
import {readFileSync} from 'node:fs';
let bundle;
const object=spec=>spec.split(',').map(s=>s.trim()).filter(Boolean).map(s=>{const [from,to]=s.split(/\s+as\s+/);return to?`${to}:${from}`:from;}).join(',');
export function threeBundle(){
 if(bundle)return bundle;
 const base=new URL('../../public/vendor/three/',import.meta.url),core=readFileSync(new URL('three.core.js',base),'utf8'),webgl=readFileSync(new URL('three.module.js',base),'utf8');
 const coreExport=core.match(/export\s*\{([^}]+)\};\s*$/),rendererExport=webgl.match(/export\s*\{([^}]+)\};\s*$/),imports=webgl.match(/import\s*\{([^}]+)\}\s*from\s*'\.\/three.core.js';/);
 if(!coreExport||!rendererExport||!imports)throw Error('Pinned Three.js module structure changed. Review the local linker.');
 const coreBody=core.slice(0,coreExport.index),rendererBody=webgl.slice(0,rendererExport.index).replace(imports[0],`const {${imports[1].replace(/\s+as\s+/g,':')}}=CORE;`).replace(/export\s*\{[^}]+\}\s*from\s*'\.\/three.core.js';/g,'');
 const license=readFileSync(new URL('LICENSE',base),'utf8');
 bundle=`/* ${license} */\n/* Three.js 0.186.1 — MIT. Copyright 2010-2026 Three.js Authors. See public/vendor/three/LICENSE. */\nwindow.DeckWeftThree=(()=>{const CORE=(()=>{${coreBody}\nreturn {${object(coreExport[1])}};})();\n${rendererBody}\nreturn {...CORE,${object(rendererExport[1])}};})();`;
 return bundle;
}
export const dotsScript=()=>readFileSync(new URL('../../public/three-dots.js',import.meta.url),'utf8');

export const spatialScript=()=>readFileSync(new URL('../../public/three-scene.js',import.meta.url),'utf8');
