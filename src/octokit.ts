import { Octokit } from '@octokit/action';
import { ContextWithPullRequest } from './utils';
import { ReviewComment } from './reviewer';
import { error, warning } from '@actions/core';

export const octokit = new Octokit();

type CommentData = {
  path: string;
  body: string;
  line: number;
  side: 'RIGHT';
}
const generateCommentData = (comment: ReviewComment): CommentData => {
  return {
    path: comment.fileName,
    body: comment.message,
    line: comment.startLine,
    side: 'RIGHT'
  }
}

async function createReviewWithComments(commentsData: CommentData[], prNumber: number, commitId: string, context: ContextWithPullRequest) {
  return await octokit.pulls.createReview({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    commit_id: commitId,
    comments: commentsData
  });
}

async function createReviewThenComments(commentsData: CommentData[], prNumber: number, commitId: string, context: ContextWithPullRequest) {
  const review = await octokit.pulls.createReview({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    commit_id: commitId
  });
  for (const commentData of commentsData) {
    try {
      await octokit.pulls.createReviewComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber,
        commit_id: commitId,
        ...commentData
      });
    } catch (e: unknown) {
      warning(`Failed to create comment on pr #${prNumber} with data: ${JSON.stringify(commentData)}`);
    }
  }
  return review;
}

export async function submitReview(comments: ReviewComment[], prNumber: number, commitId: string, context: ContextWithPullRequest) {
  const commentsData = comments.map(comment =>
    generateCommentData(comment)
  );
  try {
    let review;
    try {
      review = await createReviewWithComments(commentsData, prNumber, commitId, context);
    } catch (e: unknown) {
      // Try to create review and submit comment separately, to avoid missing the entire review if one comment fails.
      review = await createReviewThenComments(commentsData, prNumber, commitId, context);
    }
    await octokit.pulls.submitReview({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber,
      review_id: review.data.id,
      event: 'COMMENT'
    })
  } catch (e: unknown) {
    error(`Failed to submit review on pr #${prNumber}`);
    warning(`Comments data: ${JSON.stringify(commentsData)}`);
    throw e;
  }

}
