import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteLocalRecording, listLocalRecordings, saveLocalRecording, type LocalRecording } from './localRecordings'

export function useLocalRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef(0)
  const chunksRef = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [recordings, setRecordings] = useState<LocalRecording[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setRecordings(await listLocalRecordings())
      setError('')
    } catch (cause) {
      setError(errorMessage(cause, 'Could not load recordings from this device.'))
    }
  }, [])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 250)
    return () => window.clearInterval(timer)
  }, [recording])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser does not support local audio recording. Try a newer browser or device.')
      return
    }

    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedTypes = [
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ]
      const mimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? supportedTypes.find((type) => MediaRecorder.isTypeSupported(type))
        : undefined
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()
      setElapsedMs(0)
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => setError('Recording stopped because the browser reported an audio error.')
      recorder.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
        chunksRef.current = []
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setRecording(false)
        if (!blob.size) {
          setError('No audio was captured. Check microphone permission and try again.')
          return
        }
        setBusy(true)
        void saveLocalRecording({
          id: createRecordingId(),
          createdAt: Date.now(),
          durationMs,
          mimeType: blob.type,
          blob,
        }).then(refresh).catch((cause: unknown) => {
          setError(errorMessage(cause, 'Could not save this recording on the device.'))
        }).finally(() => setBusy(false))
      }
      recorder.start(1000)
      setRecording(true)
    } catch (cause) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setError(errorMessage(cause, 'Microphone access was not available. Allow microphone access and try again.'))
    }
  }, [refresh])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      setError('')
      await deleteLocalRecording(id)
      await refresh()
    } catch (cause) {
      setError(errorMessage(cause, 'Could not delete this recording.'))
    }
  }, [refresh])

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  return { recording, elapsedMs, recordings, error, busy, start, stop, remove, refresh }
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

function createRecordingId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), (value) => value.toString(16).padStart(2, '0')).join('')}`
}
