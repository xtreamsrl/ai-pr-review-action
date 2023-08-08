import { Octokit } from '@octokit/action';
import { ReviewComment } from './reviewer';
import { error, warning } from '@actions/core';
import type { context as GITHUB_CONTEXT } from '@actions/github';

export const octokit = new Octokit();
export type GithubContext = typeof GITHUB_CONTEXT;
export type GhContextWithPullRequest = Omit<GithubContext, 'payload'> & { payload: Required<GithubContext['payload']>}

type GhCommentData = {
  path: string;
  body: string;
  line: number;
  side: 'RIGHT';
}

const generateGhCommentData = (comment: ReviewComment): GhCommentData => {
  return {
    path: comment.fileName,
    body: comment.message,
    line: comment.startLine,
    side: 'RIGHT' // Assume all comments are on the right side of the diff for now.
  }
}

async function createReviewWithComments(commentsData: GhCommentData[], prNumber: number, commitId: string, owner: string, repo: string) {
  return await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    commit_id: commitId,
    comments: commentsData
  });
}

async function createReviewThenComments(commentsData: GhCommentData[], prNumber: number, commitId: string, owner: string, repo: string) {
  const review = await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    commit_id: commitId
  });
  for (const commentData of commentsData) {
    try {
      await octokit.pulls.createReviewComment({
        owner,
        repo,
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

export async function submitReview(comments: ReviewComment[], prNumber: number, commitId: string, owner: string, repo: string) {
  const commentsData = comments.map(comment =>
    generateGhCommentData(comment)
  );
  try {
    let review;
    try {
      review = await createReviewWithComments(commentsData, prNumber, commitId, owner, repo);
    } catch (e: unknown) {
      // Try to create review and submit comment separately, to avoid missing the entire review if one comment fails.
      review = await createReviewThenComments(commentsData, prNumber, commitId, owner, repo);
    }
    await octokit.pulls.submitReview({
      owner,
      repo,
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
