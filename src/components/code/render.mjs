import {objectAnchor} from '../annotations/identity.mjs';
import {x} from '../../render/web/components/escape.mjs';
export function code(b,document,{sceneId='scene'}={}){
 const source=b.sourceAnchor&&document.sources.find(s=>s.id===b.sourceAnchor.sourceId);
 return `<figure class="semantic-code"><figcaption>${x(b.language)}${source?` · <a href="${x(source.url)}" rel="noreferrer">${x(source.title+' · '+b.sourceAnchor.anchor)}</a>`:''}</figcaption><pre tabindex="0" aria-label="${x(b.language)}"><code data-language="${x(b.language)}">${b.text.split('\n').map((line,i)=>`<span id="${objectAnchor(sceneId,b.id,'line-'+(i+1))}" data-line="${i+1}"${b.emphasizedLines?.includes(i+1)?' class="code-emphasis"':''}>${x(line).replace(/\r/g,'&#13;')}</span>`).join('\n')}</code></pre></figure>`;
}
