// Visual Studio: the shared workbench shell with the visual deck kind (single entry step 3). Step 4 of the plan serves this
// page from / as well; until then /visual opens v3 decks and / opens classic ones, from one deck list.
import {mountShell} from '../shell.js';
import {visualAdapter} from '../kinds/visual.js';
mountShell(visualAdapter,document.querySelector('#root'));visualAdapter.open();
