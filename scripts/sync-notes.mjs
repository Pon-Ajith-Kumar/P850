import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_SOURCE_ROOT = '/home/lenovo/Files/00) GATE CS Repo/00 GATE Revision Notes'
const LEGACY_ROOT_CANDIDATES = [
  '/home/lenovo/Files/00) GATE CS Repo',
  '/home/lenovo/Files/00) GATE CS Repo/00 GATE Revision Notes',
]
const DESTINATION_ROOT = path.join(PROJECT_ROOT, 'notes')
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])

function normalizeFolderName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function resolveSourceRoot() {
  const explicit = process.env.P850_SOURCE_NOTES ? path.resolve(process.env.P850_SOURCE_NOTES) : null
  const candidates = [explicit, DEFAULT_SOURCE_ROOT, ...LEGACY_ROOT_CANDIDATES].filter(Boolean)

  for (const candidate of [...new Set(candidates)]) {
    if (!candidate || !fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) continue

    const firstLevelFolders = fs.readdirSync(candidate, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    if (firstLevelFolders.length === 0) continue

    const hasSubjectLikeFolder = firstLevelFolders.some((folderName) => {
      const lowered = normalizeFolderName(folderName)
      return lowered.includes('aptitude')
        || lowered.includes('algorithms')
        || lowered.includes('data structures')
        || lowered.includes('engineering maths')
        || lowered.includes('operating system')
        || lowered.includes('c programming')
        || lowered.includes('dbms')
        || lowered.includes('compiler design')
        || lowered.includes('digital logic')
        || lowered.includes('theory of computation')
        || lowered.includes('computer networks')
        || lowered.includes('coa')
        || lowered.includes('discrete maths')
    })

    if (hasSubjectLikeFolder || candidate === DEFAULT_SOURCE_ROOT) {
      return candidate
    }
  }

  return DEFAULT_SOURCE_ROOT
}

function walkImages(directory, relative = '') {
  const images = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    const relativePath = path.join(relative, entry.name)
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) images.push(...walkImages(absolutePath, relativePath))
    else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) images.push(relativePath)
  }
  return images
}

function walkDirectories(directory, relative = '') {
  const directories = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    const relativePath = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      directories.push(relativePath)
      directories.push(...walkDirectories(path.join(directory, entry.name), relativePath))
    }
  }
  return directories
}

const SOURCE_ROOT = resolveSourceRoot()

if (!fs.existsSync(SOURCE_ROOT) || !fs.statSync(SOURCE_ROOT).isDirectory()) {
  console.error(`Notes source folder not found: ${SOURCE_ROOT}`)
  console.error('Set P850_SOURCE_NOTES to your source folder if it is mounted at a different path.')
  process.exit(1)
}

fs.mkdirSync(DESTINATION_ROOT, { recursive: true })

const files = walkImages(SOURCE_ROOT)
if (files.length === 0) {
  console.error(`No note images found under: ${SOURCE_ROOT}`)
  process.exit(1)
}

let added = 0
let replaced = 0
let unchanged = 0

for (const relativePath of files) {
  const source = path.join(SOURCE_ROOT, relativePath)
  const destination = path.join(DESTINATION_ROOT, relativePath)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  if (fs.existsSync(destination)) {
    const sourceStat = fs.statSync(source)
    const destinationStat = fs.statSync(destination)
    if (sourceStat.size === destinationStat.size && fs.readFileSync(source).equals(fs.readFileSync(destination))) {
      unchanged += 1
      continue
    }
    fs.copyFileSync(source, destination)
    replaced += 1
  } else {
    fs.copyFileSync(source, destination)
    added += 1
  }
}

const sourceFiles = new Set(files.map((relativePath) => relativePath.replace(/\\/g, '/')))
const sourceDirectories = new Set(walkDirectories(SOURCE_ROOT).map((relativePath) => relativePath.replace(/\\/g, '/')))
const destinationFiles = new Set(walkImages(DESTINATION_ROOT).map((relativePath) => relativePath.replace(/\\/g, '/')))
const destinationDirectories = new Set(walkDirectories(DESTINATION_ROOT).map((relativePath) => relativePath.replace(/\\/g, '/')))

let removed = 0
for (const relativePath of [...destinationFiles]) {
  if (!sourceFiles.has(relativePath)) {
    fs.rmSync(path.join(DESTINATION_ROOT, relativePath), { force: true })
    removed += 1
  }
}

for (const relativePath of [...destinationDirectories]) {
  if (!sourceDirectories.has(relativePath)) {
    fs.rmSync(path.join(DESTINATION_ROOT, relativePath), { recursive: true, force: true })
    removed += 1
  }
}

console.log(`Synced ${files.length} image(s) from ${SOURCE_ROOT} into notes/.`)
console.log(`Added: ${added}; replaced: ${replaced}; unchanged: ${unchanged}; removed: ${removed}.`)
