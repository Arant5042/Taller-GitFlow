export const PRACTICE_MARKER = "gitflow-practice";

export const missions = [
  {
    id: 1,
    title: "Crear rama develop",
    summary: "Crearás la rama de integración donde se acumulan los cambios antes de preparar una versión.",
    why: "En Git Flow, `develop` protege a `main` y permite integrar trabajo en curso sin afectar la versión estable.",
    body: `## Objetivo
Crear la rama principal de integración llamada \`develop\`.

## Pasos sugeridos
- Sincroniza tu fork con \`main\`.
- Crea la rama con \`git checkout -b develop\`.
- Publica la rama con \`git push -u origin develop\`.

## Criterio de cierre
Cierra este issue cuando la rama \`develop\` exista en GitHub.

## Evidencia sugerida
Incluye una captura o enlace donde se vea la rama \`develop\`.`
  },
  {
    id: 2,
    title: "Crear rama feature/readme-base",
    summary: "Crearás una rama de feature para trabajar el README sin tocar directamente `develop`.",
    why: "Las ramas `feature/` aíslan cambios pequeños y facilitan revisarlos mediante Pull Requests.",
    body: `## Objetivo
Crear una rama de trabajo para iniciar el README del proyecto.

## Pasos sugeridos
- Cambia a \`develop\`.
- Actualiza la rama con \`git pull origin develop\`.
- Crea \`feature/readme-base\` con \`git checkout -b feature/readme-base\`.
- Publica la rama con \`git push -u origin feature/readme-base\`.

## Criterio de cierre
Cierra este issue cuando la rama \`feature/readme-base\` exista en GitHub.`
  },
  {
    id: 3,
    title: "Completar estructura básica del README",
    summary: "Agregarás la estructura mínima del README que documentará el proyecto durante la práctica.",
    why: "Un README bien organizado deja evidencia del trabajo y ayuda a que otras personas entiendan el repositorio.",
    body: `## Objetivo
Crear la estructura inicial del README del proyecto del estudiante.

## Pasos sugeridos
- Edita \`README.md\` desde la rama \`feature/readme-base\`.
- Agrega estas secciones como encabezados reales, no dentro de bloques de código:
  - \`# Nombre del Proyecto\`
  - \`## Descripción\`
  - \`## Instalación\`
  - \`## Uso\`
  - \`## Autores\`
  - \`## Flujo de trabajo Git\`
  - \`## Evidencias\`
- Puedes dejar texto breve o pendiente en algunas secciones; se completarán más adelante.
- Haz commit y push de tus cambios.

## Criterio de cierre
Cierra este issue cuando el README tenga todas las secciones requeridas.`
  },
  {
    id: 4,
    title: "Crear Pull Request de feature/readme-base hacia develop",
    summary: "Abrirás y fusionarás un Pull Request para integrar el README base en `develop`.",
    why: "El Pull Request deja trazabilidad, permite revisión y evita integrar cambios sin una conversación mínima.",
    body: `## Objetivo
Integrar la primera versión del README a \`develop\` usando un Pull Request.

## Pasos sugeridos
- Abre un Pull Request desde \`feature/readme-base\` hacia \`develop\`.
- En la descripción del Pull Request puedes escribir \`Closes #NUMERO_DEL_ISSUE\` usando el número de este issue.
- Revisa que el workflow de README pase correctamente.
- Solicita revisión si tu docente lo requiere.
- Fusiona el Pull Request cuando esté listo.

## Criterio de cierre
El workflow de progreso cerrará este issue cuando detecte el Pull Request fusionado hacia \`develop\`.`
  },
  {
    id: 5,
    title: "Crear rama feature/documentacion-extra",
    summary: "Crearás una segunda rama de feature para ampliar la documentación del proyecto.",
    why: "Separar mejoras en ramas pequeñas hace más claro qué cambia y por qué se integra.",
    body: `## Objetivo
Crear una segunda rama de feature para mejorar la documentación.

## Pasos sugeridos
- Cambia a \`develop\`.
- Actualiza la rama con \`git pull origin develop\`.
- Crea \`feature/documentacion-extra\`.
- Publica la rama en GitHub.

## Criterio de cierre
Cierra este issue cuando la rama \`feature/documentacion-extra\` exista en GitHub.`
  },
  {
    id: 6,
    title: "Mejorar README con instalación, uso y autores",
    summary: "Completarás secciones prácticas del README para que el proyecto sea entendible y ejecutable.",
    why: "La documentación útil no solo enumera títulos: guía instalación, uso y responsabilidades del equipo.",
    body: `## Objetivo
Completar el README para que una persona externa pueda entender y ejecutar el proyecto.

## Pasos sugeridos
- Trabaja en \`feature/documentacion-extra\`.
- Completa especialmente las secciones \`Instalación\`, \`Uso\` y \`Autores\`.
- Agrega comandos reales o ejemplos claros.
- Haz commit y push.

## Criterio de cierre
Cierra este issue cuando el README tenga contenido suficiente en las secciones solicitadas.`
  },
  {
    id: 7,
    title: "Crear Pull Request hacia develop",
    summary: "Integrarás la documentación extra a `develop` por medio de un Pull Request.",
    why: "La integración mediante PR permite verificar que la mejora documental no rompa reglas del repositorio.",
    body: `## Objetivo
Integrar la documentación extra a la rama \`develop\`.

## Pasos sugeridos
- Abre un Pull Request desde \`feature/documentacion-extra\` hacia \`develop\`.
- Puedes usar \`Closes #NUMERO_DEL_ISSUE\` en la descripción del Pull Request.
- Espera que pasen las validaciones.
- Fusiona el Pull Request cuando esté aprobado.

## Criterio de cierre
El workflow de progreso cerrará este issue cuando detecte el Pull Request fusionado hacia \`develop\`.`
  },
  {
    id: 8,
    title: "Crear rama release/v1.0.0",
    summary: "Crearás una rama de release para preparar la primera versión estable.",
    why: "Una rama `release/` congela la versión candidata y permite ajustes finales antes de llegar a `main`.",
    body: `## Objetivo
Preparar una rama de release para la primera versión estable.

## Pasos sugeridos
- Cambia a \`develop\`.
- Verifica que \`develop\` tenga los últimos cambios.
- Crea \`release/v1.0.0\`.
- Publica la rama en GitHub.

## Criterio de cierre
Cierra este issue cuando la rama \`release/v1.0.0\` exista en GitHub.`
  },
  {
    id: 9,
    title: "Ajustar README final para release",
    summary: "Revisarás el README final antes de llevar la versión candidata a `main`.",
    why: "La release debe salir con documentación consistente, evidencias y una explicación clara del flujo usado.",
    body: `## Objetivo
Hacer una revisión final del README antes de liberar la versión 1.0.0.

## Pasos sugeridos
- Trabaja en \`release/v1.0.0\`.
- Revisa ortografía, claridad y consistencia.
- Agrega en \`Evidencias\` los enlaces o capturas relevantes de la práctica.
- Ejecuta manualmente el workflow de validación de README si lo necesitas.
- Haz commit y push.

## Criterio de cierre
Cierra este issue cuando el README esté listo para ser integrado a \`main\`.`
  },
  {
    id: 10,
    title: "Crear Pull Request de release/v1.0.0 hacia main",
    summary: "Fusionarás la rama de release hacia `main` para publicar la versión estable.",
    why: "`main` representa el estado listo para entregar; por eso solo debe recibir releases o hotfixes controlados.",
    body: `## Objetivo
Integrar la versión candidata a la rama principal \`main\`.

## Pasos sugeridos
- Abre un Pull Request desde \`release/v1.0.0\` hacia \`main\`.
- Usa \`Closes #NUMERO_DEL_ISSUE\` en la descripción del Pull Request.
- Verifica que los workflows pasen.
- Fusiona el Pull Request cuando esté aprobado.

## Criterio de cierre
Este issue debe cerrarse al fusionar el Pull Request.`
  },
  {
    id: 11,
    title: "Crear tag v1.0.0",
    summary: "Crearás un tag para identificar exactamente el commit de la versión 1.0.0.",
    why: "Los tags permiten ubicar y auditar versiones publicadas sin depender solo del historial de commits.",
    body: `## Objetivo
Marcar la primera versión estable del proyecto con un tag.

## Pasos sugeridos
- Cambia a \`main\`.
- Actualiza con \`git pull origin main\`.
- Crea el tag con \`git tag v1.0.0\`.
- Publica el tag con \`git push origin v1.0.0\`.

## Criterio de cierre
Cierra este issue cuando el tag \`v1.0.0\` exista en GitHub.`
  },
  {
    id: 12,
    title: "Crear rama hotfix/readme-typo",
    summary: "Crearás una rama de hotfix desde `main` para simular una corrección urgente.",
    why: "Los hotfixes permiten corregir producción sin esperar el ciclo normal de features y releases.",
    body: `## Objetivo
Simular una corrección urgente sobre la versión publicada.

## Pasos sugeridos
- Cambia a \`main\`.
- Actualiza con \`git pull origin main\`.
- Crea \`hotfix/readme-typo\`.
- Publica la rama en GitHub.

## Criterio de cierre
Cierra este issue cuando la rama \`hotfix/readme-typo\` exista en GitHub.`
  },
  {
    id: 13,
    title: "Corregir un error menor del README",
    summary: "Harás una corrección pequeña y controlada en el README desde la rama de hotfix.",
    why: "Un hotfix debe ser puntual; si crece demasiado, deja de ser una corrección urgente y se vuelve otro tipo de cambio.",
    body: `## Objetivo
Aplicar una corrección pequeña en el README desde una rama de hotfix.

## Pasos sugeridos
- Trabaja en \`hotfix/readme-typo\`.
- Corrige una falta de ortografía, una palabra repetida o un detalle menor.
- Haz commit y push.

## Criterio de cierre
Cierra este issue cuando la corrección esté publicada en la rama de hotfix.`
  },
  {
    id: 14,
    title: "Hacer Pull Request del hotfix hacia main y develop",
    summary: "Integrarás el hotfix en `main` y también en `develop` para mantener ambas líneas sincronizadas.",
    why: "Si el hotfix solo queda en `main`, el error puede reaparecer cuando `develop` vuelva a integrarse.",
    body: `## Objetivo
Integrar el hotfix en \`main\` y también en \`develop\` para que ambas ramas queden consistentes.

## Pasos sugeridos
- Abre un Pull Request desde \`hotfix/readme-typo\` hacia \`main\`.
- Fusiona el Pull Request cuando pase la validación.
- Abre un segundo Pull Request desde \`hotfix/readme-typo\` hacia \`develop\`, o sincroniza \`develop\` según indique tu docente.
- Usa \`Closes #NUMERO_DEL_ISSUE\` en el segundo Pull Request, o cierra manualmente este issue solo cuando ambos destinos estén actualizados.

## Criterio de cierre
Este es el último issue de la práctica. Al cerrarlo, revisa que tus evidencias estén completas.`
  }
];

