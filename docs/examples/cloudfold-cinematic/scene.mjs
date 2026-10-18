// A separate authored example, not a new DeckWeft project-schema capability.
const text=(id,value,x,y,w,h,size,color,font='Arial',bold=false,delay=0)=>({id,value,x,y,w,h,size,color,font,bold,delay});
const ink='#142C34',paper='#FFF4E5',cream='#F6F0E6',coral='#B84C2D';
export const deck={
  title:'Cloudfold Club',width:1600,height:900,
  source:'dist/skill-example-1792192957825/codex-host-result.deck.json',
  slides:[
    {id:'welcome',background:ink,art:'hero.png',alt:'An ivory and coral origami airplane flying above sculptural paper clouds.',
      title:'Welcome to Cloudfold Club',texts:[
        text('label','CLOUDFOLD CLUB',86,82,550,35,19,paper,'Arial',true,60),
        text('title-one','Cloudfold',80,207,690,162,134,paper,'Georgia',false,160),
        text('title-two','Club',80,352,650,162,134,paper,'Georgia',false,280),
        text('body-one','A paper-airplane club',88,557,600,48,30,paper,'Arial',false,440),
        text('body-two','for curious makers.',88,600,600,48,30,paper,'Arial',false,500),
        text('values-one','Fold with care. Fly with imagination.',88,765,660,38,23,paper,'Arial',false,700),
        text('values-two','Every beginner belongs.',88,804,600,38,23,paper,'Arial',false,780)
      ]},
    {id:'ritual',background:cream,art:'process.png',alt:'A coral sheet, a partly folded plane, and a completed paper plane in sequence.',artFrame:{x:0,y:220,w:1600,h:533.333},
      title:'Our club ritual',texts:[
        text('title','Our club ritual',84,59,1300,115,82,ink,'Georgia',false,80),
        text('body','A blank sheet becomes a shared adventure.',88,174,1300,47,28,'#4F625F','Arial',false,220),
        text('step-one','01   Imagine',94,692,410,49,31,coral,'Arial',true,500),
        text('step-one-detail-a','Dream up a plane.',94,751,420,35,24,ink,'Arial',false,590),
        text('step-one-detail-b','Give it a name.',94,788,420,35,24,ink,'Arial',false,630),
        text('step-two','02   Fold',622,692,420,49,31,coral,'Arial',true,660),
        text('step-two-detail-a','Explore the creases.',622,751,420,35,24,ink,'Arial',false,750),
        text('step-two-detail-b','Make it your own.',622,788,420,35,24,ink,'Arial',false,790),
        text('step-three','03   Launch',1150,692,400,49,31,coral,'Arial',true,820),
        text('step-three-detail-a','Take turns launching.',1150,751,400,35,24,ink,'Arial',false,910),
        text('step-three-detail-b','See what flies.',1150,788,400,35,24,ink,'Arial',false,950)
      ]},
    {id:'invitation',background:'#E87856',art:'closing.png',alt:'Origami airplanes flying through an open sculptural paper ribbon against a coral sky.',
      title:'Come fold a story',texts:[
        text('label','CLOUDFOLD CLUB',86,82,550,35,19,ink,'Arial',true,60),
        text('title-one','Come fold',80,207,690,140,108,ink,'Georgia',false,160),
        text('title-two','a story',80,334,650,150,118,ink,'Georgia',false,280),
        text('body-one','Bring a sheet of paper',88,551,620,48,30,ink,'Arial',false,440),
        text('body-two','and an idea.',88,595,600,48,30,ink,'Arial',false,500),
        text('values-one','Encourage a fellow pilot.',88,764,650,38,23,ink,'Arial',false,700),
        text('values-two','Try a new fold. Share a flight.',88,803,650,38,23,ink,'Arial',false,780)
      ]}
  ]
};
