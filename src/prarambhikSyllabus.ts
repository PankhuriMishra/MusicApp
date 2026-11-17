export type Raga = {
  id: string
  name: string
  aliases?: string
  thaat: string
  swaras: string
  aroha: string
  avaroha: string
  pakad: string
}

export const prarambhikRagas: Raga[] = [
  {
    id: 'durga',
    name: 'Durga',
    thaat: 'Bilawal',
    swaras: 'All shuddha swaras; Ga and Ni are omitted.',
    aroha: 'S R M P D S′',
    avaroha: 'S′ D P M R S',
    pakad: 'D M R, S · R M P D P M R S',
  },
  {
    id: 'kafi',
    name: 'Kafi',
    thaat: 'Kafi',
    swaras: 'Komal Ga (g) and komal Ni (n); other swaras shuddha.',
    aroha: 'S R g M P D n S′',
    avaroha: 'S′ n D P M g R S',
    pakad: 'S R g M P · D P M g R S',
  },
  {
    id: 'khamaj',
    name: 'Khamaj',
    thaat: 'Khamaj',
    swaras: 'Shuddha Ni in ascent; komal Ni (n) is characteristic in descent.',
    aroha: 'S G M P D N S′',
    avaroha: 'S′ n D P M G R S',
    pakad: 'G M P D M G R S',
  },
  {
    id: 'bhimpalasi',
    name: 'Bhimpalasi',
    thaat: 'Kafi',
    swaras: 'Komal Ga (g) and komal Ni (n); Re and Dha are omitted in ascent.',
    aroha: 'n S g M P n S′',
    avaroha: 'S′ n D P M g R S',
    pakad: 'n S g M P · M P g M g R S',
  },
  {
    id: 'bageshri',
    name: 'Bageshri',
    thaat: 'Kafi',
    swaras: 'Komal Ga (g) and komal Ni (n); Re and Pa are omitted in ascent.',
    aroha: 'S g M D n S′',
    avaroha: 'S′ n D M P D g M R S',
    pakad: 'g M D n D M · g M R S',
  },
  {
    id: 'bhupali',
    name: 'Bhoop',
    aliases: 'Bhupali',
    thaat: 'Kalyan',
    swaras: 'All shuddha swaras; Ma and Ni are omitted.',
    aroha: 'S R G P D S′',
    avaroha: 'S′ D P G R S',
    pakad: 'G R S · D S′ D P G R S',
  },
  {
    id: 'desh',
    name: 'Desh',
    thaat: 'Khamaj',
    swaras: 'Shuddha Ni (N) in ascent; komal Ni (n) is commonly used in descent.',
    aroha: 'S R M P N S′',
    avaroha: 'S′ n D P M G R G S',
    pakad: 'R M P N S′ · R′ n D P M G R G S',
  },
]

export const prarambhikTalas = [
  { name: 'Kehrawa', beats: 8, vibhag: '4 + 4', theka: 'Dha Ge Na Ti · Na Ka Dhi Na', sam: 0, khali: 4 },
  { name: 'Dadra', beats: 6, vibhag: '3 + 3', theka: 'Dha Dhi Na · Dha Tu Na', sam: 0, khali: 3 },
  { name: 'Teentaal', beats: 16, vibhag: '4 + 4 + 4 + 4', theka: 'Dha Dhin Dhin Dha · Dha Dhin Dhin Dha · Dha Tin Tin Ta · Ta Dhin Dhin Dha', sam: 0, khali: 8 },
]

export const prarambhikAlankars = [
  { number: 1, pattern: 'S R G M P D N S′', description: 'Straight shuddha swaras; sing up and back down.' },
  { number: 2, pattern: 'S R G · R G M · G M P · …', description: 'Three-note groups moving stepwise through the scale.' },
  { number: 3, pattern: 'S R G M · R G M P · G M P D · …', description: 'Four-note groups moving stepwise through the scale.' },
  { number: 4, pattern: 'S R S R G · R G R G M · …', description: 'Repeat the first two notes before moving to the next swara.' },
  { number: 5, pattern: 'S G · R M · G P · M D · …', description: 'Skip a swara each time; keep every note even.' },
  { number: 6, pattern: 'S · S R S · S R G R S · …', description: 'Expand a phrase, then return to Sa.' },
]

export const prarambhikSyllabusSections = [
  { title: 'Ragas', count: prarambhikRagas.length, detail: 'Aaroh, avaroh, pakad, swaras, and one bandish for each.' },
  { title: 'Taalas', count: prarambhikTalas.length, detail: 'Kehrawa, Dadra, and Teentaal with taali and khali.' },
  { title: 'Alankars', count: prarambhikAlankars.length, detail: 'Six shuddha-swara patterns; practice ascending and descending.' },
  { title: 'Swar Gyan', count: 1, detail: 'Recognize shuddha and komal swaras and common singing styles.' },
]

export function getRagaSemitones(sequence: string) {
  const swaraOffsets: Record<string, number> = {
    S: 0, r: 1, R: 2, g: 3, G: 4, M: 5, m: 6, P: 7, d: 8, D: 9, n: 10, N: 11,
  }
  const notes: number[] = []
  const pattern = /([rRgGmMPdDnNS])([′'’]?)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(sequence)) !== null) {
    const offset = swaraOffsets[match[1]]
    notes.push(offset + (match[2] ? 12 : 0))
  }
  return notes
}
