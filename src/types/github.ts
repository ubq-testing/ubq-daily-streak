import { RestEndpointMethodTypes } from "@octokit/rest";

export type Label = RestEndpointMethodTypes["issues"]["listLabelsForRepo"]["response"]["data"][0];

export enum UserType {
  User = "User",
  Bot = "Bot",
  Organization = "Organization",
}

export type PublicEvents =
  | IssueCommentEvent
  | PushEvent
  | PullRequestReviewCommentEvent //  created >:( "comment" & "pull_request" in payload
  | PullRequestReviewEvent // created >:( "review" & "pull_request" in payload
  | PullRequestEvent // open | closed
  | IssuesEvent // open | closed
  | CreateEvent; // creating a new branch (start tracking from here)

export type PublicEventTypes =
  | "IssueCommentEvent"
  | "PushEvent"
  | "PullRequestReviewCommentEvent"
  | "PullRequestReviewEvent"
  | "PullRequestEvent"
  | "IssuesEvent"
  | "CreateEvent";

export type IssueCommentEvent = {
  id: string;
  type: "IssueCommentEvent";
  actor: {
    id: number;
    login: string;
    display_login: string;
    gravatar_id: string;
    url: string;
    avatar_url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    action: "created" | "edited" | "deleted";
    issue: {
      url: string;
      repository_url: string;
      labels_url: string;
      comments_url: string;
      events_url: string;
      html_url: string;
      id: number;
      node_id: string;
      number: number;
      title: string;
      user: {
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        site_admin: boolean;
      };
      labels: any[];
      state: string;
      locked: boolean;
      assignee: any;
      assignees: any[];
      milestone: any;
      comments: number;
      created_at: string;
      updated_at: string;
      closed_at: any;
      author_association: string;
      active_lock_reason: any;
      draft: boolean;
      pull_request: {
        url: string;
        html_url: string;
        diff_url: string;
        patch_url: string;
      };
      body: string;
      reactions: {
        url: string;
        total_count: number;
        "+1": number;
        "-1": number;
        laugh: number;
        hooray: number;
        confused: number;
        heart: number;
        rocket: number;
        eyes: number;
      };
      timeline_url: string;
      performed_via_github_app: any;
      state_reason: any;
    };
    comment: {
      url: string;
      html_url: string;
      issue_url: string;
      id: number;
      node_id: string;
      user: {
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        site_admin: boolean;
      };
      created_at: string;
      updated_at: string;
      author_association: string;
      body: string;
      reactions: {
        url: string;
        total_count: number;
        "+1": number;
        "-1": number;
        laugh: number;
        hooray: number;
        confused: number;
        heart: number;
        rocket: number;
        eyes: number;
      };
      performed_via_github_app: null;
    };
  };
  public: true;
  created_at: string;
  org: {
    id: number;
    login: string;
    gravatar_id: string;
    url: string;
    avatar_url: string;
  };
};

export type PushEvent = {
  id: string;
  type: "PushEvent";
  actor: {
    id: number;
    login: string;
    display_login: string;
    gravatar_id: string;
    url: string;
    avatar_url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    repository_id: number;
    push_id: number;
    size: number;
    distinct_size: number;
    ref: string;
    head: string;
    before: string;
    commits: {
      sha: string;
      author: {
        email: string;
        name: string;
      };
      message: string;
      distinct: boolean;
      url: string;
    }[];
  };
  public: true;
  created_at: string;
};

export type User = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
};

export type ShaRefs = {
  label: string;
  ref: string;
  sha: string;
  user: User;
  repo: {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: User;
    html_url: string;
    description: string;
    fork: boolean;
    url: string;
    forks_url: string;
    keys_url: string;
    collaborators_url: string;
    teams_url: string;
    hooks_url: string;
    issue_events_url: string;
    events_url: string;
    assignees_url: string;
    branches_url: string;
    tags_url: string;
    blobs_url: string;
    git_tags_url: string;
    git_refs_url: string;
    trees_url: string;
    statuses_url: string;
    languages_url: string;
    stargazers_url: string;
    contributors_url: string;
    subscribers_url: string;
    subscription_url: string;
    commits_url: string;
    git_commits_url: string;
    comments_url: string;
    issue_comment_url: string;
    contents_url: string;
    compare_url: string;
    merges_url: string;
    archive_url: string;
    downloads_url: string;
    issues_url: string;
    pulls_url: string;
    milestones_url: string;
    notifications_url: string;
    labels_url: string;
    releases_url: string;
    deployments_url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    has_discussions: boolean;
    forks_count: number;
    mirror_url: null;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: null;
    allow_forking: boolean;
    is_template: boolean;
    topics: any[];
    visibility: string;
    forks: number;
    open_issues: number;
    watchers: number;
    default_branch: string;
  };
};

