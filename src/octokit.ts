import { Octokit } from '@octokit/action';
import { ContextWithPullRequest } from './utils';
import { ReviewComment } from './reviewer';

export const octokit = new Octokit();

export async function postComment(comment: ReviewComment, commits: { sha: string }[], context: ContextWithPullRequest) {
  return await octokit.pulls.createReviewComment({
    repo: context.repo.repo,
    owner: context.repo.owner,
    pull_number: context.payload.pull_request.number,
    commit_id: commits[commits.length - 1].sha,
    path: comment.fileName,
    body: comment.comment,
    position: comment.patch.split('\n').length - 1,
  });
}
