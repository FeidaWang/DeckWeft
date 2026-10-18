/** Experimental contracts generated from the same closed schemas used at runtime. */
export type { Contract as PresentationDocument } from '../../dist/types/presentation-v3.mjs';
export type { Contract as DesignPlan } from '../../dist/types/design-plan.mjs';
export type { Contract as WebScene } from '../../dist/types/web-scene.mjs';

import type { Contract as Semantic } from '../../dist/types/presentation-v3.mjs';
import type { Contract as Plan } from '../../dist/types/design-plan.mjs';
import type { Contract as Envelope } from '../../dist/types/visual-project.mjs';
export type VisualProject = Omit<Envelope,'document'|'plan'> & {document:Semantic;plan:Plan};
export type { Contract as ThemePack } from '../../dist/types/theme-pack.mjs';
