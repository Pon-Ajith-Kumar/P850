import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_NOTES_DIR = path.resolve(process.cwd(), 'notes')
const ROOT_NOTES_DIR = process.env.P850_NOTES_ROOT
  ? path.resolve(process.env.P850_NOTES_ROOT)
  : DEFAULT_NOTES_DIR
const PUBLIC_NOTES_DIR = path.resolve(process.cwd(), 'public/notes')
const SUBJECTS_FILE = path.resolve(process.cwd(), 'src/data/subjects.json')
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg)$/i
const SUBJECT_DEFINITIONS = [
  { id: 'discrete-maths', name: 'Discrete Maths', shortName: 'DM' },
  { id: 'engineering-maths', name: 'Engineering Maths', shortName: 'EM' },
  { id: 'aptitude', name: 'Aptitude', shortName: 'APT' },
  { id: 'c-programming', name: 'C Programming', shortName: 'CP' },
  { id: 'data-structures', name: 'Data Structures', shortName: 'DS' },
  { id: 'algorithms', name: 'Algorithms', shortName: 'ALG' },
  { id: 'theory-of-computation', name: 'Theory Of Computation', shortName: 'TO' },
  { id: 'compiler-design', name: 'Compiler Design', shortName: 'CD' },
  { id: 'digital-logic', name: 'Digital Logic', shortName: 'DL' },
  { id: 'coa', name: 'COA', shortName: 'COA' },
  { id: 'operating-system', name: 'Operating System', shortName: 'OS' },
  { id: 'dbms', name: 'DBMS', shortName: 'DBM' },
  { id: 'computer-networks', name: 'Computer Networks', shortName: 'CN' },
]

const SUBJECT_ORDER = SUBJECT_DEFINITIONS.map((subject) => subject.name.toLowerCase())

export function normalizeFolderName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function sortSubjectFolders(folders) {
  return [...folders].sort((a, b) => {
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
}

function resolveNotesRoot() {
  const candidates = []

  if (process.env.P850_NOTES_ROOT) {
    candidates.push(path.resolve(process.env.P850_NOTES_ROOT))
  }

  candidates.push(DEFAULT_NOTES_DIR)

  const uniqueCandidates = [...new Set(candidates.map((candidate) => path.resolve(candidate)))]

  for (const candidate of uniqueCandidates) {
    if (fs.existsSync(candidate) && fs.readdirSync(candidate, { withFileTypes: true }).some((entry) => entry.isDirectory())) {
      return candidate
    }
  }

  return DEFAULT_NOTES_DIR
}

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

export function imageSortKey(fileName) {
  const cleanName = String(fileName).trim()
  const match = cleanName.match(/^(?:IMG_)?(\d{4})(\d{2})(\d{2})[_-]?(.*?)(\.[a-z0-9]+)$/i)
  if (!match) {
    return `${cleanName.toLowerCase()}-0`
  }

  const [, year, month, day, noteId, extension] = match
  const normalizedId = String(noteId || '0').toLowerCase().replace(/^_+|_+$/g, '')
  return `${year}-${month}-${day}-${normalizedId}${extension.toLowerCase()}`
}

function getImagesInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return []

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => imageSortKey(a).localeCompare(imageSortKey(b)))
}

function ensurePublicLinks(subjectFolders, notesRoot = ROOT_NOTES_DIR) {
  fs.mkdirSync(PUBLIC_NOTES_DIR, { recursive: true })

  // Build the set of links that should exist, keyed by slug, before touching anything
  // on disk. This lets us diff against what is already there instead of deleting every
  // link and recreating it on every run, which previously created a window where a
  // subject's images were briefly unreachable and, under concurrent regeneration
  // passes, could be left deleted rather than recreated.
  const desired = new Map()
  for (const folderName of subjectFolders) {
    const realDir = path.join(notesRoot, folderName)
    if (fs.existsSync(realDir)) {
      desired.set(slugify(folderName), realDir)
    }
  }

  let existingEntries = []
  try {
    existingEntries = fs.readdirSync(PUBLIC_NOTES_DIR, { withFileTypes: true })
  } catch (error) {
    console.error(`[generate-subjects] Could not read ${PUBLIC_NOTES_DIR}:`, error.message)
  }

  for (const entry of existingEntries) {
    if (entry.name === 'placeholders') continue
    const linkPath = path.join(PUBLIC_NOTES_DIR, entry.name)
    const realDir = desired.get(entry.name)

    let isCorrectLink = false
    if (realDir && entry.isSymbolicLink()) {
      try {
        isCorrectLink = fs.realpathSync(linkPath) === fs.realpathSync(realDir)
      } catch {
        isCorrectLink = false
      }
    }

    if (!isCorrectLink) {
      try {
        fs.rmSync(linkPath, { recursive: true, force: true })
      } catch (error) {
        console.error(`[generate-subjects] Could not remove stale link ${linkPath}:`, error.message)
      }
    }
  }

  for (const [slug, realDir] of desired) {
    const linkPath = path.join(PUBLIC_NOTES_DIR, slug)
    if (fs.existsSync(linkPath)) continue
    try {
      fs.symlinkSync(realDir, linkPath, 'dir')
    } catch (error) {
      console.error(`[generate-subjects] Could not link ${realDir} -> ${linkPath}:`, error.message)
    }
  }
}

