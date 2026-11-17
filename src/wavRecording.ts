export const legacyRecordingSampleRate = 16_000

export function downsampleToPcm16(samples: Float32Array, sourceSampleRate: number): Int16Array {
  const ratio = sourceSampleRate / legacyRecordingSampleRate
  const output = new Int16Array(Math.floor(samples.length / ratio))
  for (let outputIndex = 0; outputIndex < output.length; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio)
    const end = Math.min(samples.length, Math.floor((outputIndex + 1) * ratio))
    let total = 0
    for (let inputIndex = start; inputIndex < end; inputIndex += 1) total += samples[inputIndex]
    const sample = Math.max(-1, Math.min(1, total / Math.max(1, end - start)))
    output[outputIndex] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}

export function encodePcmWav(chunks: Int16Array[], sampleRate = legacyRecordingSampleRate): Blob {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0)
  if (!sampleCount) throw new Error('No audio was captured. Check microphone permission and try again.')

  const buffer = new ArrayBuffer(44 + sampleCount * 2)
  const view = new DataView(buffer)
  writeText(view, 0, 'RIFF')
  view.setUint32(4, 36 + sampleCount * 2, true)
  writeText(view, 8, 'WAVE')
  writeText(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(view, 36, 'data')
  view.setUint32(40, sampleCount * 2, true)

  const output = new Int16Array(buffer, 44)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

function writeText(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}
