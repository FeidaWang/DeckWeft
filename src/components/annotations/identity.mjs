import {createHash} from 'node:crypto';
/** Structured encoding avoids ambiguity between user ids that contain hyphens. */
export const objectAnchor=(sceneId,blockId,objectId='',seriesId='')=>'dw-object-'+createHash('sha256').update(JSON.stringify([sceneId,blockId,objectId,seriesId])).digest('hex').slice(0,32);
