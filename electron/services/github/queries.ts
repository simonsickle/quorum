export const PENDING_REVIEWS_QUERY = `
  query PendingReviews {
    search(
      query: "is:pr is:open review-requested:$login archived:false"
      type: ISSUE
      first: 50
    ) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          body
          state
          isDraft
          url
          createdAt
          updatedAt
          additions
          deletions
          changedFiles
          reviewDecision
          headRefName
          baseRefName
          headRefOid
          baseRefOid
          author {
            login
            avatarUrl
            url
          }
          repository {
            nameWithOwner
            url
            defaultBranchRef {
              name
            }
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
        }
      }
    }
  }
`;

export const PR_FILES_QUERY = `
  query PRFiles($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        files(first: 100) {
          nodes {
            path
            additions
            deletions
            changeType
          }
        }
      }
    }
  }
`;

export const VIEWER_QUERY = `
  query Viewer {
    viewer {
      login
      avatarUrl
    }
  }
`;
