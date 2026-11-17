# Sur — your riyaaz room

A gentle singing practice app for students preparing for ABGMVM music exams. Choose an exam level, keep a personal list of practice topics, listen to swaras with a generated tanpura-style drone, use the microphone pitch guide, and save recordings of practice.

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
- A one-time local profile and passcode screen; there is no online account or sign-in server.
- Optional voice recordings saved in the browser's local IndexedDB storage, with playback, download, and delete controls.
- A small practice-session counter, saved locally on the device.
- A Prarambhik practice dashboard with seven starter raga cards, common aaroh/avaroh/pakad references, listenable swara phrases, daily raga goals, and day-by-day completion counts.
- Prarambhik syllabus overview for three taalas, six alankars, and Swar Gyan.
- An installable offline app shell after the first online visit, with no external font or runtime service dependency.
- Responsive layouts for desktop and mobile.

## Offline use and installation

Sur is a web app, not an emailed iOS installer. Open its secure HTTPS site once while online; you can keep using it directly in Safari without installing anything. Adding it to the Home Screen is optional. The app shell is cached on that first visit so its practice tools can work offline afterward. Allow microphone access in Safari when asked to record.

The app's JavaScript and CSS are built for Safari 12, which includes the iPad mini 2 on iOS 12.5.8. On browsers without MediaRecorder, Sur records microphone audio through Web Audio and saves it locally as a 16 kHz WAV file. Synthesized practice audio also supports Safari's older prefixed Web Audio API. If Safari does not show a microphone prompt, check the iPad's Safari microphone permission in Settings.

The profile, exam choice, practice lists, progress, and recordings stay in that browser on that device. They do not sync between devices and Sur does not upload them. Browser storage is not encrypted, and a device cleanup, browser reset, or uninstall may remove it. Export recordings you want to keep. The local passcode is only a casual screen lock, not strong security or encryption. If it is forgotten, resetting Sur deletes its local profile and practice data.

Offline mode does not include ABGMVM's external website or other links; those require internet if opened. Fonts use local system fallbacks.

## Syllabus note

ABGMVM's examinations page currently shares examination schedules and links, not the detailed vocal syllabus for each level. The Prarambhik raga names in Sur are a starter list from [Music With Aditi's Prarambhik syllabus page](https://musicwithaditi.com/prarambhik-syllabusvocalinstrumental/), not an official ABGMVM publication. Raga phrases are common listening references and can vary by teacher and bandish. Confirm the full raga list and phrases with your teacher and current syllabus book, alongside the [official examinations page](https://abgmvm.org/examinations/). Starter topics in other exam levels are general prompts, not official syllabus content. Sur is an independent practice aid and is not affiliated with ABGMVM.

## Privacy and audio

Microphone access is optional and requested only when the student starts pitch practice or recording. Pitch is estimated in the browser; only a recording explicitly started by the student is saved locally. Nothing is uploaded. Audio playback is synthesized locally by the browser.
