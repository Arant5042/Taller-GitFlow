import { missionIssueBody, missionIssueTitle, missionMarker } from "./practice-missions.js";

export function getRepositoryFromEnv() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !repository.includes("/")) {
    throw new Error("No se encontró GITHUB_REPOSITORY. Ejecuta este script desde GitHub Actions o define owner/repo.");
  }

  const [owner, repo] = repository.split("/");
  return { owner, repo };
}

export function getTokenFromEnv() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("No se encontró GITHUB_TOKEN. El workflow debe pasarlo desde secrets.GITHUB_TOKEN.");
  }

  return token;
}

export class GitHubApi {
  constructor({ owner, repo, token }) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  }

  async request(method, path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.message || response.statusText;
      throw new Error(`GitHub API ${method} ${path} falló con estado ${response.status}: ${message}`);
    }

    return { data, headers: response.headers };
  }
}

export async function listAllIssues(api) {
  const issues = [];

  // La API de issues también devuelve pull requests; se filtran después.
  for (let page = 1; page <= 10; page += 1) {
    const { data, headers } = await api.request("GET", `/issues?state=all&per_page=100&page=${page}`);
    issues.push(...data);

    const link = headers.get("link") || "";
    if (!link.includes('rel="next"')) {
      break;
    }
  }

  return issues.filter((issue) => !issue.pull_request);
}

export function findMissionIssue(issues, mission) {
  const expectedMarker = missionMarker(mission.id);
  const expectedTitle = missionIssueTitle(mission);

  return issues.find((issue) => {
    const body = issue.body || "";
    return body.includes(expectedMarker) || issue.title === expectedTitle;
  });
}

export async function createMissionIssue(api, mission) {
  const { data } = await api.request("POST", "/issues", {
    body: {
      title: missionIssueTitle(mission),
      body: missionIssueBody(mission)
    }
  });

  return data;
}

export async function closeIssue(api, issueNumber, reason = "completed") {
  const { data } = await api.request("PATCH", `/issues/${issueNumber}`, {
    body: {
      state: "closed",
      state_reason: reason
    }
  });

  return data;
}

export async function reopenIssue(api, issueNumber) {
  const { data } = await api.request("PATCH", `/issues/${issueNumber}`, {
    body: {
      state: "open"
    }
  });

  return data;
}

export async function createIssueComment(api, issueNumber, body) {
  const { data } = await api.request("POST", `/issues/${issueNumber}/comments`, {
    body: { body }
  });

  return data;
}

export async function listIssueComments(api, issueNumber) {
  const comments = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, headers } = await api.request("GET", `/issues/${issueNumber}/comments?per_page=100&page=${page}`);
    comments.push(...data);

    const link = headers.get("link") || "";
    if (!link.includes('rel="next"')) {
      break;
    }
  }

  return comments;
}

export async function updateIssueComment(api, commentId, body) {
  const { data } = await api.request("PATCH", `/issues/comments/${commentId}`, {
    body: { body }
  });

  return data;
}

export async function upsertIssueComment(api, issueNumber, marker, body) {
  const comments = await listIssueComments(api, issueNumber);
  const previous = comments.find((comment) => (comment.body || "").includes(marker));
  const bodyWithMarker = `${marker}

${body}`;

  if (previous) {
    return updateIssueComment(api, previous.id, bodyWithMarker);
  }

  return createIssueComment(api, issueNumber, bodyWithMarker);
}

export async function listClosedPullRequests(api) {
  const pulls = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, headers } = await api.request("GET", `/pulls?state=closed&per_page=100&page=${page}`);
    pulls.push(...data);

    const link = headers.get("link") || "";
    if (!link.includes('rel="next"')) {
      break;
    }
  }

  return pulls;
}
