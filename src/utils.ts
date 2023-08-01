import { warning } from '@actions/core';
import { SUPPORTED_ACTIONS, SUPPORTED_EVENTS, SUPPORTED_FILE_EXTENSIONS } from './options';
import type { context as GIT_HUB_CONTEXT } from '@actions/github';
import path from 'node:path';

type GithubContext = typeof GIT_HUB_CONTEXT;
export type ContextWithPullRequest = Omit<GithubContext, 'payload'> & { payload: Required<GithubContext['payload']>}

export function canRun(context: GithubContext): context is ContextWithPullRequest {
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

/**
 * Filter out:
 * - files that we don't support
 * - files that are not added or modified
 * - files that have no patch
 * @param changedFiles
 */
export function filterAcceptedFiles<T extends {filename: string, status: string, patch?: string }>(changedFiles: T[]): (Omit<T, 'patch'> & { patch: string })[] {
  return changedFiles.filter(
    f => SUPPORTED_FILE_EXTENSIONS.includes(path.extname(f.filename)) &&
      (f.status === 'added' || f.status === 'modified') &&
      f.patch,
  ) as (Omit<T, 'patch'> & { patch: string })[];
}
