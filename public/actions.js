// @ts-check
// One vocabulary for action roles and shape; icons remain the local Lucide assets.
/** @type {Record<string,{role:'generate'|'document'|'present'|'danger'|'neutral',shape:'square'|'label'|'pill'}>} */
export const actions={
 openStoryboard:{role:'generate',shape:'square'},openAgent:{role:'generate',shape:'square'},save:{role:'document',shape:'label'},present:{role:'present',shape:'label'},openExport:{role:'document',shape:'label'},
 deleteSlide:{role:'danger',shape:'square'},undo:{role:'neutral',shape:'square'},redo:{role:'neutral',shape:'square'},
 openSettings:{role:'neutral',shape:'pill'},toggleDirections:{role:'neutral',shape:'pill'}
};
/** @param {Document} document */
export function applyActions(document){for(const [id,action]of Object.entries(actions)){const button=document.getElementById(id);if(!button)continue;button.dataset.actionRole=action.role;button.dataset.actionShape=action.shape;}}
