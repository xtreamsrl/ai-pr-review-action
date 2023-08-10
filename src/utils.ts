import { warning } from '@actions/core';
import { SUPPORTED_ACTIONS, SUPPORTED_EVENTS } from './options';
import { GhContextWithPullRequest, GithubContext } from './octokit';

export function actionCanRun(context: GithubContext): context is GhContextWithPullRequest {
  if (!SUPPORTED_EVENTS.includes(context.eventName)) {
    warning(
      `Skipped: current event is ${context.eventName}, only support ${SUPPORTED_EVENTS} events`,
    );
    return false;
  }
  if (!context.payload.pull_request) {
    warning('Skipped: context.payload.pull_request is null');
    return false;
  }
  if (!SUPPORTED_ACTIONS.includes(context.payload.action ?? '')) {
    warning(
      `Skipped: current action is ${context.payload.action}, only support ${SUPPORTED_ACTIONS} actions`,
    );
    return false;
  }
  return true;
}

export function cliCanRun(): boolean {
  const res = !!process.env.OPENAI_API_KEY && !!process.env.GITHUB_TOKEN;
  console.log(`cliCanRun: ${res}`);
  return res;
}
