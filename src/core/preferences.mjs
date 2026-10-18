// @ts-check
/** @typedef {import('../contracts/presentation.mjs').Preferences} Preferences */
/** @type {Readonly<Preferences>} */
export const defaultPreferences=Object.freeze({appearance:'system',motion:'system'});
/** Validate local environment settings, never a project's authored theme/motion.
 * @param {unknown} value
 * @returns {Preferences}
 */
export function parsePreferences(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid preferences.');
 const v=/** @type {Record<string,unknown>} */(value);
 const {appearance,motion}=v;
 if(Object.keys(v).some(k=>!['appearance','motion'].includes(k))||(appearance!=='system'&&appearance!=='light'&&appearance!=='dark')||(motion!=='system'&&motion!=='full'&&motion!=='reduced'&&motion!=='off'))throw new TypeError('Invalid preferences.');
 return {appearance,motion};
}
/** @param {Preferences} preferences @param {{dark:boolean,reduced:boolean}} system */
export function effectivePreferences(preferences,system){
 return {appearance:preferences.appearance==='system'?(system.dark?'dark':'light'):preferences.appearance,
  motion:preferences.motion==='off'?'off':system.reduced||preferences.motion==='reduced'?'reduced':'full'};
}
