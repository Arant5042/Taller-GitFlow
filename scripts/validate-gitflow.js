import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const requiredPrefixes = ["feature/", "release/", "hotfix/"];
const strictFinalValidation = process.env.GITFLOW_STRICT_FINAL !== "false";

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

function readGitHubEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(eventPath, "utf8"));
  } catch {
    return null;
  }
}

function ensureGitRepository() {
  const insideWorkTree = git(["rev-parse", "--is-inside-work-tree"], { allowFailure: true });
  if (insideWorkTree !== "true") {
    throw new Error("Este script debe ejecutarse dentro de un repositorio Git.");
  }
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

function hasPrefixEvidence(branches, prefix, historyText) {
  return branches.some((branch) => branch.startsWith(prefix) || branch.startsWith(`origin/${prefix}`))
    || historyText.includes(prefix);
}

function validatePullRequestShape(event, failures) {
  const pullRequest = event?.pull_request;
  if (!pullRequest) {
    return;
  }

  const base = pullRequest.base?.ref;
  const head = pullRequest.head?.ref;
  console.log(`Pull Request detectado: ${head} -> ${base}`);

  if (base === "develop" && !/^(feature|hotfix|release)\//.test(head)) {
    failures.push("Los Pull Requests hacia develop deben venir desde feature/, hotfix/ o release/.");
  }

  if (base === "main" && !/^(release|hotfix)\//.test(head)) {
    failures.push("Los Pull Requests hacia main deben venir desde release/ o hotfix/.");
  }
}

function validateDirectMainPush(event, failures) {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const ref = process.env.GITHUB_REF || "";
  const refName = process.env.GITHUB_REF_NAME || "";

  if (eventName !== "push" || (ref !== "refs/heads/main" && refName !== "main")) {
    return;
  }

  const commits = event?.commits || [];
  const changedFiles = new Set();
  const mergeLike = commits.some((commit) => /merge pull request|merge branch|release\/|hotfix\//i.test(commit.message || ""));

  for (const commit of commits) {
    for (const file of [...(commit.added || []), ...(commit.modified || []), ...(commit.removed || [])]) {
      changedFiles.add(file);
    }
  }

  if (!mergeLike && changedFiles.size >= Number(process.env.GITFLOW_MAIN_CHANGE_LIMIT || "2")) {
    failures.push("Se detectó un push directo a main con varios archivos modificados. Usa ramas release/ o hotfix/ y Pull Requests.");
  } else if (!mergeLike && changedFiles.size > 0) {
    console.warn("[AVISO] Se detectó un cambio directo pequeño en main. Evítalo salvo indicación del docente.");
  }
}

function main() {
  const failures = [];
  const warnings = [];

  ensureGitRepository();

  const branches = listBranches();
  const historyText = git(["log", "--all", "--decorate", "--pretty=%D%n%s", "-n", "500"], { allowFailure: true });
  const event = readGitHubEvent();

  console.log("Ramas detectadas:");
  for (const branch of branches) {
    console.log(`- ${branch}`);
  }

  if (branchExists(branches, "develop")) {
    console.log("[OK] Existe la rama develop.");
  } else {
    failures.push("No se encontró la rama develop. Crea y publica develop antes de continuar.");
  }

  for (const prefix of requiredPrefixes) {
    if (hasPrefixEvidence(branches, prefix, historyText)) {
      console.log(`[OK] Hay evidencia de ramas con prefijo ${prefix}.`);
    } else if (strictFinalValidation) {
      failures.push(`No se encontró evidencia de ramas con prefijo ${prefix}.`);
    } else {
      warnings.push(`Aún no hay evidencia de ramas con prefijo ${prefix}. Esto puede ser normal en etapas tempranas.`);
    }
  }

  validatePullRequestShape(event, failures);
  validateDirectMainPush(event, failures);

  for (const warning of warnings) {
    console.warn(`[AVISO] ${warning}`);
  }

  if (failures.length > 0) {
    console.error("");
    console.error("La validación de Git Flow encontró problemas:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    console.error("");
    console.error("Revisa tus ramas, Pull Requests y tags antes de entregar la práctica.");
    process.exit(1);
  }

  console.log("");
  console.log(strictFinalValidation
    ? "Git Flow validado correctamente en modo final."
    : "Git Flow validado correctamente en modo progresivo.");
}

try {
  main();
} catch (error) {
  console.error("[ERROR] No se pudo validar Git Flow.");
  console.error(error.message);
  process.exit(1);
}
