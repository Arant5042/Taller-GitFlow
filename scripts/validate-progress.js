import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import {
  closeIssue,
  createMissionIssue,
  findMissionIssue,
  getRepositoryFromEnv,
  getTokenFromEnv,
  GitHubApi,
  listAllIssues,
  listClosedPullRequests,
  reopenIssue,
  upsertIssueComment
} from "./github-api.js";
import { extractMissionId, getMissionById, getNextMission, missions } from "./practice-missions.js";

const REQUIRED_SECTIONS = [
  { level: 1, text: "Nombre del Proyecto" },
  { level: 2, text: "Descripción" },
  { level: 2, text: "Instalación" },
  { level: 2, text: "Uso" },
  { level: 2, text: "Autores" },
  { level: 2, text: "Flujo de trabajo Git" },
  { level: 2, text: "Evidencias" }
];

function git(args, options = {}) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return "";
    }

    throw new Error(`No se pudo ejecutar git ${args.join(" ")}: ${error.stderr?.toString() || error.message}`);
  }
}

function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) {
    return null;
  }

  return JSON.parse(readFileSync(eventPath, "utf8"));
}

function eventName() {
  return process.env.GITHUB_EVENT_NAME || "manual";
}

function currentRefName(payload) {
  return process.env.GITHUB_REF_NAME
    || payload?.ref
    || payload?.pull_request?.head?.ref
    || "";
}

function listBranches() {
  const refs = git([
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads",
    "refs/remotes/origin"
  ], { allowFailure: true });

  return refs
    .split(/\r?\n/)
    .map((branch) => branch.trim())
    .filter(Boolean)
    .filter((branch) => branch !== "origin/HEAD");
}

function branchExists(branches, name) {
  return branches.includes(name) || branches.includes(`origin/${name}`);
}

function stripFencedCodeBlocks(markdown) {
  let insideFence = false;

  return markdown
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        insideFence = !insideFence;
        return "";
      }

      return insideFence ? "" : line;
    })
    .join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasHeading(markdown, section) {
  const hashes = "#".repeat(section.level);
  const pattern = new RegExp(`^${hashes}\\s+${escapeRegExp(section.text)}\\s*#*\\s*$`, "im");
  return pattern.test(markdown);
}

function sectionContent(markdown, headingText) {
  const lines = markdown.split(/\r?\n/);
  const headingPattern = new RegExp(`^##\\s+${escapeRegExp(headingText)}\\s*#*\\s*$`, "i");
  const start = lines.findIndex((line) => headingPattern.test(line));

  if (start === -1) {
    return "";
  }

  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,2}\s+/.test(lines[index])) {
      break;
    }
    collected.push(lines[index]);
  }

  return collected.join("\n").trim();
}

function readReadme() {
  if (!existsSync("README.md")) {
    return "";
  }

  return readFileSync("README.md", "utf8");
}

function changedFilesFromPayload(payload) {
  const files = new Set();

  for (const commit of payload?.commits || []) {
    for (const file of [...(commit.added || []), ...(commit.modified || []), ...(commit.removed || [])]) {
      files.add(file);
    }
  }

  return files;
}

function hasCommitForFileSinceIssue(issue, filePath) {
  if (!issue?.created_at) {
    return false;
  }

  const commits = git(["log", `--since=${issue.created_at}`, "--format=%H", "--", filePath], { allowFailure: true });
  return commits.length > 0;
}

function readmeWasTouched(issue, payload) {
  return changedFilesFromPayload(payload).has("README.md") || hasCommitForFileSinceIssue(issue, "README.md");
}

function readmeDiffIsSmall(payload) {
  const before = payload?.before;
  const after = payload?.after;

  if (!before || !after || /^0+$/.test(before)) {
    return true;
  }

  const stats = git(["diff", "--numstat", before, after, "--", "README.md"], { allowFailure: true });
  if (!stats) {
    return true;
  }

  const [added = "0", removed = "0"] = stats.split(/\s+/);
  const total = Number(added) + Number(removed);
  return Number.isFinite(total) && total <= 30;
}