export function missionNumber(id) {
  return String(id).padStart(2, "0");
}

export function missionMarker(id) {
  return `<!-- ${PRACTICE_MARKER}:mission=${id} -->`;
}

export function missionIssueTitle(mission) {
  return `[Misión ${missionNumber(mission.id)}] ${mission.title}`;
}

export function missionIssueBody(mission) {
  return `${missionMarker(mission.id)}

## Resumen rápido
- **Qué harás:** ${mission.summary}
- **Por qué importa:** ${mission.why}

${mission.body}

## Seguimiento automático
Cuando avances en esta misión, el workflow **Validar progreso de misiones** intentará revisar la evidencia. Si cumple los criterios verificables, comentará el resultado, cerrará este issue y creará la siguiente misión. Si no cumple todavía, dejará una checklist breve con lo que falta.

---
Práctica guiada de Git Flow. Identificador interno: misión ${mission.id}.`;
}

export function getMissionById(id) {
  return missions.find((mission) => mission.id === Number(id));
}

export function getNextMission(id) {
  return getMissionById(Number(id) + 1);
}

export function extractMissionId(text = "") {
  const markerMatch = text.match(/gitflow-practice:mission=(\d+)/i);
  if (markerMatch) {
    return Number(markerMatch[1]);
  }

  const titleMatch = text.match(/\[?Misi[oó]n\s+0?(\d+)\]?/i);
  if (titleMatch) {
    return Number(titleMatch[1]);
  }

  return null;
}
