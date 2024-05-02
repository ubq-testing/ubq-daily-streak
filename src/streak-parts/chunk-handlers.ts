import { PRStreakData } from "../types/chunks";
import {
  CreateEvent,
  IssueCommentEvent,
  IssuesEvent,
  PublicEvents,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
  PushEvent,
} from "../types/github";

export function handleEvent(event: PublicEvents) {
  switch (event.type) {
    case "IssueCommentEvent":
      return handleIssueCommentEvent(event as IssueCommentEvent);
    case "PushEvent":
      return handlePushEvent(event as PushEvent);
    case "PullRequestReviewCommentEvent":
      return handlePullRequestReviewCommentEvent(event as PullRequestReviewCommentEvent);
    case "PullRequestReviewEvent":
      return handlePullRequestReviewEvent(event as PullRequestReviewEvent);
    case "PullRequestEvent":
      return handlePullRequestEvent(event as PullRequestEvent);
    case "IssuesEvent":
      return handleIssuesEvent(event as IssuesEvent);
    case "CreateEvent":
      return handleCreateEvent(event as CreateEvent);
    default:
      return null;
  }
}
/**
 * These will be weighted as the least important actions
 *
 * @param event an issue comment event
 * @returns
 */
export function handleIssueCommentEvent(event: IssueCommentEvent) {
  const repoDataMap = {} as Record<string, PRStreakData[]>;
  const { actor, created_at, payload, repo } = event;
  const { issue, comment } = payload;
  const { closed_at, created_at: prCreatedAt, merged_at, updated_at, assignee, author_association: prAuthorAssociation, number, labels } = issue;
  const { user, author_association: review_author_association } = comment;

  const times = {
    event_created_at: new Date(created_at),
    created_at: new Date(prCreatedAt),
    updated_at: new Date(updated_at),
    closed_at: closed_at ? new Date(closed_at) : null,
    merged_at: merged_at ? new Date(merged_at) : null,
  };

  const timeToMerge = !!times.merged_at && times.merged_at.getTime() - times.created_at.getTime();
  const timeToClose = !!times.closed_at && times.closed_at.getTime() - times.created_at.getTime();
  const closedOrMerged = !times.merged_at && times.closed_at ? "closed" : ("merged" as "closed" | "merged");

  const isUserAssignee = assignee && assignee.login === actor.login;
  const isUserReviewer = user && user.login === actor.login;

  let role;
  if (isUserAssignee) {
    role = "assignee";
  } else if (isUserReviewer) {
    role = "reviewer";
  } else {
    role = "other";
  }

  // prAuthorAssociation = author of PR in relation to repo
  // review_author_association = author of reviewer in relation to PR
  // isSameRelationship = if the author of the PR is the same as the author of the review
  // if true, the review is self-review/replying to a review

  const isSameRelationship = prAuthorAssociation === review_author_association;

  const prStreakData = {
    timeToMerge,
    timeToClose,
    closedOrMerged,
    role,
    isUserAssignee,
    isUserReviewer,
    isSameRelationship,
    number,
    labels,
    ...times,
  };

  if (!repoDataMap[repo.name]) {
    repoDataMap[repo.name] = [];
  }

  repoDataMap[repo.name].push(prStreakData);

  return repoDataMap;
}
export function handlePushEvent(event: PushEvent) {
  const repoDataMap = {} as Record<string, PRStreakData[]>;
  const { actor, created_at, payload, repo } = event;
  const { commits, size } = payload;

  const times = {
    event_created_at: new Date(created_at),
  };

  const prStreakData = {
    timeToMerge: false,
    timeToClose: false,
    closedOrMerged: "closed",
    role: "other",
    isUserAssignee: false,
    isUserReviewer: false,
    number: null,
    labels: [],
    commits,
    ...times,
  };

  if (!repoDataMap[repo.name]) {
    repoDataMap[repo.name] = [];
  }

  repoDataMap[repo.name].push(prStreakData);

  return repoDataMap;
}
export function handlePullRequestReviewCommentEvent(event: PullRequestReviewCommentEvent) {
  const repoDataMap = {} as Record<string, PRStreakData[]>;
  const { created_at, payload, repo, actor } = event;
  const { pull_request, comment } = payload;
  const { closed_at, created_at: prCreatedAt, merged_at, updated_at, assignee, author_association: prAuthorAssociation, number, labels } = pull_request;
  const { user, author_association: review_author_association } = comment;

  const times = {
    event_created_at: new Date(created_at),
    created_at: new Date(prCreatedAt),
    updated_at: new Date(updated_at),
    closed_at: closed_at ? new Date(closed_at) : null,
    merged_at: merged_at ? new Date(merged_at) : null,
  };

  const timeToMerge = !!times.merged_at && times.merged_at.getTime() - times.created_at.getTime();
  const timeToClose = !!times.closed_at && times.closed_at.getTime() - times.created_at.getTime();
  const closedOrMerged = !times.merged_at && times.closed_at ? "closed" : ("merged" as "closed" | "merged");

  const isUserAssignee = assignee && assignee.login === actor.login;
  const isUserReviewer = user && user.login === actor.login;

  let role;
  if (isUserAssignee) {
    role = "assignee";
  } else if (isUserReviewer) {
    role = "reviewer";
  } else {
    role = "other";
  }

  // prAuthorAssociation = author of PR in relation to repo
  // review_author_association = author of reviewer in relation to PR
  // isSameRelationship = if the author of the PR is the same as the author of the review
  // if true, the review is self-review/replying to a review
  const isSameRelationship = prAuthorAssociation === review_author_association;

  const prStreakData = {
    timeToMerge,
    timeToClose,
    closedOrMerged,
    role,
    isUserAssignee,
    isUserReviewer,
    isSameRelationship,
    number,
    labels,
    ...times,
  };

  if (!repoDataMap[repo.name]) {
    repoDataMap[repo.name] = [];
  }

  repoDataMap[repo.name].push(prStreakData);

  return repoDataMap;
}
export function handlePullRequestReviewEvent(event: PullRequestReviewEvent) {
  const repoDataMap = {} as Record<string, PRStreakData[]>;
  const { created_at, payload, repo, actor } = event;
  const { pull_request, review } = payload;
  const { closed_at, created_at: prCreatedAt, merged_at, updated_at, assignee, author_association: prAuthorAssociation, number, labels } = pull_request;
  const { submitted_at, user, author_association: review_author_association } = review;

  const times = {
    event_created_at: new Date(created_at),
    created_at: new Date(prCreatedAt),
    updated_at: new Date(updated_at),
    submitted_at: new Date(submitted_at),
    closed_at: closed_at ? new Date(closed_at) : null,
    merged_at: merged_at ? new Date(merged_at) : null,
  };

  const timeToMerge = !!times.merged_at && times.merged_at.getTime() - times.created_at.getTime();
  const timeToClose = !!times.closed_at && times.closed_at.getTime() - times.created_at.getTime();
  const closedOrMerged = !times.merged_at && times.closed_at ? "closed" : ("merged" as "closed" | "merged");

  const isUserAssignee = assignee && assignee.login === actor.login;
  const isUserReviewer = user && user.login === actor.login;

  let role;
  if (isUserAssignee) {
    role = "assignee";
  } else if (isUserReviewer) {
    role = "reviewer";
  } else {
    role = "other";
  }

  // prAuthorAssociation = author of PR in relation to repo
  // review_author_association = author of reviewer in relation to PR
  // isSameRelationship = if the author of the PR is the same as the author of the review
  // if true, the review is self-review/replying to a review
  const isSameRelationship = prAuthorAssociation === review_author_association;

  const prStreakData = {
    timeToMerge,
    timeToClose,
    closedOrMerged,
    role,
    isUserAssignee,
    isUserReviewer,
    isSameRelationship,
    number,
    labels,
    ...times,
  };

  if (!repoDataMap[repo.name]) {
    repoDataMap[repo.name] = [];
  }

  repoDataMap[repo.name].push(prStreakData);

  return repoDataMap;
}
export function handlePullRequestEvent(event: PullRequestEvent) {
  const repoDataMap = {} as Record<string, PRStreakData[]>;
  const { created_at, payload, repo, actor } = event;
  const { pull_request } = payload;
  const { closed_at, created_at: prCreatedAt, merged_at, updated_at, number, labels, assignee, user } = pull_request;

  const times = {
    event_created_at: new Date(created_at),
    created_at: new Date(prCreatedAt),
    updated_at: new Date(updated_at),
    closed_at: closed_at ? new Date(closed_at) : null,
    merged_at: merged_at ? new Date(merged_at) : null,
  };

  const timeToMerge = !!times.merged_at && times.merged_at.getTime() - times.created_at.getTime();
  const timeToClose = !!times.closed_at && times.closed_at.getTime() - times.created_at.getTime();
  const closedOrMerged = !times.merged_at && times.closed_at ? "closed" : ("merged" as "closed" | "merged");

  const isUserAssignee = assignee && assignee.login === actor.login;
  const isUserReviewer = user && user.login === actor.login;

  let role;
  if (isUserAssignee) {
    role = "assignee";
  } else if (isUserReviewer) {
    role = "reviewer";
  } else {
    role = "other";
  }

  const prStreakData = {
    timeToMerge,
    timeToClose,
    closedOrMerged,
    role,
    isUserAssignee,
    isUserReviewer,
    number,
    labels,
    ...times,
  };

  if (!repoDataMap[repo.name]) {
    repoDataMap[repo.name] = [];
  }

  repoDataMap[repo.name].push(prStreakData);

  return repoDataMap;
}
export function handleIssuesEvent(event: IssuesEvent) {
  const repoDataMap = {} as Record<string, PRStreakData[]>;
  const { created_at, payload, repo, actor } = event;
  const { issue: issueData, action } = payload;
  const { closed_at, created_at: issueCreatedAt, updated_at, labels, assignee, number, state_reason, user } = issueData;

  const times = {
    event_created_at: new Date(created_at),
    created_at: new Date(issueCreatedAt),
    updated_at: new Date(updated_at),
    closed_at: closed_at ? new Date(closed_at) : null,
  };

  const timeToClose = !!times.closed_at && times.closed_at.getTime() - times.created_at.getTime();
  const isUserAssignee = assignee && assignee.login === actor.login;
  const isUserReviewer = user && user.login === actor.login;
  const role = isUserAssignee ? "assignee" : "other";

  let stateReason;
  if (state_reason === "reopened") {
    stateReason = "reopened";
  } else if (state_reason === "completed") {
    stateReason = "completed";
  } else {
    stateReason = "other";
  }

  let closedOrMerged;
  if (stateReason === "completed") {
    closedOrMerged = "merged";
  } else if (action === "closed") {
    closedOrMerged = "closed";
  }

  const prStreakData = {
    timeToMerge: false,
    timeToClose,
    closedOrMerged,
    role,
    isUserAssignee,
    isUserReviewer,
    number,
    labels,
    ...times,
  };

  if (!repoDataMap[repo.name]) {
    repoDataMap[repo.name] = [];
  }

  repoDataMap[repo.name].push(prStreakData);

  return repoDataMap;
}
export function handleCreateEvent(event: CreateEvent) {
  const repoDataMap = {} as Record<string, PRStreakData[]>;
  const { actor, created_at, payload, repo } = event;
  const { ref } = payload;

  const prStreakData = {
    actor,
    created_at,
    payload,
    repo,
    ref,
    ...chunk,
  };

  if (!repoDataMap[repo.name]) {
    repoDataMap[repo.name] = [];
  }

  repoDataMap[repo.name].push(prStreakData);

  return repoDataMap;
}