function check(ok, text, fix = "") {
  return { ok, text, fix };
}

function result({ mission, passed, checks, details = "" }) {
  return {
    mission,
    passed,
    checks,
    details
  };
}

function validateReadmeStructure(markdown) {
  const cleanMarkdown = stripFencedCodeBlocks(markdown);

  return REQUIRED_SECTIONS.map((section) => {
    const marker = `${"#".repeat(section.level)} ${section.text}`;
    return check(
      hasHeading(cleanMarkdown, section),
      `${marker} existe`,
      `Agrega el encabezado exacto \`${marker}\`.`
    );
  });
}

function validateSectionQuality(markdown) {
  const installation = sectionContent(markdown, "Instalación");
  const usage = sectionContent(markdown, "Uso");
  const authors = sectionContent(markdown, "Autores");
  const installationHasCommand = /```|`[^`]+`|\b(git clone|npm|node|pip|python|mvn|gradle|docker|cd)\b/i.test(installation);
  const usageHasExample = /```|`[^`]+`|- |\b(ejemplo|comando|ejecuta|usa|abre)\b/i.test(usage);

  return [
    check(installation.length >= 40, "La sección Instalación tiene contenido suficiente", "Incluye pasos concretos de instalación."),
    check(installationHasCommand, "Instalación incluye comandos o pasos ejecutables", "Agrega al menos un comando o ejemplo entre backticks."),
    check(usage.length >= 40, "La sección Uso explica cómo utilizar el proyecto", "Describe cómo ejecutar o probar el proyecto."),
    check(usageHasExample, "Uso incluye ejemplo, comando o instrucción concreta", "Agrega un ejemplo de uso o comando."),
    check(authors.length >= 10 && !/reemplazar/i.test(authors), "Autores identifica a quienes trabajan el proyecto", "Reemplaza el texto pendiente por nombres reales.")
  ];
}

function validateFinalReadme(markdown) {
  const flow = sectionContent(markdown, "Flujo de trabajo Git");
  const evidence = sectionContent(markdown, "Evidencias");

  return [
    ...validateReadmeStructure(markdown),
    ...validateSectionQuality(markdown),
    check(/develop/i.test(flow), "Flujo de trabajo Git menciona develop", "Explica cómo usaste la rama develop."),
    check(/feature\//i.test(flow), "Flujo de trabajo Git menciona ramas feature/", "Incluye las ramas feature usadas."),
    check(/release\/v?1\.0\.0|release\//i.test(flow), "Flujo de trabajo Git menciona release", "Describe la rama release/v1.0.0."),
    check(/hotfix\//i.test(flow), "Flujo de trabajo Git menciona hotfix", "Describe la rama hotfix/readme-typo."),
    check(/v1\.0\.0|tag/i.test(flow + "\n" + evidence), "El README menciona el tag v1.0.0", "Agrega evidencia o explicación del tag final."),
    check(/https?:\/\/|!\[|pull request|issue|workflow|captura|tag/i.test(evidence), "Evidencias contiene enlaces, capturas o referencias verificables", "Agrega links o capturas de ramas, PRs, workflows y tag.")
  ];
}

async function getClosedPulls(context) {
  if (!context.closedPulls) {
    context.closedPulls = await listClosedPullRequests(context.api);
  }

  return context.closedPulls;
}

async function hasMergedPull(context, head, base) {
  const pulls = await getClosedPulls(context);
  return pulls.some((pull) => pull.head?.ref === head && pull.base?.ref === base && pull.merged_at);
}

async function evaluateMission(mission, issue, context) {
  const payload = context.payload;
  const branches = context.branches;
  const refName = currentRefName(payload);
  const readme = readReadme();

  switch (mission.id) {
    case 1:
      return result({
        mission,
        passed: branchExists(branches, "develop"),
        checks: [
          check(branchExists(branches, "develop"), "Existe la rama develop", "Crea y publica la rama develop.")
        ]
      });

    case 2:
      return result({
        mission,
        passed: branchExists(branches, "feature/readme-base"),
        checks: [
          check(branchExists(branches, "feature/readme-base"), "Existe la rama feature/readme-base", "Crea y publica la rama feature/readme-base.")
        ]
      });

    case 3: {
      const checks = [
        check(refName === "feature/readme-base", "El avance ocurre en feature/readme-base", "Haz commit y push desde feature/readme-base."),
        check(readmeWasTouched(issue, payload), "README.md fue modificado después de abrir esta misión", "Edita README.md y publica un commit nuevo."),
        ...validateReadmeStructure(readme)
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 4: {
      const merged = await hasMergedPull(context, "feature/readme-base", "develop");
      const currentPull = payload?.pull_request;
      const correctPull = currentPull?.head?.ref === "feature/readme-base" && currentPull?.base?.ref === "develop";
      const checks = [
        check(merged || correctPull, "Existe un Pull Request de feature/readme-base hacia develop", "Abre el PR con base develop."),
        check(merged, "El Pull Request ya fue fusionado", "Fusiona el PR cuando pase la revisión.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 5:
      return result({
        mission,
        passed: branchExists(branches, "feature/documentacion-extra"),
        checks: [
          check(branchExists(branches, "feature/documentacion-extra"), "Existe la rama feature/documentacion-extra", "Crea y publica la rama feature/documentacion-extra.")
        ]
      });

    case 6: {
      const checks = [
        check(refName === "feature/documentacion-extra", "El avance ocurre en feature/documentacion-extra", "Haz commit y push desde feature/documentacion-extra."),
        check(readmeWasTouched(issue, payload), "README.md fue modificado después de abrir esta misión", "Publica un commit nuevo con mejoras de documentación."),
        ...validateSectionQuality(readme)
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 7: {
      const merged = await hasMergedPull(context, "feature/documentacion-extra", "develop");
      const currentPull = payload?.pull_request;
      const correctPull = currentPull?.head?.ref === "feature/documentacion-extra" && currentPull?.base?.ref === "develop";
      const checks = [
        check(merged || correctPull, "Existe un Pull Request de feature/documentacion-extra hacia develop", "Abre el PR con base develop."),
        check(merged, "El Pull Request ya fue fusionado", "Fusiona el PR cuando pase la revisión.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 8:
      return result({
        mission,
        passed: branchExists(branches, "release/v1.0.0"),
        checks: [
          check(branchExists(branches, "release/v1.0.0"), "Existe la rama release/v1.0.0", "Crea y publica la rama release/v1.0.0.")
        ]
      });

    case 9: {
      const checks = [
        check(refName === "release/v1.0.0", "El avance ocurre en release/v1.0.0", "Haz commit y push desde release/v1.0.0."),
        check(readmeWasTouched(issue, payload), "README.md fue ajustado después de abrir esta misión", "Publica un commit nuevo con los ajustes finales."),
        ...validateFinalReadme(readme)
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 10: {
      const merged = await hasMergedPull(context, "release/v1.0.0", "main");
      const currentPull = payload?.pull_request;
      const correctPull = currentPull?.head?.ref === "release/v1.0.0" && currentPull?.base?.ref === "main";
      const checks = [
        check(merged || correctPull, "Existe un Pull Request de release/v1.0.0 hacia main", "Abre el PR con base main."),
        check(merged, "El Pull Request de release ya fue fusionado", "Fusiona el PR cuando pase la validación.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 11: {
      const tagExists = git(["tag", "--list", "v1.0.0"], { allowFailure: true }) === "v1.0.0"
        || (payload?.ref_type === "tag" && payload?.ref === "v1.0.0");

      return result({
        mission,
        passed: tagExists,
        checks: [
          check(tagExists, "Existe el tag v1.0.0", "Crea y publica el tag v1.0.0.")
        ]
      });
    }

    case 12:
      return result({
        mission,
        passed: branchExists(branches, "hotfix/readme-typo"),
        checks: [
          check(branchExists(branches, "hotfix/readme-typo"), "Existe la rama hotfix/readme-typo", "Crea y publica la rama hotfix/readme-typo.")
        ]
      });

    case 13: {
      const touched = readmeWasTouched(issue, payload);
      const checks = [
        check(refName === "hotfix/readme-typo", "El avance ocurre en hotfix/readme-typo", "Haz commit y push desde hotfix/readme-typo."),
        check(touched, "README.md fue modificado después de abrir esta misión", "Corrige un detalle menor en README.md."),
        check(readmeDiffIsSmall(payload), "El cambio parece pequeño y propio de un hotfix", "Reduce el cambio: un hotfix debe ser puntual.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 14: {
      const mainMerged = await hasMergedPull(context, "hotfix/readme-typo", "main");
      const developMerged = await hasMergedPull(context, "hotfix/readme-typo", "develop");
      const checks = [
        check(mainMerged, "El hotfix fue fusionado hacia main", "Abre y fusiona el PR de hotfix/readme-typo hacia main."),
        check(developMerged, "El hotfix fue integrado hacia develop", "Abre y fusiona el PR de hotfix/readme-typo hacia develop.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    default:
      return result({
        mission,
        passed: false,
        checks: [
          check(false, "No hay una validación automática definida para esta misión", "Cierra la misión manualmente cuando tu docente lo indique.")
        ]
      });
  }
}

function feedbackMarker(missionId) {
  return `<!-- gitflow-practice:auto-feedback:mission=${missionId} -->`;
}

function formatChecks(checks) {
  return checks
    .map((item) => `${item.ok ? "- [x]" : "- [ ]"} ${item.text}${item.ok || !item.fix ? "" : `\n  Sugerencia: ${item.fix}`}`)
    .join("\n");
}

function formatFeedback(mission, validation, statusText) {
  return `## Seguimiento automático

**Estado:** ${statusText}

**Qué estás practicando:** ${mission.summary}

**Por qué importa:** ${mission.why}

### Revisión
${formatChecks(validation.checks)}

${validation.passed ? "La misión cumple los criterios automáticos. Se cerrará y se preparará la siguiente misión." : "Aún falta ajustar uno o más puntos. Cuando publiques nuevos cambios, esta revisión se actualizará."}`;
}

function annotateWarnings(mission, validation) {
  for (const item of validation.checks.filter((entry) => !entry.ok)) {
    const message = `${item.text}. ${item.fix}`.replace(/\r?\n/g, " ");
    console.log(`::warning title=Misión ${mission.id}::${message}`);
  }
}

function appendStepSummary(mission, validation) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  const lines = [
    `## Misión ${mission.id}: ${mission.title}`,
    "",
    validation.passed ? "Estado: completada automáticamente." : "Estado: requiere ajustes.",
    "",
    formatChecks(validation.checks),
    ""
  ];

  try {
    appendFileSync(summaryPath, `${lines.join("\n")}\n`);
  } catch {
    // El resumen es útil, pero no debe romper la validación.
  }
}

function missionIdFromIssue(issue) {
  return extractMissionId(`${issue.title || ""}\n${issue.body || ""}`);
}

function targetMissionIds(payload, openIssues) {
  if (eventName() === "workflow_dispatch") {
    return openIssues.map(missionIdFromIssue).filter(Boolean);
  }

  if (eventName() === "create") {
    if (payload?.ref_type === "branch") {
      const branchToMission = new Map([
        ["develop", 1],
        ["feature/readme-base", 2],
        ["feature/documentacion-extra", 5],
        ["release/v1.0.0", 8],
        ["hotfix/readme-typo", 12]
      ]);
      return branchToMission.has(payload.ref) ? [branchToMission.get(payload.ref)] : [];
    }

    if (payload?.ref_type === "tag" && payload?.ref === "v1.0.0") {
      return [11];
    }
  }

  if (eventName() === "push") {
    const branch = currentRefName(payload);
    const branchToMission = new Map([
      ["feature/readme-base", 3],
      ["feature/documentacion-extra", 6],
      ["release/v1.0.0", 9],
      ["hotfix/readme-typo", 13]
    ]);
    return branchToMission.has(branch) ? [branchToMission.get(branch)] : [];
  }

  if (eventName() === "pull_request") {
    const head = payload?.pull_request?.head?.ref;
    const base = payload?.pull_request?.base?.ref;

    if (head === "feature/readme-base" && base === "develop") {
      return [4];
    }
    if (head === "feature/documentacion-extra" && base === "develop") {
      return [7];
    }
    if (head === "release/v1.0.0" && base === "main") {
      return [10];
    }
    if (head === "hotfix/readme-typo" && ["main", "develop"].includes(base)) {
      return [14];
    }
  }

  return [];
}

async function createNextMissionIfNeeded(api, issues, completedMission) {
  const nextMission = getNextMission(completedMission.id);
  if (!nextMission) {
    return null;
  }

  const duplicate = findMissionIssue(issues, nextMission);
  if (duplicate) {
    if (duplicate.state === "closed") {
      const reopened = await reopenIssue(api, duplicate.number);
      console.log(`La siguiente misión ya existía cerrada. Se reabrió el issue #${duplicate.number}.`);
      return reopened;
    }

    return duplicate;
  }

  const created = await createMissionIssue(api, nextMission);
  issues.push(created);
  return created;
}

async function processMission(context, issue, mission) {
  const validation = await evaluateMission(mission, issue, context);
  const statusText = validation.passed ? "Completada" : "En progreso";

  appendStepSummary(mission, validation);

  await upsertIssueComment(
    context.api,
    issue.number,
    feedbackMarker(mission.id),
    formatFeedback(mission, validation, statusText)
  );

  if (!validation.passed) {
    annotateWarnings(mission, validation);
    return;
  }

  await closeIssue(context.api, issue.number);
  const nextIssue = await createNextMissionIfNeeded(context.api, context.issues, mission);

  if (nextIssue) {
    console.log(`Misión ${mission.id} cerrada. Siguiente issue: #${nextIssue.number}`);
  } else {
    console.log(`Misión ${mission.id} cerrada. No quedan más misiones.`);
  }
}

async function main() {
  const payload = readEventPayload();
  if (!payload) {
    console.log("No hay evento de GitHub Actions. No se valida progreso automático.");
    return;
  }

  const { owner, repo } = getRepositoryFromEnv();
  const api = new GitHubApi({ owner, repo, token: getTokenFromEnv() });
  const issues = await listAllIssues(api);
  const openMissionIssues = issues
    .filter((issue) => issue.state === "open")
    .filter((issue) => missionIdFromIssue(issue))
    .sort((a, b) => missionIdFromIssue(a) - missionIdFromIssue(b));

  const targets = new Set(targetMissionIds(payload, openMissionIssues));
  if (targets.size === 0) {
    console.log(`Evento ${eventName()} recibido, pero no corresponde a una misión automática.`);
    return;
  }

  const context = {
    api,
    payload,
    issues,
    branches: listBranches(),
    closedPulls: null
  };

  for (const issue of openMissionIssues) {
    const missionId = missionIdFromIssue(issue);
    if (!targets.has(missionId)) {
      continue;
    }

    const mission = getMissionById(missionId);
    if (!mission) {
      continue;
    }

    await processMission(context, issue, mission);
  }
}

main().catch((error) => {
  console.error("No se pudo validar el progreso de la práctica.");
  console.error(error.message);
  process.exit(1);
});
