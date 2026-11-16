import { useEffect, useRef, useState } from 'react'
import { getSwaraFrequencies } from './music'

export function usePracticeAudio() {
  const contextRef = useRef<AudioContext | null>(null)
  const droneRef = useRef<OscillatorNode[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const [droneOn, setDroneOn] = useState(false)
  const [listening, setListening] = useState(false)
  const [pitch, setPitch] = useState<number | null>(null)
  const [error, setError] = useState('')

  function getContext() {
    if (!contextRef.current) contextRef.current = new AudioContext()
    return contextRef.current
  }

  async function playNote(noteIndex: number, tonic = 261.63) {
    try {
      const context = getContext()
      await context.resume()
      const frequency = getSwaraFrequencies(tonic)[noteIndex]
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.15)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 1.2)
      setError('')
    } catch {
      setError('Audio could not start. Check your device volume and try again.')
    }
  }

  async function playSequence(semitones: number[], tonic = 261.63, beatsPerMinute = 70) {
    if (!semitones.length) {
      setError('There are no notes in this phrase to play.')
      return
    }
    try {
      const context = getContext()
      await context.resume()
      const beat = 60 / beatsPerMinute
      const start = context.currentTime + 0.05
      semitones.forEach((semitone, index) => {
        const onset = start + index * beat
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = tonic * 2 ** (semitone / 12)
        gain.gain.setValueAtTime(0.0001, onset)
        gain.gain.exponentialRampToValueAtTime(0.1, onset + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, onset + beat * 0.88)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(onset)
        oscillator.stop(onset + beat * 0.9)
      })
      setError('')
    } catch {
      setError('Audio could not start. Check your device volume and try again.')
    }
  }

  async function toggleDrone(tonic = 261.63) {
    if (droneOn) {
      droneRef.current.forEach((oscillator) => oscillator.stop())
      droneRef.current = []
      setDroneOn(false)
      return
    }
    try {
      const context = getContext()
      await context.resume()
      const oscillators = [tonic, tonic * 1.5].map((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        gain.gain.value = index === 0 ? 0.035 : 0.018
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start()
        return oscillator
      })
      droneRef.current = oscillators
      setDroneOn(true)
      setError('')
    } catch {
      setError('The tanpura drone could not start. Check your device volume and try again.')
    }
  }

  async function startListening() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access needs a secure connection and a supported browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      const context = getContext()
      await context.resume()
      streamRef.current = stream
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 4096
      source.connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      setListening(true)
      setError('')
      let lastUpdate = 0
      const readPitch = (timestamp: number) => {
        analyser.getFloatTimeDomainData(samples)
        if (timestamp - lastUpdate > 120) {
          setPitch(detectPitch(samples, context.sampleRate))
          lastUpdate = timestamp
        }
        frameRef.current = requestAnimationFrame(readPitch)
      }
      frameRef.current = requestAnimationFrame(readPitch)
    } catch {
      setError('Microphone access was not available. Allow microphone access in your browser and try again.')
      stopListening()
    }
  }

  function stopListening() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setListening(false)
    setPitch(null)
  }

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    droneRef.current.forEach((oscillator) => oscillator.stop())
    void contextRef.current?.close()
  }, [])

  return { droneOn, listening, pitch, error, playNote, playSequence, toggleDrone, startListening, stopListening }
}

function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  let energy = 0
  for (const sample of samples) energy += sample * sample
  if (Math.sqrt(energy / samples.length) < 0.012) return null

  let bestOffset = -1
  let bestCorrelation = 0
  const minOffset = Math.floor(sampleRate / 1000)
  const maxOffset = Math.min(Math.floor(sampleRate / 65), samples.length / 2)

  for (let offset = minOffset; offset < maxOffset; offset += 1) {
    let correlation = 0
    for (let index = 0; index < samples.length / 2; index += 1) {
      correlation += samples[index] * samples[index + offset]
    }
    correlation /= samples.length / 2
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestOffset = offset
    }
  }
  return bestCorrelation > 0.15 && bestOffset > 0 ? sampleRate / bestOffset : null
}
