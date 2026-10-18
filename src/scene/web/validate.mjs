import {assertSceneInteractions} from '../../motion/cues.mjs';
import {assertAssetBrief} from '../../assets/brief.mjs';
import {contains} from '../../assets/crop.mjs';
import schema from '../../../schemas/web-scene.schema.json' with { type: 'json' };
import { validateSchema } from '../../core/schema.mjs';
import { validPath } from './path.mjs';
import { DeckError } from '../../core/errors.mjs';
export function assertWebScene(scene, document) {
  const result = validateSchema(scene, schema);
  const fail = message => { throw new DeckError('INVALID_WEB_SCENE', message, 422, result.errors); };
  if (!result.ok) fail('Use the closed WebScene component contract.');
  const blocks = new Map(document.blocks.map(b => [b.id,b])), ids = new Set(scene.regions.map(n => n.id));
  if (ids.size !== scene.regions.length || scene.readingOrder.length !== ids.size || scene.readingOrder.some(id => !ids.has(id))) fail('Reading order must contain every unique region exactly once.');
  if (!scene.regions.some(n => n.blockId === scene.focalBlockId)) fail('Focal block is missing.');
  if (scene.regions.some(n => !blocks.has(n.blockId) || n.component !== blocks.get(n.blockId).type)) fail('Components must match semantic blocks.');
  if(scene.graphics&&new Set(scene.graphics.map(g=>g.id)).size!==scene.graphics.length)fail('Graphic ids must be unique in a scene.');
  for(const g of scene.graphics||[])if(!validPath(g.path))fail('Use valid bounded SVG path commands.');
  for(const g of scene.graphics||[])if(g.fill==='gradient'&&!(scene.gradients||[]).some(d=>d.id===g.gradientId))fail('Gradient paint must reference a declared local gradient.');
  if(scene.gradients&&new Set(scene.gradients.map(g=>g.id)).size!==scene.gradients.length)fail('Gradient ids must be unique.');
  if(scene.groups?.some(g=>g.regionIds.some(id=>!ids.has(id))))fail('Groups must bind existing regions.');
  if(scene.variants?.some(v=>v.readingOrder.length!==ids.size||v.readingOrder.some(id=>!ids.has(id))))fail('Each breakpoint variant must retain every region.');
  for(const r of scene.regions)if(r.datasetId&&blocks.get(r.blockId)?.datasetId!==r.datasetId)fail('The chart dataset binding must match the semantic block.');
  for(const r of scene.regions)if(r.crop&&(r.component!=='image'||r.crop.blockId!==r.blockId||r.crop.x+r.crop.width>1.000001||r.crop.y+r.crop.height>1.000001))fail('A derived crop must stay inside its bound image.');
  for(const r of scene.regions)if(r.imageSlot){if(r.component!=='image'||r.imageSlot.blockId!==r.blockId)fail('Image slots must stay on their semantic image binding.');assertAssetBrief(r.imageSlot.brief,document);if(!contains(r.crop||{x:0,y:0,width:1,height:1},r.imageSlot.brief.safeRegion))fail('Derived crop cuts the protected region.');}
  assertSceneInteractions(document,{...scene,blockIds:scene.regions.map(r=>r.blockId),crops:scene.regions.filter(r=>r.crop).map(r=>r.crop),imageSlots:scene.regions.filter(r=>r.imageSlot).map(r=>r.imageSlot)});
  return scene;
}
