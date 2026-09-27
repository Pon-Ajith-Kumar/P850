import test from 'node:test'
import assert from 'node:assert/strict'
import { sortSubjectFolders, imageSortKey } from './generate-subjects.mjs'

test('sortSubjectFolders keeps the canonical Gate subject order', () => {
  const ordered = sortSubjectFolders([
    'Operating System',
    'C Programming',
    'Algorithms',
    'Discrete Maths',
    'DBMS',
    'Random Subject',
  ])

  assert.deepEqual(ordered, [
    'Discrete Maths',
    'C Programming',
    'Algorithms',
    'Operating System',
    'DBMS',
    'Random Subject',
  ])
})

test('imageSortKey orders note filenames by date and id', () => {
  const items = [
    '20250312_abc999.jpg',
    '20250201_xyz001.jpg',
    '20250201_xyz002.jpg',
    'IMG_20250201_123456.jpg',
  ]

  const sorted = [...items].sort((a, b) => imageSortKey(a).localeCompare(imageSortKey(b)))

  assert.deepEqual(sorted, [
    'IMG_20250201_123456.jpg',
    '20250201_xyz001.jpg',
    '20250201_xyz002.jpg',
    '20250312_abc999.jpg',
  ])
})
