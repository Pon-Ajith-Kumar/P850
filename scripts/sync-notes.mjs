import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUBJECT_FOLDER_NAMES = [
  'Discrete Maths',
  'Engineering Maths',
  'Aptitude',
  'C Programming',
  'Data Structures',
  'Algorithms',
  'Theory of Computation',
  'Compiler Design',
  'Digital Logic',
  'COA',
  'Operating System',
  'DBMS',
  'Computer Networks',
]

function normalizeFolderName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function resolveSourceRoot() {
  const candidates = []

  if (process.env.P850_SOURCE_NOTES) {
    candidates.push(path.resolve(process.env.P850_SOURCE_NOTES))
  }

  const fixedRoot = '/home/lenovo/Files/00) GATE CS Repo'
  const legacyRoot = path.join(fixedRoot, '00 GATE Revision Notes')

  candidates.push(fixedRoot, legacyRoot)

  for (const candidate of [...new Set(candidates)]) {
    if (!candidate || !fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) continue

    const directFolderNames = fs.readdirSync(candidate, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    const hasCanonicalSubjectFolder = directFolderNames.some((folderName) => SUBJECT_FOLDER_NAMES.some((subjectName) => normalizeFolderName(subjectName) === normalizeFolderName(folderName)))
    if (hasCanonicalSubjectFolder || candidate === legacyRoot) {
      return candidate
    }
  }

  return fixedRoot
}

const SOURCE_ROOT = resolveSourceRoot()
const DESTINATION_ROOT = path.join(PROJECT_ROOT, 'notes')
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])

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

if (!fs.existsSync(SOURCE_ROOT) || !fs.statSync(SOURCE_ROOT).isDirectory()) {
  console.error(`Notes source folder not found: ${SOURCE_ROOT}`)
  console.error('Set P850_SOURCE_NOTES to your source folder if it is mounted at a different path.')
  process.exit(1)
}

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
console.log(`Synced ${files.length} image(s) from ${SOURCE_ROOT} into notes/.`)
console.log(`Added: ${added}; replaced: ${replaced}; unchanged: ${unchanged}; removed: 0.`)
console.log('Existing repository files absent from the source are intentionally kept.')