export type PullRequest = {
  url: string;
  id: number;
  node_id: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  issue_url: string;
  number: number;
  state: "open" | "closed";
  locked: boolean;
  title: string;
  user: User;
  body: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
  merged_at: string;
  merge_commit_sha: string;
  assignee: User;
  assignees: User[];
  requested_reviewers: User[];
  requested_teams: User[];
  labels: any[];
  milestone: null;
  draft: boolean;
  commits_url: string;
  review_comments_url: string;
  review_comment_url: string;
  comments_url: string;
  statuses_url: string;
  head: ShaRefs;
  base: ShaRefs;
  _links: {
    self: {
      href: string;
    };
    html: {
      href: string;
    };
    issue: {
      href: string;
    };
    comments: {
      href: string;
    };
    review_comments: {
      href: string;
    };
    review_comment: {
      href: string;
    };
    commits: {
      href: string;
    };
    statuses: {
      href: string;
    };
  };
  author_association: string;
  auto_merge: null;
  active_lock_reason: null;
};

export type Org = {
  id: number;
  login: string;
  gravatar_id: string;
  url: string;
  avatar_url: string;
};

export type Actor = {
  id: number;
  login: string;
  display_login: string;
  gravatar_id: string;
  url: string;
  avatar_url: string;
};

export type PullRequestReviewCommentEvent = {
  id: string;
  type: "PullRequestReviewCommentEvent";
  actor: Actor;
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    action: "created" | "edited" | "deleted";
    comment: {
      url: string;
      pull_request_review_id: number;
      id: number;
      node_id: string;
      diff_hunk: string;
      path: string;
      commit_id: string;
      original_commit_id: string;
      user: User;
      body: string;
      created_at: string;
      updated_at: string;
      html_url: string;
      pull_request_url: string;
      author_association: string;
      _links: {
        self: {
          href: string;
        };
        html: {
          href: string;
        };
        pull_request: {
          href: string;
        };
      };
      reactions: {
        url: string;
        total_count: number;
        "+1": number;
        "-1": number;
        laugh: number;
        hooray: number;
        confused: number;
        heart: number;
        rocket: number;
        eyes: number;
      };
      start_line: null;
      original_start_line: null;
      start_side: null;
      line: null;
      original_line: number;
      side: "RIGHT";
      in_reply_to_id: number;
      original_position: number;
      position: null;
      subject_type: "line";
    };
    pull_request: PullRequest;
  };
  public: true;
  created_at: string;
  org: Org;
};

export type PullRequestReviewEvent = {
  id: string;
  type: "PullRequestReviewEvent";
  actor: Actor;
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    action: "created";
    review: {
      id: number;
      node_id: string;
      user: User;
      body: null;
      commit_id: string;
      submitted_at: string;
      state: "commented";
      html_url: string;
      pull_request_url: string;
      author_association: string;
      _links: {
        html: {
          href: string;
        };
        pull_request: {
          href: string;
        };
      };
    };
    pull_request: PullRequest;
  };
  public: true;
  created_at: string;
  org: Org;
};

export type PullRequestEvent = {
  id: string;
  type: "PullRequestEvent";
  actor: Actor;
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    action: "opened";
    number: number;
    pull_request: PullRequest;
  };
  public: true;
  created_at: string;
  org: Org;
};

export type Issue = {
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  user: User;
  labels: any[];
  state: string;
  locked: boolean;
  assignee: any;
  assignees: any[];
  milestone: any;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: any;
  author_association: string;
  active_lock_reason: any;
  body: string;
  reactions: {
    url: string;
    total_count: number;
    "+1": number;
    "-1": number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
  timeline_url: string;
  performed_via_github_app: any;
  state_reason: any;
};

export type IssuesEvent = {
  id: string;
  type: "IssuesEvent";
  actor: Actor;
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    action: "opened" | "closed";
    issue: Issue;
  };
  public: true;
  created_at: string;
  org: Org;
};

export type CreateEvent = {
  id: string;
  type: "CreateEvent";
  actor: Actor;

  repo: {
    id: number;
    name: string;
    url: string;
  };

  payload: {
    ref: string;
    ref_type: "branch";
    master_branch: string;
    description: string;
    pusher_type: "user";
  };

  public: true;
  created_at: string;
  org: Org;
};
