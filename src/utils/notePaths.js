const DEFAULT_NOTES_ROOT = (import.meta.env.VITE_NOTES_ROOT || '/notes').replace(/\/+$/, '')

export function imageSortKey(image) {
  if (typeof image !== 'string') {
    return ''
  }

  const fileName = image.split('/').pop() ?? ''
  const match = fileName.match(/^IMG_(\d{4})(\d{2})(\d{2})_(.+?)(\.[a-z0-9]+)$/i)

  if (!match) {
    return ''
  }

  return `${match[1]}-${match[2]}-${match[3]}-${match[4]}`
}

export function sortNoteImages(images = []) {
  return [...images].sort((a, b) => {
    const aKey = imageSortKey(a)
    const bKey = imageSortKey(b)

    if (!aKey && !bKey) {
      return String(a).localeCompare(String(b))
    }

    if (!aKey) {
      return 1
    }

    if (!bKey) {
      return -1
    }

    return aKey.localeCompare(bKey)
  })
}

export function resolveNoteFolderPath(folderName) {
  if (!folderName) {
    return DEFAULT_NOTES_ROOT
  }

  const cleanFolder = String(folderName).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')

  return cleanFolder ? `${DEFAULT_NOTES_ROOT}/${cleanFolder}` : DEFAULT_NOTES_ROOT
}

export function toNoteUrl(imagePath, folderName) {
  if (!imagePath) {
    return ''
  }

  if (/^(https?:)?\/\//i.test(imagePath)) {
    return imagePath
  }

  const cleanImagePath = String(imagePath).replace(/\\/g, '/').replace(/^\/+/, '')
  const basePath = resolveNoteFolderPath(folderName)

  return `${basePath}/${cleanImagePath}`
}
