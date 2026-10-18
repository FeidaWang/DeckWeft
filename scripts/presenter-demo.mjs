import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createProject} from '../src/core/model.mjs';
import {exportDeck} from '../src/render/export.mjs';
const english=[
 ['A clear story.\nA private script.','Keep the slide simple. Keep the explanation close.',[],
  'The audience sees a short claim, while the speaker keeps the explanation nearby. These are different jobs, and they deserve different surfaces.\n\nThis is the private rehearsal script. It stays on the presenter’s computer and is not sent to the audience window. The audience receives the measured slide, its position in the deck, and the selected motion preference.\n\nStart the script when you are ready. The highlight follows the estimated reading pace. You can pause, scroll back to a point, or change the sidebar width without leaving the current slide. The slide itself advances only when you choose Next.\n\nThe pace is an estimate rather than speech recognition. A deliberate pause belongs in the delivery. Use the reading options to tune English words per minute, or calibrate by reading this script aloud with the manual timer. No microphone is needed.\n\nWhen sharing, choose the audience window. Sharing the whole desktop can also reveal this script. That is a screen-sharing choice the webpage cannot make for you.'],
 ['One view for each job','The public slide and the private explanation stay separate.',['Audience: measured slide only','Presenter: script, timing and next slide'],
  'This slide separates the two responsibilities. The audience view contains the public scene. The presenter view contains the script and controls.\n\nThe two windows use different local origins. The audience cannot obtain an editor session or read projects through its server. Its read-only capability is limited to the current public presentation.\n\nRefresh the audience window to reconnect. If the presentation is ended, it clears the slide and asks for a new link.'],
 ['Set your pace.\nKeep your place.','A rehearsal loop that stays with the current slide.',['Start and pause the script','Resize, dock or adjust the font','Move to the next slide when ready'],
  'Start with a comfortable pace. Pause when a question comes up. If you scroll manually, automatic following pauses, so you can inspect an earlier sentence without the script pulling you away.\n\nUse Resume following when you are ready. Resizing the sidebar reflows the text while keeping the current text position. Chinese characters use a separately adjustable rate, rather than treating an entire sentence as one English word.\n\nReading time is separate from the entrance animation. A long explanation can take more than a minute even when the slide has a short transition.'],
 ['A calmer workspace','Appearance belongs to your environment, not the slide.',['Light, dark or follow the system','One shared motion policy','Audience exports omit private notes'],
  'Dark mode changes the workbench and presenter controls. It leaves the authored slide colors unchanged.\n\nReduce motion removes continuous movement. The script remains readable through manual scrolling and timed highlighting. No-animation mode also stops active animation loops, and the player respects the operating system’s reduced-motion preference.\n\nVisual exports omit private notes by default. Choose the explicit private-notes option only for a presenter copy. Project JSON is always a full private backup.']
];
const chinese=[
 ['清楚的画面\n私密的讲稿','幻灯片保持简洁，完整解释留在讲者身边。',[],
  '观众需要看到一个简洁的论点，讲者则需要完整的解释。这是两种不同的任务，应由两个独立的界面承担。\n\n这里是私密排练讲稿。讲稿保留在讲者端，不会发送到观众窗口。观众只接收经过排版测量的公开画面、页码与当前动效偏好。\n\n准备好后点击开始提词。高亮按照估算语速向前移动。你可以暂停、回看上一段、调整字号或侧栏宽度，不必离开当前幻灯片。只有点击下一页，幻灯片才会翻页。\n\n语速只是估算，并非语音识别。为了让观众理解，应当留出停顿。阅读设置提供中文字符每分钟和英文词每分钟两个独立速度，也可以用人工计时朗读本页来校准，全程不需要麦克风。\n\n共享时请选择观众窗口。共享整个桌面会把讲者界面也展示出去，网页无法替你隐藏桌面上的其他内容。'],
 ['不同任务\n不同界面','公开画面与私密解释分别传递。',['观众：仅接收实测幻灯片','讲者：讲稿、计时与下一页'],
  '这一页说明两种职责。观众界面只包含公开场景，讲者界面则保留解释和控制。\n\n两个窗口使用不同的本地来源。观众服务器没有编辑器会话或项目读取端点，其只读能力仅限当前演示。\n\n刷新观众窗口可以重新连接。结束演示后，观众画面会清空并提示打开新链接。'],
 ['按自己的节奏\n清楚地讲述','排练始终跟随当前幻灯片。',['开始和暂停提词','调整宽度、位置与字号','准备好后再手动翻页'],
  '先选择舒服的语速。有人提问时可以暂停。手动滚动讲稿会暂停自动跟随，方便回看前面的句子。\n\n准备继续时点击继续跟随。调整侧栏宽度后，文字重新换行，同时保留当前阅读位置。连续中文按照字符计算，不会被当成一个英文单词。\n\n讲稿时长与入场动画分开。一段完整解释可以超过一分钟，不受原有短动画字段限制。'],
 ['让工作区安静下来','环境偏好不改变幻灯片设计。',['浅色、深色或跟随系统','统一控制减弱动效','观众版默认不含私密备注'],
  '夜间模式改变工作区和讲者控件，幻灯片仍保持作者设定的配色。\n\n减弱动态效果会停止连续运动。讲稿仍然可以手动阅读，并按照估算语速高亮。关闭动画也会停止正在运行的动画循环，播放器始终尊重系统的减弱动态效果偏好。\n\n视觉导出默认不含私密讲者备注。确实需要讲者副本时，再勾选包含私密备注。项目 JSON 始终是完整的私密备份。']
];
export function presenterDemo(locale='en'){
 const rows=locale==='zh-CN'?chinese:english;
 const project=createProject({id:'presenter_demo_'+locale,title:locale==='zh-CN'?'清晰讲述，私密提词':'A private stage for a clear story',locale,theme:'signal',slides:rows.map(([title,body,items,notes],i)=>({id:'presenter_slide_'+i,role:i===0?'opening':i===3?'closing':i===2?'process':'context',content:{eyebrow:'DECKWEFT / PRESENTER',title,body,items},design:{layout:['spotlight','grid','timeline','editorial'][i]},motion:{preset:i%2?'fade':'rise',duration:6},notes}))});
 project.revision.createdAt=project.revision.updatedAt='2026-10-17T00:00:00.000Z';return project;
}
export async function buildPresenterDemo(){
 await mkdir('dist/presenter-demo',{recursive:true});
 for(const locale of ['en','zh-CN']){const project=presenterDemo(locale);await writeFile(`dist/presenter-demo/${locale}.deck.json`,JSON.stringify(project,null,2)+'\n');for(const format of ['html','pptx'])for(const includeNotes of [false,true]){const result=exportDeck(project,format,{includeNotes});await writeFile(`dist/presenter-demo/${locale}.${includeNotes?'presenter':'audience'}.${result.extension}`,result.body);}}
 console.log('Created English/Chinese presenter samples and distinct audience/presenter exports in dist/presenter-demo.');
}
if(process.argv[1]===fileURLToPath(import.meta.url))await buildPresenterDemo();
