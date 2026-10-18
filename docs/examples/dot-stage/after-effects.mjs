export function aeScript(deck,dots){return `/* DeckWeft stage animation. Run in After Effects via File > Scripts > Run Script File.
Creates a new folder and native editable text layers. Does not save over an open project.
Actual AE execution remains unverified when AE is unavailable. */
(function(){
 var source=${JSON.stringify(deck)},dots=${JSON.stringify(dots)},base=File($.fileName).parent,owned=[];
 if(!app.project)app.newProject();app.beginUndoGroup('DeckWeft stage animation');
 try{
  var folder=app.project.items.addFolder('DeckWeft Stage '+new Date().getTime()),master=app.project.items.addComp('DeckWeft / MASTER',1600,900,1,180,30);master.parentFolder=folder;
  function colour(hex){return [parseInt(hex.substr(1,2),16)/255,parseInt(hex.substr(3,2),16)/255,parseInt(hex.substr(5,2),16)/255];}
  function footage(name){var file=File(base.fsName+'/assets/'+name);if(!file.exists)throw Error('Missing asset: '+name);var f=app.project.importFile(new ImportOptions(file));f.parentFolder=folder;return f;}
  var studio=footage('studio.png'),dotImages={};for(var di=0;di<dots.length;di++)dotImages[dots[di].name]=footage('dot-'+dots[di].name.toLowerCase()+'.png');
  var offset=0;
  for(var i=0;i<source.slides.length;i++){
   var s=source.slides[i],comp=app.project.items.addComp(('0'+(i+1)).slice(-2)+' / '+s.title,1600,900,1,s.seconds,30);comp.parentFolder=folder;comp.bgColor=colour(s.background);comp.layers.addSolid(colour(s.background),'Background',1600,900,1,s.seconds);
   for(var j=0;j<s.nodes.length;j++){
    var n=s.nodes[j];if(n.kind==='text'){
     var layer=comp.layers.addText(n.value),doc=layer.property('Source Text').value;doc.font=n.bold?'Arial-BoldMT':'ArialMT';doc.fontSize=n.size;doc.fillColor=colour(n.color);doc.applyFill=true;doc.applyStroke=false;doc.autoLeading=false;doc.leading=n.size*1.15;layer.property('Source Text').setValue(doc);
     var bounds=layer.sourceRectAtTime(0,false);layer.property('Anchor Point').setValue([bounds.left,bounds.top]);var delay=(n.delay||0)/1000;layer.property('Position').setValueAtTime(delay,[n.x,n.y+24]);layer.property('Position').setValueAtTime(delay+.55,[n.x,n.y]);layer.property('Opacity').setValueAtTime(delay,0);layer.property('Opacity').setValueAtTime(delay+.4,100);
     layer.name=n.value.split('\\n')[0];
    }else if(n.kind==='image'){
     var shot=comp.layers.add(studio),scale=Math.min(n.w/studio.width,n.h/studio.height)*100;shot.property('Scale').setValue([scale,scale]);shot.property('Position').setValue([n.x+n.w/2,n.y+n.h/2]);
    }
   }
   if(s.dots)for(var d=0;d<dots.length;d++){
    var dot=dots[d],f=dotImages[dot.name],l=comp.layers.add(f),v=dot.s/f.width*100,t=dot.delay/1000,x=dot.x+dot.s/2,y=dot.y+dot.s/2;
    l.name=dot.name+' Dot';l.property('Position').setValueAtTime(t,[x,y+150]);l.property('Position').setValueAtTime(t+.55,[x,y-18]);l.property('Position').setValueAtTime(t+.9,[x,y]);l.property('Scale').setValueAtTime(t,[v*.75,v*.75]);l.property('Scale').setValueAtTime(t+.55,[v*1.04,v*1.04]);l.property('Scale').setValueAtTime(t+.9,[v,v]);l.property('Opacity').setValueAtTime(t,0);l.property('Opacity').setValueAtTime(t+.3,100);
    l.property('Rotation').setValueAtTime(t,dot.turn);l.property('Rotation').setValueAtTime(t+.9,0);
   }
   if(comp.markerProperty)comp.markerProperty.setValueAtTime(0,new MarkerValue(s.speech));var segment=master.layers.add(comp);segment.startTime=offset;offset+=s.seconds;
  }
  master.openInViewer();alert('DeckWeft comps created. Check fonts and text bounds, then save a new AEP file. The live Studio walkthrough remains a separate demonstration.');
 }catch(e){alert('DeckWeft stopped: '+e.message+'. Undo the DeckWeft import to remove only this run.');}
 finally{app.endUndoGroup();}
})();\n`;}
