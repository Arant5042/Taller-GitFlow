import { readFileSync } from "node:fs";

const requiredSections = [
  { level: 1, text: "Nombre del Proyecto" },
  { level: 2, text: "Descripción" },
  { level: 2, text: "Instalación" },
  { level: 2, text: "Uso" },
  { level: 2, text: "Autores" },
  { level: 2, text: "Flujo de trabajo Git" },
  { level: 2, text: "Evidencias" }
];

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

function main() {
  let readme;

  try {
    readme = readFileSync("README.md", "utf8");
  } catch (error) {
    console.error("[ERROR] No se encontró README.md en la raíz del repositorio.");
    console.error(error.message);
    process.exit(1);
  }

  const markdown = stripFencedCodeBlocks(readme);
  const missing = requiredSections.filter((section) => !hasHeading(markdown, section));

  for (const section of requiredSections) {
    const marker = `${"#".repeat(section.level)} ${section.text}`;
    if (missing.includes(section)) {
      console.error(`[FALTA] ${marker}`);
    } else {
      console.log(`[OK] ${marker}`);
    }
  }

  if (missing.length > 0) {
    console.error("");
    console.error("El README no cumple la estructura minima solicitada.");
    console.error("Agrega las secciones faltantes como encabezados reales del documento.");
    process.exit(1);
  }

  console.log("");
  console.log("README validado correctamente.");
}

main();
