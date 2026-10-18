import type {Project,AudienceView,PresentationState,Preferences,JobState} from '../src/contracts/presentation.mjs';
import {speechTiming} from '../src/core/speech.mjs';
import {actions} from '../public/actions.js';
const prefs:Preferences={appearance:'dark',motion:'off'};
void prefs;void speechTiming('你好 world',{wpm:140,cpm:240});
// @ts-expect-error Invalid preference must not reach playback.
const invalid:Preferences={appearance:'midnight',motion:'always'};
// @ts-expect-error A completed job requires its verified artifact hash.
const job:JobState={status:'complete'};
// @ts-expect-error Ready sessions need an audience capability URL.
const session:PresentationState={status:'ready',id:'x',index:0};
declare const audience:AudienceView;
// @ts-expect-error Audience data must not expose speaker notes.
audience.slide.notes;
declare const project:Project;
// @ts-expect-error Persisted motion presets are constrained by the schema.
project.slides[0]!.motion.preset='zoom';
// @ts-expect-error Untyped provider/import input cannot be a validated Project.
const unchecked:Project={};
// @ts-expect-error Semantic action roles must remain inside the shared vocabulary.
actions.present!.role='mystery';
void invalid;void job;void session;void unchecked;
