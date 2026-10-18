import {readFile} from 'node:fs/promises';
import {createCompositionDemo} from './composition-demo.mjs';
import {uploadImageBlob,registerVisualImport} from '../assets/import.mjs';
import {attachSlotAsset,slotFor,configureSlot,applySlotCrop} from '../assets/slots.mjs';
export async function createAssetDemo(locale,home,options={}){
 const p=await createCompositionDemo(locale,home,options),zh=locale==='zh-CN',t=(en,cn)=>zh?cn:en;
 const original=await uploadImageBlob(home,await readFile(new URL('../../public/assets/visual/subject.png',import.meta.url)),'image/png'),web=await uploadImageBlob(home,await readFile(new URL('../../public/assets/visual/subject.webp',import.meta.url)),'image/webp');
 const asset=await registerVisualImport(home,{original,native:original,web,origin:'original',metadata:{provenance:'Original code-drawn synthetic subject fixture. Not a documentary photo or historical product screenshot.',license:'MIT; original DeckWeft fixture',allowedUse:'Local demonstrations and tests',alt:t('Synthetic navy panel with a protected orange subject','带橙色受保护主体的合成深蓝面板'),fallback:t('A centered subject retained inside a marked region','主体保留在标记区域内')}});
 p.document.title=t('Keep the subject. Keep the source.','保全主体，保留来源。');
 p.document.blocks.find(b=>b.id==='violet-title').text=t('The subject stays\nin the story.','构图可以改变，\n主体始终保留。');
 p.document.blocks.find(b=>b.id==='violet-body').text=t('Mark the protected region. Compare portrait, square and wide crops. Original bytes and attribution remain local.','标记受保护区域，比较竖版、方形和宽幅裁切；原始字节与来源说明均保留在本地。');
 p.document.blocks.find(b=>b.id==='violet-caption').text=t('Original authored synthetic QA fixture / not documentary evidence','原创合成验证素材／并非纪实证据');
 let next=attachSlotAsset(p,'violet','violet-image',asset),slot=slotFor(next,'violet','violet-image');slot.id='subject-hero';slot.brief.safeRegion={x:.4,y:.25,width:.2,height:.4};slot.brief.focalPoint={x:.5,y:.45};next=configureSlot(next,'violet','violet-image',slot);return applySlotCrop(next,'violet','violet-image',{mode:'contain',aspect:16/9});
}
