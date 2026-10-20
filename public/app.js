// The classic workbench: the shared shell (shell.js) with the classic deck kind (kinds/classic.js).
import {mountShell} from './shell.js';
import {classicAdapter} from './kinds/classic.js';
// Mount the shell first: the kind wires its controls into the shell's markup, then opens the library.
function boot(){mountShell(classicAdapter,document.querySelector('#root'));return classicAdapter.open();}
boot();
