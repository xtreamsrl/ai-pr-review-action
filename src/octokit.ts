import { Octokit } from '@octokit/action';
import { ContextWithPullRequest } from './utils';
import { ReviewComment } from './reviewer';
import { error, warning } from '@actions/core';

export const octokit = new Octokit();

const generateCommentData = (comment: ReviewComment) => {
  return {
    path: comment.fileName,
    body: comment.message,
    line: comment.startLine,
    side: 'RIGHT'
  }
}

export async function submitReview(comments: ReviewComment[], prNumber: number, commitId: string, context: ContextWithPullRequest) {
  const commentsData = comments.map(comment =>
    generateCommentData(comment)
  );
  try {
    const review = await octokit.pulls.createReview({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber,
      commit_id: commitId,
      comments: commentsData
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
  } catch (e: unknown) {
    error(`Failed to submit review on pr #${prNumber}`);
    warning(`Comments data: ${JSON.stringify(commentsData)}`);
    throw e;
  }

}
