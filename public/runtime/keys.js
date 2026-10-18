/**
 * Whether a key press may turn the presentation page. Page keys never apply while a control, link, editable field, slider, tab or
 * focusable chart mark (SVG elements with tabindex) has focus, so a parameter change can never navigate. Element.closest matches
 * HTML and SVG elements alike; the old tag-name pattern missed lowercase SVG tags and matched any tag containing "A".
 */
export function turnsPage(e){
 if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.isComposing)return false;
 const target=e.target?.nodeType===1?e.target:e.target?.parentElement;
 return !target?.closest('input,textarea,select,button,summary,a,area,iframe,audio,video,[contenteditable]:not([contenteditable="false"]),[tabindex],[role="slider"],[role="spinbutton"],[role="tab"],[role="tablist"],[role="listbox"],[role="radiogroup"],[role="menu"],[role="grid"]');
}
