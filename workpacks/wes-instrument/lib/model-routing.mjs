/** Advisory records only: no provider calls, subprocesses or host-setting changes. */
import {safeRelativePath} from './validation.mjs';
export const EFFORTS = Object.freeze(['low', 'medium', 'high', 'xhigh']);
export const EFFORT_LABELS = Object.freeze({low:'Low',medium:'Medium',high:'High',xhigh:'Extra High'});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const index = value => EFFORTS.indexOf(value);

/** Validate the shipped policy, not runtime authorisation or factual model availability. */
export function validateModelRouting(policy, queue) {
  const errors = [];
  const counts = {low:0,medium:0,high:0,xhigh:0};
  if (!object(policy) || policy.schemaVersion !== 1 || policy.kind !== 'advisory-only')
    return {errors:['Invalid advisory model policy.'], count:0, buildEffortCounts:counts};
  for (const field of ['automaticModelInvocation','automaticModelSwitch','automaticEffortChange',
    'paidApiFallbackAllowed','parallelAgentsAllowed','permissionToSpendGrantedByThisFile',
    'xhighDefaultAllowed','maxOrUltraDefaultAllowed']) {
    if (policy[field] !== false) errors.push(`Policy ${field} must be false.`);
  }
  if (policy.defaultEffort !== 'medium') errors.push('The shipped default effort must be medium.');
  if (JSON.stringify(policy.allowedEfforts) !== JSON.stringify(EFFORTS)) errors.push('Invalid allowed effort set.');
  if (!Array.isArray(policy.protectedUsage) || !policy.protectedUsage.length) errors.push('Protected usage rules are missing.');
  if (!object(policy.escalationPolicy) || policy.escalationPolicy.automatic !== false ||
      policy.escalationPolicy.maxTargetedRepairAttemptsBeforeCheckpoint !== 2 ||
      !Array.isArray(policy.escalationPolicy.requires) || policy.escalationPolicy.requires.length < 4 ||
      !Array.isArray(policy.escalationPolicy.nonTriggers) || policy.escalationPolicy.nonTriggers.length < 3 ||
      !nonempty(policy.escalationPolicy.ifUnsupported)) errors.push('Invalid bounded escalation policy.');
  if (!object(policy.reviewPolicy) || policy.reviewPolicy.mode !== 'same-approved-model-separate-pass' ||
      policy.reviewPolicy.automaticExtraSession !== false || policy.reviewPolicy.requiresEvidence !== true ||
      policy.reviewPolicy.independentReviewClaimAllowed !== false) errors.push('Invalid review policy.');
  const profiles = new Map();
  if (!Array.isArray(policy.profiles) || !policy.profiles.length) errors.push('No model profiles.');
  for (const profile of Array.isArray(policy.profiles) ? policy.profiles : []) {
    if (!object(profile) || !nonempty(profile.id)) { errors.push('Invalid model profile.'); continue; }
    if (profiles.has(profile.id)) errors.push(`Duplicate model profile ${profile.id}.`);
    profiles.set(profile.id, profile);
    if (profile.modelFamily !== 'Sol') errors.push(`${profile.id}: protected or unapproved model family.`);
    if (profile.actualModelId !== null || profile.hostBindingVerified !== false)
      errors.push(`${profile.id}: shipped host binding must remain unverified.`);
    if (profile.automaticSubstitution !== false) errors.push(`${profile.id}: automatic substitution is forbidden.`);
    for (const field of ['recommendedModelLabel','candidateModelId','bindingRule'])
      if (!nonempty(profile[field])) errors.push(`${profile.id}: missing ${field}.`);
    if (!Array.isArray(profile.sourceIds) || !profile.sourceIds.length) errors.push(`${profile.id}: missing source IDs.`);
  }
  if (!object(queue) || !Array.isArray(queue.tasks) || !queue.tasks.length)
    return {errors:[...errors,'Missing task queue.'], count:0, buildEffortCounts:counts};
  if (queue.modelPolicyFile !== 'MODEL_POLICY.json') errors.push('Task queue must reference MODEL_POLICY.json.');
  const seen = new Set();
  for (const task of queue.tasks) {
    if (!object(task) || !/^DWI-\d{3}$/.test(task.id ?? '')) { errors.push('Invalid routing task ID.'); continue; }
    if (seen.has(task.id)) errors.push(`${task.id}: duplicate routing task.`);
    seen.add(task.id);
    const route = task.modelRouting;
    if (!object(route)) { errors.push(`${task.id}: missing modelRouting.`); continue; }
    if (!profiles.has(route.profileId)) errors.push(`${task.id}: unknown model profile.`);
    for (const field of ['buildEffort','reviewEffort','escalationEffort'])
      if (!EFFORTS.includes(route[field])) errors.push(`${task.id}: invalid ${field}.`);
    if (!['low','medium','high'].includes(route.buildEffort)) errors.push(`${task.id}: default xhigh/max/ultra is not permitted.`);
    if (EFFORTS.includes(route.buildEffort)) counts[route.buildEffort]++;
    if (index(route.reviewEffort) < index(route.buildEffort)) errors.push(`${task.id}: review is below build effort.`);
    if (index(route.escalationEffort) < index(route.buildEffort)) errors.push(`${task.id}: escalation ceiling is below build effort.`);
    if (route.automaticModelSwitch !== false || route.automaticEffortChange !== false)
      errors.push(`${task.id}: automatic switching or escalation is forbidden.`);
    if (route.maxTargetedRepairAttemptsBeforeCheckpoint !== 2) errors.push(`${task.id}: repair attempts must be bounded at two.`);
    if (route.reviewMode !== 'same-approved-model-separate-pass') errors.push(`${task.id}: automatic or independent review is not permitted.`);
    for (const field of ['reason','escalationTrigger'])
      if (!nonempty(route[field])) errors.push(`${task.id}: missing ${field}.`);
    if (!safeRelativePath(route.taskPrompt) || route.taskPrompt !== `prompts/tasks/${task.id}.md`)
      errors.push(`${task.id}: invalid task prompt path.`);
  }
  return {errors, count:seen.size, buildEffortCounts:counts};
}

/** Return a route without executing or changing any model. */
export function taskProfile(policy, queue, taskId) {
  if (typeof taskId !== 'string' || !/^DWI-\d{3}$/.test(taskId)) throw new TypeError('Expected a task ID such as DWI-034.');
  const result = validateModelRouting(policy, queue);
  if (result.errors.length) throw new Error(`Invalid model routing: ${result.errors.join(' ')}`);
  const task = queue.tasks.find(t => t.id === taskId);
  if (!task) throw new RangeError(`Unknown task: ${taskId}`);
  const profile = policy.profiles.find(p => p.id === task.modelRouting.profileId);
  return structuredClone({
    taskId, title:task.title, phase:task.phase, taskState:task.status,
    kind:'recommendation-only', profile, ...task.modelRouting,
    actualModelId:null, actualEffort:null, hostSettingsVerified:false,
    modelInvocationPerformed:false, hostSettingsChanged:false,
    automaticEscalation:false, permissionToSpendGranted:false,
    requiredAction:'The user must select or approve the actual supported model/effort in Codex. This output does not launch it.'
  });
}
