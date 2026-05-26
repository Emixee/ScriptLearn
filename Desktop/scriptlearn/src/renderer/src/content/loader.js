// Eager-load all module JSON files from all language subdirectories
const moduleFiles = import.meta.glob('./{bash,powershell,python,kql,sql,regex,git,spl,yaml}/**/*.json', { eager: true })

const MODULE_MAP = {}
for (const path in moduleFiles) {
  const mod = moduleFiles[path].default ?? moduleFiles[path]
  if (mod?.id) MODULE_MAP[mod.id] = mod
}

export function getModule(id) {
  return MODULE_MAP[id] ?? null
}
