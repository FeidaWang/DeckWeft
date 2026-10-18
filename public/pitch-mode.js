// A presentation view, not a project migration or translation.
export {projectIsEnglish} from '/shared/presentation.mjs';
export const pitchMode=new URLSearchParams(location.search).get('mode')==='pitch';
export function applyPitchMode(document){
 if(!pitchMode)return;
 document.documentElement.lang='en-AU';document.body.classList.add('pitch-mode');
 document.querySelector('#uiLanguage').hidden=true;
 document.querySelector('a.brand').href='/?mode=pitch';
 const locale=document.querySelector('#contentLocale');for(const option of [...locale.options])if(option.value!=='en')option.remove();
 locale.disabled=true;
}
