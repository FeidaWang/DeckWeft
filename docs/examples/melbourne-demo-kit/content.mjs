// Original presentation content. AU English. No external runtime dependencies.
export const colours={ink:'#191B1A',paper:'#F3F0E7',orange:'#ED4B24',mint:'#76F4D5',muted:'#666B64'};
const {ink,paper,orange,mint,muted}=colours;
const t=(value,x,y,w,h,size=36,color=ink,bold=false)=>({value,x,y,w,h,size,color,bold,font:'Arial'});
const page=(id,title,background,texts,notes,extra={})=>({id,title,background,texts,notes,...extra});
export const eventSource='https://luma.com/jsqz7a56';
export const pitchSource='https://mlai.au/articles/featured/how-to-pitch-your-idea';
export const designSource='https://mlai.au/';
const local='Project evidence: README.md; docs/en/verification.md; src/core/model.mjs; src/layout/engine.mjs; src/render/export.mjs. Relative to the DeckWeft source repository.';
export const pitch={title:'DeckWeft — Melbourne demo',width:1600,height:900,mainCount:8,slides:[
 page('opening','DeckWeft',ink,[
  t('DECKWEFT',84,72,1000,40,24,mint,true),
  t('Your build.\nClearly told.',76,204,1430,320,130,paper,true),
  t('An editable pitch from your own notes.',88,615,1400,65,44,paper),
  t('DevDay Exchange Community: Melbourne',88,797,1250,32,23,paper)
 ],`00:00–00:15. SAY: You have built something worth showing. Then demo time arrives, and your slides are still blank. DeckWeft helps you explain what you have made.\n${local}\nEvent context: ${eventSource}. This is an independent participant presentation, not an official event template.`),
 page('problem','The last-mile problem',paper,[
  t('THE LAST-MILE PROBLEM',86,72,1300,40,24,orange,true),
  t('The demo works.\nThe story is still rough.',80,190,1420,245,96,ink,true),
  t('A newcomer has to explain the idea\nand make the slides readable.',88,507,1320,125,46),
  t('Our starting hypothesis: this deserves a simpler workflow.',88,748,1400,55,29,muted)
 ],`00:15–00:35. SAY: A newcomer needs to choose the words and work out where they fit. I am exploring a simpler way to do that. We have not measured time savings yet.\nThis is a product hypothesis, not a user study or market-size claim. Pitch guidance: ${pitchSource}.`),
 page('solution','Your words stay editable',mint,[
  t('THE WORKING ALPHA',86,72,1200,40,24,ink,true),
  t('Your words.\nFour ways to arrange them.',80,182,1440,250,94,ink,true),
  t('Compare layouts on your laptop.\nKeep editing in an exported PowerPoint file.',88,502,1390,130,43),
  t('Studio runs locally with Node.js 22+. No API key required.',88,762,1410,45,28)
 ],`00:35–00:55. SAY: DeckWeft takes a short outline and offers four layouts. Choose one, keep editing, then export editable slides. The Studio runs on your laptop with Node. It needs no API key.\n${local}\nAI drafting through a host agent is separate and can require that host's account and network. Cross-app font substitution remains possible.`),
 page('demo','One idea, four layouts',paper,[
  t('THE DEMO',84,72,1300,40,24,orange,true),
  t('One idea,\nfour layouts',80,187,520,210,83,ink,true),
  t('Edit a headline.\nChange the layout.\nSave the result.',88,464,510,180,39),
  t('Actual Studio screenshot. Live walkthrough uses the same local app.',88,799,1400,38,23,muted)
 ],`00:55–01:45. SWITCH to the prepared Studio tab. ACTIONS: open the prepared stage-demo project; change the first headline from “Our build is ready” to “Our build is ready to share”; click a different layout thumbnail; Save; use Export > PowerPoint only if the rehearsal proves it fits the slot.\nSAY: Here is a simple outline. I will change the headline, try another layout, then save it. The words stay separate from the layout. An exported PowerPoint keeps text editable.\nIf the app stalls for more than five seconds, return to this screenshot and say: “This screenshot shows the same Studio. I will explain the flow and share the local files afterwards.” Do not describe the screenshot as a live result.\nScreenshot source: DeckWeft local Studio, captured for this kit if assets/studio-demo.png is present; otherwise the repository's docs/assets/studio-desktop.png. ${local}`,
 {image:{file:'studio',x:626,y:193,w:888,h:555,alt:'Actual DeckWeft Studio with editable content and four layout choices.'}}),
 page('eli5','How it works, simply',ink,[
  t('HOW IT WORKS, SIMPLY',84,72,1300,40,24,mint,true),
  t('Paper notes. A tidy desk. A box to go.',80,173,1450,100,65,paper,true),
  t('01',98,338,300,80,67,mint,true),t('Your notes',98,440,380,60,42,paper,true),t('The words you\nwant to share.',98,527,390,110,35,paper),
  t('02',612,338,300,80,67,mint,true),t('The layout desk',612,440,410,60,42,paper,true),t('Four arrangements.\nA check for text fit.',612,527,420,110,35,paper),
  t('03',1127,338,300,80,67,mint,true),t('Your takeaway',1127,440,390,60,42,paper,true),t('Editable slides\nyou can keep.',1127,527,380,110,35,paper),
  t('If the words will not fit, DeckWeft asks you to fix the slide.',88,771,1430,50,29,paper)
 ],`01:45–02:10. SAY: Think of your words as paper notes. DeckWeft is a tidy desk that tries four arrangements. It checks the fit, then packs your choice into an editable file. If the words will not fit, it asks you to fix the slide.\nELI5 analogy: notes = structured content; desk = layout and fit checking; takeaway = exported objects. The browser measures text with Canvas. CLI fitting is an offline estimate. One derived scene drives each core exporter. ${local}`),
 page('proof','What the alpha does today',paper,[
  t('WHAT THE ALPHA DOES TODAY',84,72,1340,40,24,orange,true),
  t('A working local loop',80,185,1430,110,86,ink,true),
  t('4',88,372,330,175,145,orange,true),t('layout choices',92,565,400,65,36),
  t('0',614,372,330,175,145,orange,true),t('runtime packages to install',618,565,440,110,34),
  t('Editable',1092,407,440,100,68,ink,true),t('PowerPoint text\nand shapes',1097,565,410,110,34),
  t('Alpha 0.1.0-alpha.2. Wider host and application checks remain open.',88,774,1430,45,27,muted)
 ],`02:10–02:30. SAY: This alpha has four layout choices, no external runtime packages to install, and editable PowerPoint text and shapes. Local checks have passed. Wider host and presentation-app checks still need work.\nFour = LAYOUTS in src/core/model.mjs. Zero = no dependencies in package.json. Node.js 22+ is still required. Export implementation: src/render/pptx.mjs. Existing test and host evidence: docs/en/verification.md. Do not turn automated test counts into user benefit or production certification. ${local}`),
 page('next','The next useful test',orange,[
  t('THE NEXT USEFUL TEST',84,72,1300,40,24,ink,true),
  t('Can a first-time builder\nmake a clear pitch?',80,198,1440,240,94,ink,true),
  t('Proposed next test: five willing builders.\nOne rough outline each. Observe where they get stuck.',88,517,1400,125,41),
  t('We have not run this study yet.',88,773,1400,45,29)
 ],`02:30–02:45. SAY: Next, I want five willing builders to try one rough outline each. Can they make a clear pitch? Where do they get stuck? That study has not run yet.\nThis is a proposed validation plan, not traction. Capture completion, confusion and repeat-use intent without inventing savings or collecting private content.`),
 page('close','A pitch for your next build',ink,[
  t('DECKWEFT',84,72,1300,40,24,mint,true),
  t('A pitch for\nyour next build.',80,193,1440,290,114,paper,true),
  t('Keen to try it with your own outline?',88,588,1400,80,54,mint,true),
  t('Find me after the demos. We can try the local alpha together.',88,753,1430,70,32,paper)
 ],`02:45–03:00. SAY: DeckWeft helps you explain your next build. If you are keen, bring me one rough outline after the demos. We can try the local alpha together.\nFinish here. The next slides are optional Q&A. No public URL, signup, testimonial, commercial traction or event endorsement is implied. The user reports a Dot-themed water bottle prize. No public judging rubric or winner-selection process has been verified. Do not present a prize as guaranteed.`),
 page('architecture','The technical version',paper,[
  t('Q&A / TECHNICAL VERSION',84,72,1340,40,24,orange,true),
  t('One scene, several exports',80,180,1450,100,80,ink,true),
  t('Project JSON',104,356,390,60,40,ink,true),t('A checked list of words\nand slide settings.',104,441,390,130,32),
  t('Layout + scene',609,356,430,60,40,ink,true),t('Positions, sizes and text.\nBrowser checks the fit.',609,441,430,130,32),
  t('Exporters',1120,356,385,60,40,ink,true),t('PPTX, HTML and SVG\nread the same scene.',1120,441,385,130,32),
  t('Local storage keeps revisions. The server listens on loopback only.',88,754,1420,60,30,muted)
 ],`Optional Q&A. JSON means a labelled list the program can read. Schema validation rejects invalid current projects. Layout ranking uses explainable rules, not an AI quality judge. Browser Canvas measures real text runs; CLI estimates offline. Scene nodes retain editable geometry. Exporters consume derived scenes rather than full-slide screenshots. ProjectStore keeps revisions and rejects stale saves. The server binds loopback. ${local}`,
 {diagram:true}),
 page('ai','Where Codex fits',mint,[
  t('Q&A / THE AI BOUNDARY',84,72,1300,40,24,ink,true),
  t('Codex can draft.\nYou keep the decision.',80,185,1440,245,100,ink,true),
  t('The host agent can help write an outline.\nDeckWeft checks, arranges and exports it locally.',88,516,1400,130,42),
  t('Verified project evidence includes a Codex CLI skill run.\nStudio has no bundled model. Host access is separate.',88,750,1430,95,28)
 ],`Optional Q&A. AI contribution is optional outline drafting through the installed host skill. A real authenticated Codex CLI task was recorded and reviewed on 2026-10-17; see docs/evidence/dw-020/review.json. The host can need an account and network, and its data handling is separate from the local Studio. Claude sign-in was deferred. Codex native desktop activation and remote CI remain untested. We have not invoked a paid model or changed host permissions to make this kit. Do not claim the layout engine itself is generative AI. ${local}`),
 page('limits','What is still open',paper,[
  t('Q&A / CURRENT LIMITS',84,72,1300,40,24,orange,true),
  t('Useful now. More to verify.',80,182,1430,110,80,ink,true),
  t('Current scope',88,365,600,55,38,ink,true),t('Local editing and revision history.\nEditable exports. Four layout families.',88,449,670,155,35),
  t('Open work',846,365,650,55,38,ink,true),t('Wider app and accessibility checks.\nMore slide families. Real user trials.',846,449,670,155,35),
  t('Figma and After Effects handoffs remain experimental.',88,761,1430,60,30,muted)
 ],`Optional Q&A. Native chart editing, arbitrary PowerPoint import, automatic research, image generation, realtime collaboration and video rendering are not shipped. Figma/AE handoff generation and mocked tests are not verified application integrations. The schema currently supports preset themes and four layouts. The bespoke visual style in this kit is a separately authored example, not a new Studio theme capability. ${local}`)
]};

