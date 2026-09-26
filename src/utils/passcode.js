export async function verifyPasscode(input) {
  const candidate = String(input || '').trim()

  if (!candidate) {
    return false
  }

  try {
    const response = await fetch('/api/access/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: candidate }),
      cache: 'no-store',
    })

    if (!response.ok) {
      return false
    }

    const payload = await response.json()
    return Boolean(payload?.valid)
  } catch {
    return false
  }
}
