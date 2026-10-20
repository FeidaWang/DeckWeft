// The page loader (single entry, step 4). One address, one shell, two deck kinds. This file reads ?project=, asks the deck
// list which kind that deck is, imports that kind's adapter and mounts the shell with it. When a deck of the other kind is
// opened (from the drawer's list, or "Make a new-version copy") the current kind is taken out of the page, the other is put
// in, and nothing reloads. A kind keeps its state and its listeners while it is out, so coming back is instant.
import {mountShell} from './shell.js';

const body=document.body;
const kinds={
  classic:{adapter:()=>import('./kinds/classic.js').then(m=>m.classicAdapter)},
  visual:{adapter:()=>import('./kinds/visual.js').then(m=>m.visualAdapter),markup:()=>import('./kinds/visual.js').then(m=>m.dialogMarkup),css:'/kinds/visual.css'}
};
const owned=()=>[...body.children].filter(node=>node.tagName!=='SCRIPT');
const baseline=new Set(body.classList);
// What index.html ships for the classic kind: <main id="root"> and its dialogs. Taken out of the page while Visual Studio is in it.
let classicPage=null;
let current=null;           // {kind, adapter, shell, nodes, classes}
const sessions={};          // kind → the same record, kept while the kind is out of the page
let busy=Promise.resolve();

async function deckKind(id){
  // The merged list decides the kind. A deck that is in neither list (or no list at all) leaves the choice to the default.
  try{
    const {token}=await(await fetch('/api/session')).json(),headers={Authorization:'Bearer '+token};
    const [legacy,visual]=await Promise.all([fetch('/api/projects',{headers}),fetch('/api/visual/projects',{headers})]).then(rs=>Promise.all(rs.map(r=>r.ok?r.json():{projects:[]})));
    const items=[...(legacy.projects||[]).map(p=>({...p,kind:'classic'})),...(visual.projects||[]).map(p=>({...p,kind:'visual'}))].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
    const found=items.find(p=>p.id===id&&!p.unreadable)||items.find(p=>!p.unreadable);
    // An empty library opens the visual kind's first-run box: a new deck is a visual (v3) one.
    return found?{kind:found.kind,id:found.id}:{kind:'visual',id:undefined};
  }catch{return {kind:'visual',id:undefined};}
}
function setStylesheet(kind,on){
  const href=kinds[kind].css;if(!href)return;
  let link=document.querySelector(`link[data-kind-css="${kind}"]`);
  if(!link){if(!on)return;link=Object.assign(document.createElement('link'),{rel:'stylesheet',href});link.dataset.kindCss=kind;document.head.append(link);}
  link.disabled=!on;
}
function takeOut(session){
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  session.title=document.title;
  session.classes=[...body.classList].filter(c=>!baseline.has(c));
  session.nodes=owned().filter(node=>session.nodes.includes(node));
  for(const c of session.classes)body.classList.remove(c);
  for(const node of session.nodes)node.remove();
  setStylesheet(session.kind,false);
}
function putIn(session){
  body.append(...session.nodes);
  for(const c of session.classes)body.classList.add(c);
  if(session.title)document.title=session.title;
  setStylesheet(session.kind,true);
}
async function create(kind){
  const session={kind,nodes:[],classes:[]};
  if(kind==='classic'){
    if(classicPage)body.prepend(...classicPage);
  }else{
    const main=document.createElement('main');main.id='root';
    body.append(main);body.insertAdjacentHTML('beforeend',await kinds.visual.markup());
  }
  setStylesheet(kind,true);
  const adapter=await kinds[kind].adapter();
  session.adapter=adapter;
  // The kind wires its controls into the shell's markup, so the shell goes first; the kind's open() then reads the library.
  session.shell=mountShell(adapter,document.querySelector('#root'));
  session.nodes=owned();
  return session;
}
async function show(kind,id){
  if(current?.kind===kind){await current.adapter.open(id);return true;}
  const locale=current?.shell.locale;
  if(current){takeOut(current);}
  else if(kind!=='classic'){classicPage=owned();for(const node of classicPage)node.remove();}
  let session=sessions[kind];
  if(session)putIn(session);else session=sessions[kind]=await create(kind);
  current=session;
  if(locale)session.shell.setLocale(locale);
  await session.adapter.open(id);
  return true;
}
// Switches are one at a time: a second request waits for the first.
const request=(kind,id)=>{const next=busy.then(()=>show(kind,id));busy=next.catch(()=>{});return next;};
window.addEventListener('deckweft:switch-deck',event=>{
  event.preventDefault();
  const {kind,id,done}=event.detail;
  request(kind,id).then(()=>done(true),error=>{console.error(error);done(false);});
});

// A deck that opens at the start: ?project=<id>, else the newest readable deck. An unknown id falls back to the newest.
const wanted=new URLSearchParams(location.search).get('project');
const first=await deckKind(wanted||undefined);
await request(first.kind,first.id);
