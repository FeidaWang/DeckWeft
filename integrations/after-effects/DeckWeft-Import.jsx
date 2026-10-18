/* DeckWeft — experimental editable After Effects import.
 * Derived in part from the supplied MIT-licensed importer; see NOTICE.md.
 * Only JSON data is accepted. This script never uses eval or downloads assets.
 */
(function () {
  var file=File.openDialog('Choose a DeckWeft .motion.json file','*.json');
  if(!file)return; // No undo group has begun, so cancellation closes nothing twice.
  var root=null,started=false,fileOpen=false,created=[],mediaFiles=[],mediaFolder=null,progress=null,cancelled=false,sourceMap=[],stamp=String(new Date().getTime());
  try {
    file.encoding='UTF-8';if(!file.open('r'))throw Error('Could not open the file.');
    fileOpen=true;var raw=file.read();file.close();fileOpen=false;if(raw.length>24000000)throw Error('Use a file smaller than 24 MB.');
    var spec=parseJSON(raw);validate(spec);
    var hasMedia=false;for(var si=0;si<spec.compositions.length;si++)for(var ni=0;ni<spec.compositions[si].nodes.length;ni++)if(spec.compositions[si].nodes[ni].type==='image')hasMedia=true;
    if(hasMedia){mediaFolder=Folder.selectDialog('Choose a local folder for individual imported PNG files');if(!mediaFolder)return;}
    if(typeof Window!=='undefined'){progress=new Window('palette','DeckWeft import');progress.add('statictext',undefined,'Importing editable layers…');var stop=progress.add('button',undefined,'Cancel');stop.onClick=function(){cancelled=true;};progress.show();}

    if(!app.project)app.newProject();
    app.beginUndoGroup('DeckWeft import');started=true;
    root=app.project.items.addFolder('DeckWeft — '+String(spec.title||'Presentation'));created.push(root);
    var comps=[],total=0;
    for(var i=0;i<spec.compositions.length;i++){
      checkCancel();var s=spec.compositions[i],comp=app.project.items.addComp('Slide '+(i+1),s.width,s.height,1,s.duration,spec.frameRate);
      created.push(comp);comp.parentFolder=root;var bg=comp.layers.addSolid(rgb(s.background),'Background',s.width,s.height,1,s.duration);created.push(bg.source);bg.source.parentFolder=root;
      for(var j=0;j<s.nodes.length;j++){checkCancel();var temporal=null;for(var ti=0;ti<(s.temporal||[]).length;ti++)if(s.temporal[ti].nodeId===s.nodes[j].id)temporal=s.temporal[ti];addNode(comp,s.nodes[j],s.motion,temporal,s.id);}
      var marker=new MarkerValue(s.notes||'DeckWeft slide '+(i+1));comp.markerProperty.setValueAtTime(0,marker);
      comps.push(comp);total+=s.duration;
    }
    var master=app.project.items.addComp('MASTER — '+String(spec.title||'Presentation'),comps[0].width,comps[0].height,1,total,spec.frameRate);
    created.push(master);master.parentFolder=root;var cursor=0;
    for(var k=0;k<comps.length;k++){var layer=master.layers.add(comps[k]);layer.startTime=cursor;layer.inPoint=cursor;layer.outPoint=cursor+comps[k].duration;cursor+=comps[k].duration;}
    checkCancel();master.comment=jsonStringify({format:'deckweft-ae-import-report',version:1,environment:app.version||'unknown',sourceMap:sourceMap,temporal:'Explicit per-node seconds; KeyframeEase influence 65',fallback:'3D and interaction use static shapes; PNG media are separate layers.'});master.openInViewer();alert('DeckWeft created '+comps.length+' editable compositions. Check fonts and text bounds before rendering. Import mapping is in the MASTER composition comment.');
  }catch(error){for(var ri=created.length-1;ri>=0;ri--){try{created[ri].remove();}catch(ignored){}}for(var fi=mediaFiles.length-1;fi>=0;fi--){try{mediaFiles[fi].remove();}catch(ignoredFile){}}alert('DeckWeft import stopped:\n'+error.toString());}
  finally{if(fileOpen)file.close();if(progress)progress.close();if(started)app.endUndoGroup();}
  function checkCancel(){if(progress)progress.update();if(cancelled)throw Error('Cancelled; only this import was rolled back.');}
  function rgb(hex){return[parseInt(hex.substr(1,2),16)/255,parseInt(hex.substr(3,2),16)/255,parseInt(hex.substr(5,2),16)/255];}
  function addNode(comp,n,preset,temporal,slideId){
    var layer;
    if(n.type==='text'){
      layer=comp.layers.addBoxText([n.w,n.h],n.lines.join('\r'));
      var prop=layer.property('Source Text'),doc=prop.value;
      doc.font=n.fontFamily==='Arial'?'ArialMT':n.fontFamily;doc.fontSize=n.fontSize;doc.fillColor=rgb(n.color);doc.applyFill=true;doc.applyStroke=false;doc.autoLeading=false;doc.leading=n.lineHeight;
      doc.justification=ParagraphJustification.LEFT_JUSTIFY;prop.setValue(doc);
      var rect=layer.sourceRectAtTime(0,false);layer.property('Transform').property('Anchor Point').setValue([rect.left,rect.top]);
    }else if(n.type==='image'){
      var bytes=decodePNG(n.resource.dataURL),mediaFile=new File(mediaFolder.fsName+'/deckweft-'+stamp+'-'+mediaFiles.length+'.png');if(mediaFile.exists)throw Error('Media filename already exists. Choose another folder.');
      mediaFile.encoding='BINARY';if(!mediaFile.open('w'))throw Error('Could not write local media.');mediaFiles.push(mediaFile);try{if(!mediaFile.write(bytes))throw Error('Could not write PNG.');}finally{mediaFile.close();}
      var footage=app.project.importFile(new ImportOptions(mediaFile));created.push(footage);footage.parentFolder=root;layer=comp.layers.add(footage);var fit=Math.min(n.w/footage.width,n.h/footage.height)*100;layer.property('Transform').property('Scale').setValue([fit,fit]);layer.property('Transform').property('Anchor Point').setValue([0,0]);
    }else{
      layer=comp.layers.addShape();var g=layer.property('Contents').addProperty('ADBE Vector Group').property('Contents');
      var shape=g.addProperty(n.type==='ellipse'?'ADBE Vector Shape - Ellipse':'ADBE Vector Shape - Rect');shape.property('Size').setValue([n.w,n.h]);shape.property('Position').setValue([n.w/2,n.h/2]);
      if(n.type==='rect')shape.property('Roundness').setValue(n.radius||0);
      g.addProperty('ADBE Vector Graphic - Fill').property('Color').setValue(rgb(n.fill));layer.property('Transform').property('Anchor Point').setValue([0,0]);
    }
    layer.name=(n.role||n.type)+' / '+n.id;layer.comment=jsonStringify({slideId:slideId,sourceId:n.id,type:n.type,alt:n.alt||'',requestedFont:n.fontFamily||'',actualFont:n.type==='text'?layer.property('Source Text').value.font:null});sourceMap.push({slideId:slideId,sourceId:n.id,layerIndex:layer.index,compositionId:comp.id,type:n.type});var t=layer.property('Transform'),px=n.x,py=n.y;if(n.type==='image'){px+=(n.w-footage.width*fit/100)/2;py+=(n.h-footage.height*fit/100)/2;}t.property('Position').setValue([px,py]);layer.inPoint=0;layer.outPoint=comp.duration;
    if(preset!=='none'&&n.type==='text'&&n.role!=='footer'&&n.role!=='source-note'){
      var delay=temporal?temporal.start:(n.role==='title'?0.08:0.20),end=temporal?temporal.end:delay+.44,opacity=t.property('Opacity');opacity.setValueAtTime(delay,0);opacity.setValueAtTime(end,100);ease(opacity);
      if(preset==='rise'){var position=t.property('Position');position.setValueAtTime(delay,[n.x,n.y+(temporal?temporal.rise:18)]);position.setValueAtTime(end,[n.x,n.y]);ease(position);}
    }
  }
  function ease(property){
    var spatial=property.propertyValueType===PropertyValueType.TwoD_SPATIAL||property.propertyValueType===PropertyValueType.ThreeD_SPATIAL;
    var count=spatial?1:(property.value instanceof Array?property.value.length:1),ins=[],outs=[];
    for(var i=0;i<count;i++){ins.push(new KeyframeEase(0,65));outs.push(new KeyframeEase(0,65));}
    for(var k=1;k<=property.numKeys;k++)property.setTemporalEaseAtKey(k,ins,outs);
  }
  function finite(n){return typeof n==='number'&&isFinite(n);}
  function validate(spec){
    if(!spec||spec.format!=='deckweft-motion'||spec.version!==1||!(spec.compositions instanceof Array)||spec.compositions.length<1||spec.compositions.length>100||spec.frameRate!==30)throw Error('Not a supported DeckWeft motion handoff.');
    var count=0,totalMedia=0;
    for(var i=0;i<spec.compositions.length;i++){
      var s=spec.compositions[i],nodeIds={};if(!finite(s.width)||!finite(s.height)||s.width<=0||s.height<=0||s.width>4096||s.height>4096||!finite(s.duration)||s.duration<2||s.duration>60||!/^(none|fade|rise)$/.test(s.motion)||!/^#[0-9a-f]{6}$/i.test(s.background)||!(s.nodes instanceof Array))throw Error('Invalid composition.');
      count+=s.nodes.length;if(count>10000)throw Error('Too many layers.');
      for(var j=0;j<s.nodes.length;j++){var n=s.nodes[j];if(typeof n.id!=='string'||!/^[-A-Za-z0-9_]{1,160}$/.test(n.id)||nodeIds[n.id])throw Error('Invalid or duplicate source id.');nodeIds[n.id]=true;if(!/^(text|rect|ellipse|image)$/.test(n.type)||!finite(n.x)||!finite(n.y)||!finite(n.w)||!finite(n.h)||n.w<=0||n.h<=0||n.w>4096||n.h>4096||(n.type!=='image'&&!/^#[0-9a-f]{6}$/i.test(n.color||n.fill)))throw Error('Invalid layer.');if(n.type==='text'&&(!(n.lines instanceof Array)||!finite(n.fontSize)||n.fontSize<1||n.fontSize>300||!finite(n.lineHeight)||n.lineHeight<=0||!stringArray(n.lines)||typeof n.fontFamily!=='string'))throw Error('Invalid text.');if(n.type==='image'){if(typeof n.alt!=='string'||!n.alt.length||!n.resource)throw Error('Missing media alternative.');totalMedia+=decodePNG(n.resource.dataURL).length;if(totalMedia>16000000)throw Error('Media exceeds 16 MB.');}if(n.type==='rect'&&n.radius!==undefined&&(!finite(n.radius)||n.radius<0))throw Error('Invalid radius.');}
      if(s.temporal!==undefined){if(!(s.temporal instanceof Array)||s.temporal.length>s.nodes.length)throw Error('Invalid temporal map.');var seen={};for(var ti=0;ti<s.temporal.length;ti++){var t=s.temporal[ti],exists=false;for(var tj=0;tj<s.nodes.length;tj++)if(s.nodes[tj].id===t.nodeId&&s.nodes[tj].type==='text')exists=true;if(!exists||seen[t.nodeId]||!finite(t.start)||!finite(t.end)||t.start<0||t.end<=t.start||t.end>s.duration||t.easing!=='ease-out-65'||!finite(t.rise)||(t.rise!==0&&t.rise!==18))throw Error('Invalid temporal node/timing/easing.');seen[t.nodeId]=true;}}
    }
  }
  function jsonStringify(value){
    if(value===null)return 'null';if(typeof value==='number'||typeof value==='boolean')return String(value);
    if(typeof value==='string')return '"'+value.replace(/["\\\u0000-\u001f]/g,function(c){var code=c.charCodeAt(0).toString(16);return '\\u'+('0000'+code).slice(-4);})+'"';
    var out=[],i;if(value instanceof Array){for(i=0;i<value.length;i++)out.push(jsonStringify(value[i]===undefined?null:value[i]));return '['+out.join(',')+']';}
    for(var key in value)if(Object.prototype.hasOwnProperty.call(value,key)&&value[key]!==undefined)out.push(jsonStringify(key)+':'+jsonStringify(value[key]));return '{'+out.join(',')+'}';
  }
  function stringArray(lines){for(var i=0;i<lines.length;i++)if(typeof lines[i]!=='string')return false;return true;}
  function decodePNG(url){
    if(typeof url!=='string'||url.length>5400000||!/^data:image\/png;base64,[A-Za-z0-9+\/]+={0,2}$/.test(url))throw Error('Use bounded embedded PNG media only.');
    var raw=url.split(',')[1],alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',bits=0,value=0,out='';
    for(var i=0;i<raw.length;i++){var c=raw.charAt(i);if(c==='=')break;value=(value<<6)|alphabet.indexOf(c);bits+=6;if(bits>=8){bits-=8;out+=String.fromCharCode((value>>bits)&255);}}
    var signature=[137,80,78,71,13,10,26,10];if(out.length<33)throw Error('Invalid PNG.');for(var j=0;j<8;j++)if(out.charCodeAt(j)!==signature[j])throw Error('Invalid PNG signature.');return out;
  }
  // Strict ES3-compatible JSON reader, including runtimes without JSON.parse.
  function parseJSON(text){
    var pos=0;
    function ws(){while(/\s/.test(text.charAt(pos))&&pos<text.length)pos++;}
    function string(){
      if(text.charAt(pos++)!=='"')throw Error('Expected a JSON string.');var out='';
      while(pos<text.length){var c=text.charAt(pos++);if(c==='"')return out;if(c==='\\'){var e=text.charAt(pos++),map={'"':'"','\\':'\\','/':'/','b':'\b','f':'\f','n':'\n','r':'\r','t':'\t'};if(e==='u'){var hex=text.substr(pos,4);if(!/^[0-9a-f]{4}$/i.test(hex))throw Error('Invalid unicode escape.');out+=String.fromCharCode(parseInt(hex,16));pos+=4;}else if(map.hasOwnProperty(e))out+=map[e];else throw Error('Invalid escape.');}else{if(c.charCodeAt(0)<32)throw Error('Invalid string character.');out+=c;}}
      throw Error('Unclosed string.');
    }
    function value(depth){
      if(depth>40)throw Error('JSON is too deeply nested.');ws();var c=text.charAt(pos),out,key;
      if(c==='"')return string();
      if(c==='{'||c==='['){var object=c==='{',end=object?'}':']';pos++;out=object?{}:[];ws();if(text.charAt(pos)===end){pos++;return out;}
        while(pos<text.length){ws();if(object){key=string();if(key==='__proto__'||key==='constructor'||key==='prototype')throw Error('Reserved object key.');ws();if(text.charAt(pos++)!==':')throw Error('Missing colon.');if(Object.prototype.hasOwnProperty.call(out,key))throw Error('Duplicate JSON key.');out[key]=value(depth+1);}else out.push(value(depth+1));ws();c=text.charAt(pos++);if(c===end)return out;if(c!==',')throw Error('Missing comma.');}throw Error('Unclosed object.');}
      var rest=text.substr(pos),number=/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(rest);
      if(number){pos+=number[0].length;var result=Number(number[0]);if(!isFinite(result))throw Error('Invalid number.');return result;}
      if(rest.substr(0,4)==='true'){pos+=4;return true;}if(rest.substr(0,5)==='false'){pos+=5;return false;}if(rest.substr(0,4)==='null'){pos+=4;return null;}
      throw Error('Unexpected JSON token.');
    }
    var result=value(0);ws();if(pos!==text.length)throw Error('Unexpected trailing data.');return result;
  }
})();
