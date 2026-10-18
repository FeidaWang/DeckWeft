import { buildPlugin } from '../src/plugin/packager.mjs';
console.log(JSON.stringify(await buildPlugin(),null,2));
