import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteLocalRecording, listLocalRecordings, saveLocalRecording, type LocalRecording } from './localRecordings'
import { hasMicrophoneSupport, microphoneUnavailableMessage, requestMicrophone } from './microphone'
import { downsampleToPcm16, encodePcmWav } from './wavRecording'

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

type LegacyCapture = {
  context: AudioContext
  source: MediaStreamAudioSourceNode
  processor: ScriptProcessorNode
  silentGain: GainNode
  chunks: Int16Array[]
  stream: MediaStream
}

export function useLocalRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const legacyCaptureRef = useRef<LegacyCapture | null>(null)
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

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const save = useCallback((blob: Blob, durationMs: number) => {
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
  }, [refresh])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 250)
    return () => window.clearInterval(timer)
  }, [recording])

  const start = useCallback(async () => {
    if (!hasMicrophoneSupport()) {
      setError(microphoneUnavailableMessage())
      return
    }

    const useLegacyAudio = typeof MediaRecorder === 'undefined'
    const AudioContextConstructor = window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext
    if (useLegacyAudio && (!AudioContextConstructor || typeof AudioContextConstructor.prototype.createScriptProcessor !== 'function')) {
      setError('This browser does not provide the audio features needed to record. Listening and other practice tools are still available.')
      return
    }

    let stream: MediaStream | null = null
    let context: AudioContext | null = null
    try {
      setError('')
      if (useLegacyAudio && AudioContextConstructor) {
        context = new AudioContextConstructor()
        await context.resume()
      }
      stream = await requestMicrophone({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      startedAtRef.current = Date.now()
      setElapsedMs(0)

      if (useLegacyAudio && context) {
        const source = context.createMediaStreamSource(stream)
        const processor = context.createScriptProcessor(4096, 1, 1)
        const silentGain = context.createGain()
        const captureContext = context
        const chunks: Int16Array[] = []
        processor.onaudioprocess = (event) => {
          chunks.push(downsampleToPcm16(event.inputBuffer.getChannelData(0), captureContext.sampleRate))
        }
        silentGain.gain.value = 0
        source.connect(processor)
        processor.connect(silentGain)
        silentGain.connect(context.destination)
        legacyCaptureRef.current = { context, source, processor, silentGain, chunks, stream }
      } else if (typeof MediaRecorder !== 'undefined') {
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
        recorderRef.current = recorder
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunksRef.current.push(event.data)
        }
        recorder.onerror = () => setError('Recording stopped because the browser reported an audio error.')
        recorder.onstop = () => {
          const durationMs = Date.now() - startedAtRef.current
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
          chunksRef.current = []
          stopTracks()
          recorderRef.current = null
          setRecording(false)
          save(blob, durationMs)
        }
        recorder.start(1000)
      }
      setRecording(true)
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (context) {
        void context.close().catch((closeError: unknown) => {
          console.error('Could not close the audio recorder after a startup error.', closeError)
        })
      }
      if (cause instanceof Error && cause.name === 'NotAllowedError') {
        setError('Microphone permission was denied. Allow microphone access for Safari in Settings, then try again.')
        return
      }
      setError(errorMessage(cause, 'Microphone access was not available. Allow microphone access in your browser and try again.'))
    }
  }, [save, stopTracks])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
      return
    }
    const capture = legacyCaptureRef.current
    if (!capture) return

    capture.processor.onaudioprocess = null
    capture.source.disconnect()
    capture.processor.disconnect()
    capture.silentGain.disconnect()
    capture.stream.getTracks().forEach((track) => track.stop())
    const durationMs = Date.now() - startedAtRef.current
    legacyCaptureRef.current = null
    streamRef.current = null
    setRecording(false)
    void capture.context.close().catch((cause: unknown) => {
      console.error('Could not close the audio recorder.', cause)
    })
    try {
      save(encodePcmWav(capture.chunks), durationMs)
    } catch (cause) {
      setError(errorMessage(cause, 'Could not finish the audio recording.'))
    }
  }, [save])

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
    stopTracks()
    const capture = legacyCaptureRef.current
    if (capture) {
      capture.processor.onaudioprocess = null
      capture.source.disconnect()
      capture.processor.disconnect()
      capture.silentGain.disconnect()
      void capture.context.close().catch((cause: unknown) => {
        console.error('Could not close the audio recorder.', cause)
      })
      legacyCaptureRef.current = null
    }
  }, [stopTracks])

  return { recording, elapsedMs, recordings, error, busy, start, stop, remove, refresh }
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

function createRecordingId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), (value) => value.toString(16).padStart(2, '0')).join('')}`
}
