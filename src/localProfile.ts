const profileKey = 'sur-local-profile'
const appKeys = ['sur-practice-stats', 'sur-exam', 'sur-syllabus-topics']
const iterations = 150_000

export type LocalProfile = {
  name: string
  salt: string
  pinHash: string
}

export function readLocalProfile(): LocalProfile | null {
  const saved = localStorage.getItem(profileKey)
  if (!saved) return null

  const profile: unknown = JSON.parse(saved)
  if (
    typeof profile !== 'object' ||
    profile === null ||
    !('name' in profile) ||
    typeof profile.name !== 'string' ||
    !('salt' in profile) ||
    typeof profile.salt !== 'string' ||
    !('pinHash' in profile) ||
    typeof profile.pinHash !== 'string'
  ) {
    throw new Error('The saved profile could not be read. Reset this device to create a new profile.')
  }
  return { name: profile.name, salt: profile.salt, pinHash: profile.pinHash }
}

export async function createLocalProfile(name: string, pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const pinHash = await hashPin(pin, salt)
  const profile: LocalProfile = {
    name: name.trim(),
    salt: toBase64(salt),
    pinHash: toBase64(pinHash),
  }
  localStorage.setItem(profileKey, JSON.stringify(profile))
}

export async function verifyLocalPin(profile: LocalProfile, pin: string) {
  const salt = fromBase64(profile.salt)
  const actual = await hashPin(pin, salt)
  const expected = fromBase64(profile.pinHash)
  if (actual.length !== expected.length) return false
  return actual.every((value, index) => value === expected[index])
}

export function resetLocalProfile() {
  localStorage.removeItem(profileKey)
  appKeys.forEach((key) => localStorage.removeItem(key))
}

async function hashPin(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const saltBuffer = new ArrayBuffer(salt.byteLength)
  new Uint8Array(saltBuffer).set(salt)
  const result = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations },
    key,
    256,
  )
  return new Uint8Array(result)
}

function toBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}
