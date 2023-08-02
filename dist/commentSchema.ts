// The following is the schema for a GitHub pull request comment relative to a diff hunk.
export interface CommentSchema {
  message: string;    // Text of the comment.
  startLine: number;  // Start line is inclusive, it's the first line of the diff hunk that the comment applies to.
  endLine: number;    // End line is inclusive, it's the last line of the diff hunk that the comment applies to.
  severity: number;   // Severity is a number between 0 and 10 that represents how important the comment is.
}