function buildTopicsForSubject(subjectDir) {
  const topicItems = []
  const subjectSlug = slugify(path.basename(subjectDir))

  function visit(directory, relativeParts = []) {
    const images = getImagesInDir(directory)
    const title = relativeParts.length ? relativeParts.map(toTitle).join(' / ') : `${toTitle(path.basename(subjectDir))} Notes`

    if (images.length > 0) {
      topicItems.push({
        id: relativeParts.length ? `${subjectSlug}-${relativeParts.map(slugify).join('-')}` : `${subjectSlug}-notes`,
        name: relativeParts.length ? `${title} Notes` : title,
        description: `Revision notes for ${title.replace(/ Notes$/, '')}.`,
        images: images.map((file) => `/notes/${subjectSlug}/${[...relativeParts, file].map(encodeURIComponent).join('/')}`),
      })
    }

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        visit(path.join(directory, entry.name), [...relativeParts, entry.name])
      }
    }
  }

  visit(subjectDir)
  return topicItems.length > 0 ? topicItems : [{
    id: `${subjectSlug}-notes`,
    name: `${toTitle(path.basename(subjectDir))} Notes`,
    description: `Revision notes for ${toTitle(path.basename(subjectDir))}.`,
    images: [],
  }]
}

function buildSubjects() {
  const notesRoot = resolveNotesRoot()

  if (!fs.existsSync(notesRoot)) {
    // Even when the local notes directory is unavailable, keep the complete
    // canonical subject list so Subjects and Mistakes never depend on which
    // subjects currently have note images.
    return SUBJECT_DEFINITIONS.map((subject) => ({
      ...subject,
      description: `Revision notes for ${subject.name}.`,
      topics: [{
        id: `${subject.id}-notes`,
        name: `${subject.name} Notes`,
        description: `Revision notes for ${subject.name}.`,
        images: [],
      }],
    }))
  }

  const subjectFolders = fs
    .readdirSync(notesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  ensurePublicLinks(subjectFolders, notesRoot)

  const folderByNormalizedName = new Map(
    subjectFolders.map((folderName) => [normalizeFolderName(folderName), folderName]),
  )

  const canonicalSubjects = SUBJECT_DEFINITIONS.map((subject) => {
    const matchingFolder = folderByNormalizedName.get(normalizeFolderName(subject.name))
    const subjectDir = matchingFolder ? path.join(notesRoot, matchingFolder) : null
    const topics = subjectDir
      ? buildTopicsForSubject(subjectDir)
      : [{
          id: `${subject.id}-notes`,
          name: `${subject.name} Notes`,
          description: `Revision notes for ${subject.name}.`,
          images: [],
        }]

    return {
      ...subject,
      description: `Revision notes for ${subject.name}.`,
      topics,
    }
  })

  // Keep any additional note folders after the canonical GATE subjects instead
  // of silently dropping them. They never disturb the required subject order.
  const canonicalIds = new Set(SUBJECT_DEFINITIONS.map((subject) => subject.id))
  const extraSubjects = sortSubjectFolders(subjectFolders)
    .filter((folderName) => !canonicalIds.has(slugify(folderName)))
    .map((folderName) => {
      const subjectDir = path.join(notesRoot, folderName)
      return {
        id: slugify(folderName),
        name: toTitle(folderName),
        shortName: shortName(folderName),
        description: `Revision notes for ${toTitle(folderName)}.`,
        topics: buildTopicsForSubject(subjectDir),
      }
    })

  return [...canonicalSubjects, ...extraSubjects]
}

const payload = { subjects: buildSubjects() }
fs.mkdirSync(path.dirname(SUBJECTS_FILE), { recursive: true })
// Write to a temp file and rename over the target so a reader (Vite, or another
// regeneration pass) never sees a partially-written, invalid JSON file.
const temporarySubjectsFile = `${SUBJECTS_FILE}.tmp`
fs.writeFileSync(temporarySubjectsFile, `${JSON.stringify(payload, null, 2)}\n`)
fs.renameSync(temporarySubjectsFile, SUBJECTS_FILE)
