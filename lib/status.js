// The state words, defined once (DESIGN.md 3.1). Every page imports these.
export const STATES = {
  up: { word: "Up", role: "success", means: "The live site answered" },
  down: { word: "Down", role: "failure", means: "The live site did not answer, or answered with an error" },
  none: { word: "No site", role: "neutral", means: "No live deployment is known" },
  archived: { word: "Archived", role: "inactive", means: "The repository is archived on GitHub" },
}

// Precedence: inactive > warning > failure > success > progress > neutral
const ORDER = ["archived", "down", "up", "none"]

export const stateOf = (project) => {
  const candidates = []
  if (project.archived) candidates.push("archived")
  candidates.push(project.health?.state ?? "none")
  return ORDER.find((key) => candidates.includes(key)) ?? "none"
}

// An archived project keeps its outcome as data-outcome (DESIGN.md 3.1 rule 3)
export const outcomeOf = (project) => {
  const health = project.health?.state
  if (!project.archived) return null
  if (health === "up") return "success"
  if (health === "down") return "failure"
  return null
}

export const wordFor = (project) => {
  const key = stateOf(project)
  if (key === "archived" && project.health?.state && project.health.state !== "none") {
    return `${STATES.archived.word} · ${STATES[project.health.state].word}`
  }
  return STATES[key].word
}
