import { Octokit } from '@octokit/action';
import { ContextWithPullRequest } from './utils';
import { ReviewComment } from './reviewer';

export const octokit = new Octokit();

const generateCommentData = (comment: ReviewComment) => {
  return {
    path: comment.fileName,
    body: comment.message,
    position: comment.startLine,
  }
}

export async function submitReview(comments: ReviewComment[], prNumber: number, commitId: string, context: ContextWithPullRequest) {
  const review = await octokit.pulls.createReview({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    commit_id: commitId,
    comments: comments.map(comment =>
      generateCommentData(comment)
    )
  });
  await octokit.pulls.submitReview({
    owner: context.repo.owner,
    repo: context.repo.repo,
    // eslint-disable-next-line camelcase
    pull_number: prNumber,
    // eslint-disable-next-line camelcase
    review_id: review.data.id,
    event: 'COMMENT'
  })
}
