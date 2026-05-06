import { createMissionIssue, findMissionIssue, getRepositoryFromEnv, getTokenFromEnv, GitHubApi, listAllIssues, reopenIssue } from "./github-api.js";
import { extractMissionId, getNextMission } from "./practice-missions.js";
import { readFileSync } from "node:fs";

function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return null;
  }

  try {
    const payload = JSON.parse(readFileSync(eventPath, "utf8"));
    return payload;
  } catch (error) {
    throw new Error(`No se pudo leer GITHUB_EVENT_PATH (${eventPath}): ${error.message}`);
  }
}

function getClosedMissionFromInputs(payload) {
  const missionArg = process.argv.find((arg) => arg.startsWith("--mission="));
  if (missionArg) {
    return Number(missionArg.split("=")[1]);
  }

  if (process.env.CLOSED_MISSION) {
    return Number(process.env.CLOSED_MISSION);
  }

  const issue = payload?.issue;
  if (!issue) {
    return null;
  }

  return extractMissionId(`${issue.title || ""}\n${issue.body || ""}`);
}

async function commentOnClosedIssue(api, issueNumber, nextIssue) {
  if (!issueNumber || !nextIssue?.html_url) {
    return;
  }

  try {
    await api.request("POST", `/issues/${issueNumber}/comments`, {
      body: {
        body: `Siguiente misión creada automáticamente: #${nextIssue.number} ${nextIssue.html_url}`
      }
    });
  } catch (error) {
    console.warn(`No se pudo comentar en el issue cerrado: ${error.message}`);
  }
}

async function main() {
  const payload = readEventPayload();

  if (payload?.action && payload.action !== "closed") {
    console.log(`Evento '${payload.action}' recibido. Solo se crea la siguiente misión al cerrar un issue.`);
    return;
  }

  const closedMissionId = getClosedMissionFromInputs(payload);
  if (!closedMissionId) {
    console.log("El issue cerrado no contiene un identificador de misión. No se crea ningún issue.");
    return;
  }

  const nextMission = getNextMission(closedMissionId);
  if (!nextMission) {
    console.log(`La misión ${closedMissionId} era la última. Práctica completada.`);
    return;
  }

  const { owner, repo } = getRepositoryFromEnv();
  const api = new GitHubApi({ owner, repo, token: getTokenFromEnv() });
  const existingIssues = await listAllIssues(api);
  const duplicate = findMissionIssue(existingIssues, nextMission);

  if (duplicate) {
    if (duplicate.state === "closed") {
      await reopenIssue(api, duplicate.number);
      console.log(`La misión ${nextMission.id} ya existía como issue #${duplicate.number}, pero estaba cerrada. Se reabrió.`);
      return;
    }

    console.log(`La misión ${nextMission.id} ya existe como issue #${duplicate.number}. No se duplica.`);
    return;
  }

  const issue = await createMissionIssue(api, nextMission);
  console.log(`Misión ${nextMission.id} creada como issue #${issue.number}: ${issue.html_url}`);
  await commentOnClosedIssue(api, payload?.issue?.number, issue);
}

main().catch((error) => {
  console.error("No se pudo crear el siguiente issue.");
  console.error(error.message);
  process.exit(1);
});
