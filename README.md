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
- An installable offline app shell after the first online visit, with no external font or runtime service dependency.
- Responsive layouts for desktop and mobile.

## Offline use and installation

Sur is a web app, not an emailed iOS installer. Open its secure HTTPS site once while online, then use the browser's **Add to Home Screen** option to install it. The app shell is cached on that first visit and its practice tools work offline afterward. Microphone access and recording require a browser/device that supports them; these capabilities vary by iOS version.

The profile, exam choice, practice lists, progress, and recordings stay in that browser on that device. They do not sync between devices and Sur does not upload them. Browser storage is not encrypted, and a device cleanup, browser reset, or uninstall may remove it. Export recordings you want to keep. The local passcode is only a casual screen lock, not strong security or encryption. If it is forgotten, resetting Sur deletes its local profile and practice data.

Offline mode does not include ABGMVM's external website or other links; those require internet if opened. Fonts use local system fallbacks.

## Syllabus note

ABGMVM's examinations page currently shares examination schedules and links, not the detailed vocal syllabus for each level. The starter topics in Sur are general practice prompts, not official ABGMVM syllabus content. Students should confirm exam requirements with their teacher and the [official examinations page](https://abgmvm.org/examinations/). Sur is an independent practice aid and is not affiliated with ABGMVM.

## Privacy and audio

Microphone access is optional and requested only when the student starts pitch practice or recording. Pitch is estimated in the browser; only a recording explicitly started by the student is saved locally. Nothing is uploaded. Audio playback is synthesized locally by the browser.
