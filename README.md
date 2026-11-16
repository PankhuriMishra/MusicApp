# Sur — your riyaaz room

A gentle singing practice app for students preparing for ABGMVM music exams. Choose an exam level, keep a personal list of practice topics, listen to swaras with a generated tanpura-style drone, and use the microphone pitch guide to practice singing back.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## What is included

- Exam-level selector covering Prarambhik through Alankar Purna.
- Personal practice-topic lists for each exam level, saved in the current browser.
- Generated equal-tempered swara reference tones, an adjustable Sa, and a simple Sa–Pa drone. These are listening aids, not raga-specific intonation or recorded performances.
- Optional live pitch guidance through the microphone. Audio is analyzed in the browser and is not recorded or uploaded.
- A small practice-session counter, saved locally on the device.
- Responsive layouts for desktop and mobile.

## Syllabus note

ABGMVM's examinations page currently shares examination schedules and links, not the detailed vocal syllabus for each level. The starter topics in Sur are general practice prompts, not official ABGMVM syllabus content. Students should confirm exam requirements with their teacher and the [official examinations page](https://abgmvm.org/examinations/). Sur is an independent practice aid and is not affiliated with ABGMVM.

## Privacy and audio

Microphone access is optional and is requested only when the student starts voice practice. The app estimates pitch in the browser; it does not save or transmit microphone audio. Audio playback is synthesized locally by the browser.
