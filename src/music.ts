export const exams = [
  { id: 'Prarambhik', name: 'Prarambhik', shortName: 'Prarambhik', note: 'Build a calm, confident foundation.' },
  { id: 'Praveshika Pratham', name: 'Praveshika Pratham', shortName: 'Praveshika I', note: 'Grow your voice and strengthen the basics.' },
  { id: 'Praveshika Purna', name: 'Praveshika Purna', shortName: 'Praveshika II', note: 'Bring steadiness and expression to your practice.' },
  { id: 'Madhyama Pratham', name: 'Madhyama Pratham', shortName: 'Madhyama I', note: 'Build fluency and confidence in your repertoire.' },
  { id: 'Madhyama Purna', name: 'Madhyama Purna', shortName: 'Madhyama II', note: 'Make space for deeper, more focused riyaaz.' },
  { id: 'Visharad Pratham', name: 'Visharad Pratham', shortName: 'Visharad I', note: 'Bring intention and detail to each practice.' },
  { id: 'Visharad Purna', name: 'Visharad Purna', shortName: 'Visharad II', note: 'Refine your listening, voice, and musical expression.' },
  { id: 'Alankar Pratham', name: 'Alankar Pratham', shortName: 'Alankar I', note: 'Explore a more advanced and independent practice.' },
  { id: 'Alankar Purna', name: 'Alankar Purna', shortName: 'Alankar II', note: 'Keep your preparation thoughtful and consistent.' },
] as const

export type ExamLevel = (typeof exams)[number]['id']

export const noteNames = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni', 'Sa′']

const semitones = [0, 2, 4, 5, 7, 9, 11, 12]

export const practiceTopics = ['Swarasthaan & steady Sa', 'Aroha and avaroha', 'Alankar practice', 'Listening & voice warm-up']

export const tonics = [
  { label: 'C3', frequency: 130.81 },
  { label: 'D3', frequency: 146.83 },
  { label: 'E3', frequency: 164.81 },
  { label: 'F3', frequency: 174.61 },
  { label: 'G3', frequency: 196 },
  { label: 'A3', frequency: 220 },
  { label: 'B3', frequency: 246.94 },
  { label: 'C4', frequency: 261.63 },
  { label: 'D4', frequency: 293.66 },
  { label: 'E4', frequency: 329.63 },
  { label: 'F4', frequency: 349.23 },
  { label: 'G4', frequency: 392 },
  { label: 'A4', frequency: 440 },
  { label: 'B4', frequency: 493.88 },
  { label: 'C5', frequency: 523.25 },
] as const

export function getSwaraFrequencies(tonic: number) {
  return semitones.map((semitone) => tonic * 2 ** (semitone / 12))
}
