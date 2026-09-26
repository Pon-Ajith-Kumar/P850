import fs from 'node:fs'
import path from 'node:path'

const ROOT_NOTES_DIR = '/home/lenovo/Files/00) GATE CS Repo/00 GATE Revision Notes'
const PUBLIC_NOTES_DIR = path.resolve(process.cwd(), 'public/notes')
const SUBJECTS_FILE = path.resolve(process.cwd(), 'src/data/subjects.json')
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg)$/i
const SUBJECT_ORDER = [
  'discrete maths',
  'engineering maths',
  'aptitude',
  'c programming',
  'data structures',
  'algorithms',
  'theory of computation',
  'compiler design',
  'digital logic',
  'coa',
  'operating system',
  'dbms',
  'computer networks',
]

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'subject'
}

function toTitle(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Subject'
}

function shortName(value) {
  const words = String(value)
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'SUB'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('').slice(0, 3)
}

function imageSortKey(fileName) {
  const match = String(fileName).match(/^IMG_(\d{4})(\d{2})(\d{2})_(.+?)(\.[a-z0-9]+)$/i)
  if (!match) {
    return `${String(fileName).toLowerCase()}-0`
  }

  return `${match[1]}-${match[2]}-${match[3]}-${match[4]}`
}

function getImagesInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return []

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => imageSortKey(a).localeCompare(imageSortKey(b)))
}

function ensurePublicLinks(subjectFolders) {
  fs.mkdirSync(PUBLIC_NOTES_DIR, { recursive: true })

  for (const entry of fs.readdirSync(PUBLIC_NOTES_DIR, { withFileTypes: true })) {
    if (entry.name === 'placeholders') continue
    const target = path.join(PUBLIC_NOTES_DIR, entry.name)
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      fs.rmSync(target, { recursive: true, force: true })
    }
  }

  for (const folderName of subjectFolders) {
    const realDir = path.join(ROOT_NOTES_DIR, folderName)
    const linkPath = path.join(PUBLIC_NOTES_DIR, slugify(folderName))
    if (fs.existsSync(realDir)) {
      if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { recursive: true, force: true })
      fs.symlinkSync(realDir, linkPath, 'dir')
    }
  }
}

function buildTopicsForSubject(subjectDir) {
  const entries = fs.readdirSync(subjectDir, { withFileTypes: true })
  const topicItems = []
  const directImages = getImagesInDir(subjectDir)

  if (directImages.length > 0) {
    const folderSlug = slugify(path.basename(subjectDir))
    topicItems.push({
      id: `${folderSlug}-notes`,
      name: `${toTitle(path.basename(subjectDir))} Notes`,
      description: `Revision notes for ${toTitle(path.basename(subjectDir))}.`,
      images: directImages.map((file) => `/notes/${folderSlug}/${encodeURIComponent(file)}`),
    })
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const subDir = path.join(subjectDir, entry.name)
    const subImages = getImagesInDir(subDir)
    if (subImages.length === 0) continue

    const topicId = `${slugify(path.basename(subjectDir))}-${slugify(entry.name)}`
    topicItems.push({
      id: topicId,
      name: `${toTitle(entry.name)} Notes`,
      description: `Revision notes for ${toTitle(entry.name)}.`,
      images: subImages.map((file) => `/notes/${slugify(path.basename(subjectDir))}/${encodeURIComponent(entry.name)}/${encodeURIComponent(file)}`),
    })
  }

  return topicItems.length > 0 ? topicItems : [{
    id: `${slugify(path.basename(subjectDir))}-notes`,
    name: `${toTitle(path.basename(subjectDir))} Notes`,
    description: `Revision notes for ${toTitle(path.basename(subjectDir))}.`,
    images: [],
  }]
}

function normalizeFolderName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function buildSubjects() {
  if (!fs.existsSync(ROOT_NOTES_DIR)) {
    return []
  }

  const subjectFolders = fs
    .readdirSync(ROOT_NOTES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  const orderedFolders = [...subjectFolders].sort((a, b) => {
    const aKey = normalizeFolderName(a)
    const bKey = normalizeFolderName(b)
    const aIndex = SUBJECT_ORDER.indexOf(aKey)
    const bIndex = SUBJECT_ORDER.indexOf(bKey)

    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    }

    return aKey.localeCompare(bKey)
  })

  ensurePublicLinks(orderedFolders)

  return orderedFolders.map((folderName) => {
    const subjectDir = path.join(ROOT_NOTES_DIR, folderName)
    const topics = buildTopicsForSubject(subjectDir)

    return {
      id: slugify(folderName),
      name: toTitle(folderName),
      shortName: shortName(folderName),
      description: `Revision notes for ${toTitle(folderName)}.`,
      topics,
    }
  })
}

const payload = { subjects: buildSubjects() }
fs.mkdirSync(path.dirname(SUBJECTS_FILE), { recursive: true })
fs.writeFileSync(SUBJECTS_FILE, `${JSON.stringify(payload, null, 2)}\n`)
