/** Pure navigation reference: no DOM mutation, audio, timers or network.
 * The production integration must reuse the current DeckWeft selection state.
 */
function ids(value) {
  if (!Array.isArray(value) || value.some(x => typeof x !== 'string' || !x.trim()) || new Set(value).size !== value.length) {
    throw new TypeError('Slide IDs must be unique nonempty strings.');
  }
  return value;
}
function integer(value, name) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${name} must be a safe integer.`);
}
export function reconcileSelection(slideIds, selectedId, previousIndex = 0) {
  ids(slideIds); integer(previousIndex, 'previousIndex');
  if (slideIds.length === 0) return {id:null,index:-1,count:0};
  const current = slideIds.indexOf(selectedId);
  const index = current >= 0 ? current : Math.max(0, Math.min(slideIds.length-1, previousIndex));
  return {id:slideIds[index],index,count:slideIds.length};
}
export function navigate(slideIds, selectedId, delta, previousIndex = 0) {
  integer(delta, 'delta');
  const state = reconcileSelection(slideIds, selectedId, previousIndex);
  if (state.count === 0) return state;
  const index = Math.max(0,Math.min(state.count-1,state.index+delta));
  return {id:slideIds[index],index,count:state.count};
}
export function keyDelta(key, {count, index, pageStep=10, composing=false, editable=false} = {}) {
  integer(count, 'count'); integer(index, 'index'); integer(pageStep, 'pageStep');
  if (count < 0 || pageStep < 1 || (count === 0 ? index !== -1 : index < 0 || index >= count)) {
    throw new RangeError('Invalid navigation state.');
  }
  if (composing || editable || count < 2) return null;
  return ({ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,Home:-index,End:count-1-index,PageUp:-pageStep,PageDown:pageStep})[key] ?? null;
}
/** Default-silent tick policy. Null previous time means no previous audible tick. */
export function shouldTick({enabled=false,unlocked=false,visible=true,presenting=false,changed=false,
  nowMs,lastTickMs=null,minIntervalMs=50}={}) {
  if (!Number.isFinite(nowMs) || nowMs < 0 || !Number.isFinite(minIntervalMs) || minIntervalMs < 0 ||
    (lastTickMs !== null && (!Number.isFinite(lastTickMs) || lastTickMs < 0))) throw new TypeError('Invalid monotonic clock values.');
  return enabled === true && unlocked === true && visible === true && presenting === false && changed === true &&
    (lastTickMs === null || nowMs-lastTickMs >= minIntervalMs);
}
