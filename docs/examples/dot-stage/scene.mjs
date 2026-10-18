// One scene source drives the local player, editable PPTX, Figma and AE handoffs.
export const palette={white:'#FFFFFF',ink:'#101010',blue:'#075FFF',green:'#00AB47',orange:'#FF7900',purple:'#974BFF',muted:'#62645F',line:'#DADCD8'};
const {white,ink,blue,green,orange,purple,muted}=palette;
const text=(value,x,y,w,h,size=38,color=ink,bold=false,delay=0)=>({kind:'text',value,x,y,w,h,size,color,bold,delay});
const shape=(id,x,y,w,h,fill,geometry='rect')=>({kind:'shape',id,x,y,w,h,fill,geometry});
const slide=(id,title,background,nodes,speech,seconds,cue,extra={})=>({id,title,background,nodes,speech,seconds,cue,...extra});
export const dots=[
 {name:'Blue',crop:{x:129,y:293,s:184},x:90,y:405,s:260,delay:80,turn:-9},
 {name:'Orange',crop:{x:328,y:233,s:153},x:392,y:335,s:222,delay:180,turn:7},
 {name:'Purple',crop:{x:311,y:452,s:234},x:630,y:455,s:290,delay:300,turn:-5},
 {name:'Green',crop:{x:511,y:318,s:211},x:989,y:342,s:280,delay:400,turn:8},
 {name:'Grey',crop:{x:660,y:230,s:100},x:1330,y:546,s:150,delay:500,turn:-7}
];
export const demoCues=[
 {at:0,until:5,action:'Switch to the prepared Studio tab. Select slide 1.',say:'Here is a rough outline with three simple points.'},
 {at:5,until:15,action:'Change the headline to “Our build is ready to share”.',say:'I can change the headline right here.'},
 {at:15,until:25,action:'Choose Evidence grid. Wait for “Browser-measured”.',say:'Then I can try a different arrangement without rewriting the content.'},
 {at:25,until:33,action:'Save. Look for “Saved on this computer”.',say:'The words stay intact, and I can save the result locally.'},
 {at:33,until:43,action:'Export, then PowerPoint. Keep the downloaded file.',say:'The PowerPoint export contains editable text and shapes.'},
 {at:43,until:50,action:'Return to pitch slide 5.',say:'That is the workflow. Here is what happens underneath.'}
];
export const deck={title:'DeckWeft — Your build, clearly told',width:1600,height:900,slides:[
 slide('hello','DeckWeft',white,[
  text('DeckWeft',78,210,1440,190,152,ink,true,0),
  text('Your build, clearly told.',86,463,1440,100,66,blue,true,110),
  text('A local workbench for editable presentations.',88,688,1420,70,36,ink,false,220),
  text('BUILT FOR PEOPLE WHO BUILD',88,82,1400,35,23,ink,true,0)
 ],'Hi everyone. You have built something worth showing. Then demo time arrives and your slides are still blank. DeckWeft helps you turn your own notes into an editable presentation.',15,'Look up after “Hi everyone”. Let the project name land.'),
 slide('problem','A working demo, a rough story',white,[
  text('A working demo.\nA rough story.',78,174,1450,275,112,ink,true,0),
  text('The next job is making the idea easy to follow.',88,541,1400,80,44,ink,false,150),
  text('STARTING HYPOTHESIS',88,752,530,38,22,blue,true,220),
  text('We still need user trials to measure the benefit.',88,800,1400,40,27,muted,false,240)
 ],'For a first-time builder, explaining the project can feel like another project. You need to choose the words, arrange them and keep everything readable. I am exploring a simpler workflow. We have not measured time savings yet.',20,'Describe one familiar situation. Do not rush the final sentence.'),
 slide('choices','One outline, four arrangements',blue,[
  text('One outline.',78,139,1430,145,111,white,true,0),
  text('Four arrangements.',78,279,1440,155,111,white,true,120),
  text('The words stay editable.',88,503,1410,85,57,white,true,240),
  text('Compare layouts in the Studio. Export when the text fits.',88,715,1410,75,35,white,false,310)
 ],'Start with a short outline. DeckWeft offers four arrangements of the same content. Choose one, keep editing, then export editable slides. The core Studio runs on your laptop with Node. Optional AI drafting is separate.',20,'The HTML edition has an optional layout explorer. Keep it closed during the timed pitch.',{explorer:true}),
 slide('demo','The fifty-second demo',white,[
  text('One clear change.',78,72,1440,110,88,ink,true),
  text('Edit the headline. Change the layout. Save and export.',88,206,1430,65,34,ink,false,100),
  {kind:'image',asset:'studio',x:240,y:302,w:1120,h:510,alt:'Actual DeckWeft Studio with the prepared English demo.'},
  text('50 SECONDS',88,815,650,37,23,blue,true)
 ],demoCues.map(c=>c.say).join(' '),50,'Switch to the real Studio. One action per sentence. Return at 1:45.',{demo:true}),
 slide('simple','How it works, simply',white,[
  text('Your notes. A layout desk. A file to keep.',78,84,1450,95,64,ink,true),
  text('01',90,288,320,105,88,blue,true),text('Words',90,424,400,70,48,ink,true,100),text('Your ideas, stored\nas structured content.',90,531,430,125,35,ink,false,200),
  text('02',606,288,320,105,88,orange,true),text('Arrangement',606,424,440,70,48,ink,true,180),text('A layout places them.\nThe browser checks the fit.',606,531,450,125,35,ink,false,280),
  text('03',1120,288,320,105,88,purple,true),text('Takeaway',1120,424,390,70,48,ink,true,260),text('Editable text and shapes\nin your exported file.',1120,531,410,125,35,ink,false,360),
  text('If the words will not fit, the export stops and asks for a fix.',88,770,1420,60,30,muted,false,420)
 ],'Think of each idea as a paper note. DeckWeft is a tidy desk that tries four ways to arrange those notes. The browser checks whether the words fit. The exporter packs the chosen arrangement into a file you can keep editing. If the words do not fit, it asks for a fix.',25,'Point once to each step. “Structured content” simply means a labelled list.'),
 slide('evidence','One scene, editable outputs',ink,[
  text('One scene.\nEditable outputs.',78,156,1430,265,108,white,true),
  text('A scene is a map of text, shapes and positions.',88,477,1410,75,44,white,false,130),
  text('PowerPoint',90,650,450,70,45,'#72A8FF',true,240),text('HTML',623,650,430,70,45,'#72A8FF',true,300),text('SVG',1152,650,370,70,45,'#72A8FF',true,360),
  text('The current alpha also keeps local revisions and rejects stale saves.',88,788,1430,45,28,white,false,430)
 ],'The technical idea is one shared scene: a map of text, shapes and positions. The exporters read that map. Text stays editable in PowerPoint. Local revisions protect earlier work, and stale saves are rejected. Wider app checks are still open.',20,'For a technical audience, stress the shared scene and the stale-save boundary.'),
 slide('optional','Optional help, with review',white,[
  text('Extra help,\nwhen you choose it.',78,159,1450,260,104,ink,true),
  text('An opt-in bridge for your connected Dot.',88,498,1400,80,47,blue,true,140),
  text('Review the draft. Save a new copy.',88,617,1400,75,43,ink,false,230),
  text('Local bridge tested. Actual Dot host acceptance remains open.',88,791,1420,48,27,muted,false,320)
 ],'There is also an opt-in local bridge for a connected Dot. It returns a draft for review and saves a new copy. The local workflow is tested. The actual Dot host check is still open.',15,'If asked, explain host-reported model selection. Do not promise a measured quality gain.'),
 slide('thanks','Thanks',white,[
  text('Thanks',78,85,1440,180,148,ink,true,0),
  text('Keen to try your own outline?',88,284,1420,80,46,ink,false,140),
  text('DeckWeft',88,813,1250,45,28,ink,true,400)
 ],'Thanks for having a look. If you are keen, bring me one rough outline after the demos. We can try the local alpha together.',15,'Stop speaking by 3:00. Pause on the animated thanks page.',{dots:true})
]};
export const stageOutline=[
 {title:'Our build is ready',body:'A local slide workbench for first-time builders.',items:['Write an outline','Compare four layouts','Export editable slides']},
 {title:'How it works',body:'Words and arrangements live separately.',items:['Content holds the story','A scene records the placement','Exporters keep it editable']},
 {title:'Thanks',body:'Keen to try your own outline?',items:[]}
];
// Geometric shapes are reserved for native editable process/evidence diagrams.
export const technicalShape=shape;