// The reusable template uses the same eight compositions and keeps all prompts editable.
const templateCopy=[
 ['[Project name]',['[PROJECT NAME]','[Your build.]\n[One clear outcome.]','[What it does, in one plain sentence.]','[Your name / team]    Melbourne demo'],
  '00:00–00:15. Name the intended user and the task. Replace every bracketed field. Keep the opening under 30 words.'],
 ['[The user problem]',['THE USER PROBLEM','[A specific person.]\n[A task that is hard.]','[What happens today?]\n[Why does that matter?]','[Say whether this comes from observation or is still a hypothesis.]'],
  '00:15–00:35. Describe one real situation. Identify your evidence and its limits. Do not invent customer quotes, research or market figures.'],
 ['[Your working solution]',['THE WORKING SOLUTION','[What you built.]\n[What the user can do.]','[The smallest useful workflow.]\n[What remains under human control.]','[Prototype / alpha / live product. State the setup needed.]'],
  '00:35–00:55. Show current behaviour. Label planned features separately. Say what the user supplies and what they receive.'],
 ['[Live demonstration]',['THE DEMO','[One task.]\n[One result.]','[Show the input.]\n[Do one action.]\n[Show the output.]','[Replace with a real screenshot. Label a mockup as a mockup.]'],
  '00:55–01:45. Replace the screenshot space with your own permission-cleared screenshot. Rehearse a 50-second input/action/output walkthrough. Keep a local screenshot fallback and switch to it after five seconds of trouble.'],
 ['[How it works]',['HOW IT WORKS, SIMPLY','[A familiar comparison for your technology.]','01','[The input]','[What the user\nputs in.]','02','[The useful step]','[What the system\ndoes with it.]','03','[The output]','[What the user\ncan use.]','[Explain one limit or human check in plain language.]'],
  '01:45–02:10. Explain the workflow to someone who has never coded. Define any necessary technical word with an ordinary comparison.'],
 ['[Evidence today]',['EVIDENCE TODAY','[What you can support]','[N]','[Measured item]','[N]','[Measured item]','[Result]','[Observed\nbehaviour]','[Source, sample size and test conditions. Use “unknown” when needed.]'],
  '02:10–02:30. Replace all sample fields with supported evidence. If you have no metrics, use a specific observed behaviour and its test conditions. Never imply placeholder values are real.'],
 ['[Next useful test]',['THE NEXT USEFUL TEST','[The key uncertainty.]\n[How you will test it.]','[Who will try it and what task will they do?]\n[What result would change your next decision?]','[State clearly when this is a proposed test.]'],
  '02:30–02:45. Name the next uncertainty and a small test. A plan is not traction. Add an actual team role here if it is relevant and accurate.'],
 ['[Specific invitation]',['[PROJECT NAME]','[The useful outcome.]\n[Who it helps.]','[One clear request to the audience.]','[Your verified contact or an invitation to speak after the demos.]'],
  '02:45–03:00. Make one practical invitation. End on time. Remove these prompts before presenting. Check the actual organiser time limit and submission rules.']
];
export const template={...pitch,title:'Melbourne builder demo template',mainCount:8,slides:pitch.slides.slice(0,8).map((s,i)=>({...s,id:`template_${i+1}`,title:templateCopy[i][0],texts:s.texts.map((v,n)=>({...v,value:templateCopy[i][1][n],size:i===0&&n===1?104:i===5&&n===6?62:v.size})),image:undefined,diagram:undefined,notes:templateCopy[i][2]+`\nOriginal independent template inspired by MLAI colour and typographic cues: ${designSource}. General pitch guidance: ${pitchSource}. This is not an official MLAI or OpenAI template, judging rubric or promise of an award.`}))};
// Reserve actual screenshot space in the editable template, with no fake product UI.
template.slides[3].texts.push(t('[Your real demo screenshot]',672,372,790,100,42,muted,true),t('Keep the output large enough to read.',672,496,790,70,30,muted));

export const stageSlides=[
 {title:'Our build is ready',body:'A local slide studio for first-time builders.',items:['Write an outline','Compare four layouts','Export editable slides']},
 {title:'How DeckWeft works',body:'Your words stay separate from their arrangement.',items:['Notes hold the story','Layouts arrange the words','Exports keep text editable']},
 {title:'Keen to try it?',body:'Bring one rough outline after the demos.',items:[]}
];
