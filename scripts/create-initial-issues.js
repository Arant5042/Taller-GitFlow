import { createMissionIssue, findMissionIssue, getRepositoryFromEnv, getTokenFromEnv, GitHubApi, listAllIssues } from "./github-api.js";
import { getMissionById } from "./practice-missions.js";

async function main() {
  const firstMissionId = Number(process.env.FIRST_MISSION_ID || "1");
  const initialMissionCount = Number(process.env.INITIAL_MISSION_COUNT || "1");
  const missionsToCreate = [];

  for (let offset = 0; offset < initialMissionCount; offset += 1) {
    const mission = getMissionById(firstMissionId + offset);
    if (mission) {
      missionsToCreate.push(mission);
    }
  }

  if (missionsToCreate.length === 0) {
    throw new Error("No hay misiones iniciales para crear. Revisa FIRST_MISSION_ID o INITIAL_MISSION_COUNT.");
  }

  const { owner, repo } = getRepositoryFromEnv();
  const api = new GitHubApi({ owner, repo, token: getTokenFromEnv() });
  const existingIssues = await listAllIssues(api);

  console.log(`Repositorio detectado: ${owner}/${repo}`);
  console.log(`Misiones iniciales solicitadas: ${missionsToCreate.map((mission) => mission.id).join(", ")}`);

  for (const mission of missionsToCreate) {
    const duplicate = findMissionIssue(existingIssues, mission);
    if (duplicate) {
      console.log(`La misión ${mission.id} ya existe como issue #${duplicate.number}. No se duplica.`);
      continue;
    }

    const issue = await createMissionIssue(api, mission);
    existingIssues.push(issue);
    console.log(`Misión ${mission.id} creada como issue #${issue.number}: ${issue.html_url}`);
  }
}

main().catch((error) => {
  console.error("No se pudieron crear los issues iniciales.");
  console.error(error.message);
  process.exit(1);
});
