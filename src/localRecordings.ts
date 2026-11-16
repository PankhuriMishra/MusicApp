const databaseName = 'sur-local-practice'
const storeName = 'recordings'

export type LocalRecording = {
  id: string
  createdAt: number
  durationMs: number
  mimeType: string
  blob: Blob
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local recording storage.'))
    request.onblocked = () => reject(new Error('Recording storage is busy. Close other Sur tabs and try again.'))
  })
}

export async function listLocalRecordings() {
  const database = await openDatabase()
  try {
    return await new Promise<LocalRecording[]>((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll()
      request.onsuccess = () => resolve((request.result as LocalRecording[]).sort((a, b) => b.createdAt - a.createdAt))
      request.onerror = () => reject(request.error ?? new Error('Could not load saved recordings.'))
    })
  } finally {
    database.close()
  }
}

export async function saveLocalRecording(recording: LocalRecording) {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      transaction.objectStore(storeName).put(recording)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this recording on the device.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving this recording was cancelled.'))
    })
  } finally {
    database.close()
  }
}

export async function deleteLocalRecording(id: string) {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      transaction.objectStore(storeName).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete this recording.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Deleting this recording was cancelled.'))
    })
  } finally {
    database.close()
  }
}

export async function clearLocalRecordings() {
  if (typeof indexedDB === 'undefined') return
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      transaction.objectStore(storeName).clear()
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear local recordings.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Clearing recordings was cancelled.'))
    })
  } finally {
    database.close()
  }
}
