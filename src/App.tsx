import { useEffect, useRef, useState, type FormEvent } from 'react'
import { exams, getSwaraFrequencies, noteNames, practiceTopics, tonics, type ExamLevel } from './music'
import { createLocalProfile, readLocalProfile, resetLocalProfile, verifyLocalPin, type LocalProfile } from './localProfile'
import { clearLocalRecordings, type LocalRecording } from './localRecordings'
import { useLocalRecorder } from './useLocalRecorder'
import { usePracticeAudio } from './usePracticeAudio'
import './App.css'

type View = 'today' | 'syllabus' | 'practice' | 'progress'
type PracticeStats = { minutes: number; sessions: number }
type TopicsByExam = Record<ExamLevel, string[]>

const statsKey = 'sur-practice-stats'
const examKey = 'sur-exam'
const topicsKey = 'sur-syllabus-topics'

function App() {
  const [storedProfile] = useState(() => {
    try {
      return { profile: readLocalProfile(), error: '' }
    } catch (cause) {
      return { profile: null, error: cause instanceof Error ? cause.message : 'Could not read the local profile.' }
    }
  })
  const [profile, setProfile] = useState<LocalProfile | null>(storedProfile.profile)
  const [unlocked, setUnlocked] = useState(false)
  const [loadError, setLoadError] = useState(storedProfile.error)

  if (loadError) {
    return <ProfileGate profile={profile} initialError={loadError} onProfile={setProfile} onUnlock={() => setUnlocked(true)} onReset={() => { setProfile(null); setLoadError('') }} />
  }

  if (!profile || !unlocked) {
    return <ProfileGate profile={profile} onProfile={setProfile} onUnlock={() => setUnlocked(true)} onReset={() => { setProfile(null); setUnlocked(false) }} />
  }

  return <PracticeApp studentName={profile.name} onLock={() => setUnlocked(false)} />
}

function ProfileGate({ profile, onProfile, onUnlock, onReset, initialError = '' }: {
  profile: LocalProfile | null
  onProfile: (profile: LocalProfile | null) => void
  onUnlock: () => void
  onReset: () => void
  initialError?: string
}) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState(initialError)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!profile && !name.trim()) {
      setError('Add a name to set up this practice profile.')
      return
    }
    if (!/^\d{4,12}$/.test(pin)) {
      setError('Use a passcode with 4 to 12 digits.')
      return
    }
    if (!profile && pin !== confirmPin) {
      setError('The passcodes do not match. Try again.')
      return
    }

    setBusy(true)
    try {
      if (profile) {
        if (!(await verifyLocalPin(profile, pin))) {
          setError('That passcode did not match. Try again.')
          return
        }
        onUnlock()
      } else {
        await createLocalProfile(name, pin)
        const created = readLocalProfile()
        if (!created) throw new Error('The local profile could not be saved. Check available device storage.')
        onProfile(created)
        onUnlock()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the local profile on this device.')
    } finally {
      setBusy(false)
    }
  }

  async function resetDevice() {
    if (!window.confirm('Reset Sur on this device? This permanently deletes the profile, practice lists, progress, and saved recordings.')) return
    try {
      setBusy(true)
      await clearLocalRecordings()
      resetLocalProfile()
      onReset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset the local data.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark">सा</span><span>sur<span className="brand-dot">.</span></span></div>
        <p className="eyebrow">{profile ? 'WELCOME BACK' : 'ONE-TIME SETUP'}</p>
        <h1>{profile ? `Namaste, ${profile.name}.` : 'Your own riyaaz room.'}</h1>
        <p className="auth-description">{profile ? 'Enter your device passcode to open your private practice space.' : 'Create a local student profile. Your name, passcode, and practice data stay on this device.'}</p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {!profile && <label>Student name<input autoComplete="name" autoFocus maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Anaya" /></label>}
          <label> {profile ? 'Device passcode' : 'Create a passcode'}
            <input autoComplete="off" autoFocus={Boolean(profile)} inputMode="numeric" pattern="[0-9]*" type="password" minLength={4} maxLength={12} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="4–12 digits" />
          </label>
          {!profile && <label>Confirm passcode<input autoComplete="off" inputMode="numeric" pattern="[0-9]*" type="password" minLength={4} maxLength={12} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} placeholder="Enter it once more" /></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="button button-dark auth-submit" disabled={busy}>{busy ? 'Please wait…' : profile ? 'Unlock practice' : 'Create my practice space'} <span aria-hidden="true">→</span></button>
        </form>
        <div className="auth-privacy">
          <strong>On this device only</strong>
          <p>Sur works offline after it has been installed. The passcode is a screen lock, not encryption. Anyone with access to this device’s browser storage may be able to access or remove saved data.</p>
        </div>
        {(profile || initialError) && <button className="reset-device" type="button" onClick={() => void resetDevice()} disabled={busy}>Forgot passcode? Reset this device</button>}
      </section>
    </main>
  )
}

function readStats(): PracticeStats {
  try {
    const stored = localStorage.getItem(statsKey)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PracticeStats>
      return {
        minutes: Number.isFinite(parsed.minutes) ? Math.max(0, parsed.minutes ?? 0) : 0,
        sessions: Number.isFinite(parsed.sessions) ? Math.max(0, parsed.sessions ?? 0) : 0,
      }
    }
  } catch {
    return { minutes: 0, sessions: 0 }
  }
  return { minutes: 0, sessions: 0 }
}

function readExam(): ExamLevel {
  const saved = localStorage.getItem(examKey)
  return exams.some((exam) => exam.id === saved) ? (saved as ExamLevel) : 'Prarambhik'
}

function readTopics(): TopicsByExam {
  try {
    const saved = localStorage.getItem(topicsKey)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<TopicsByExam>
      return Object.fromEntries(
        exams.map(({ id }) => [id, Array.isArray(parsed[id]) ? parsed[id] : [...practiceTopics]]),
      ) as TopicsByExam
    }
  } catch {
    return Object.fromEntries(exams.map(({ id }) => [id, [...practiceTopics]])) as TopicsByExam
  }
  return Object.fromEntries(exams.map(({ id }) => [id, [...practiceTopics]])) as TopicsByExam
}

function PracticeApp({ studentName, onLock }: { studentName: string; onLock: () => void }) {
  const [view, setView] = useState<View>('today')
  const [todayDate] = useState(() => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date()))
  const [exam, setExam] = useState<ExamLevel>(readExam)
  const [topicsByExam, setTopicsByExam] = useState<TopicsByExam>(readTopics)
  const [newTopic, setNewTopic] = useState('')
  const [stats, setStats] = useState<PracticeStats>(readStats)
  const [tonicIndex, setTonicIndex] = useState(7)
  const [targetNote, setTargetNote] = useState(0)
  const [practiceNote, setPracticeNote] = useState(0)
  const audio = usePracticeAudio()
  const recorder = useLocalRecorder()

  const selectedExam = exams.find((item) => item.id === exam) ?? exams[0]
  const currentTopics = topicsByExam[exam]
  const swaraFrequencies = getSwaraFrequencies(tonics[tonicIndex].frequency)
  const targetFrequency = swaraFrequencies[targetNote]
  const cents = audio.pitch ? 1200 * Math.log2(audio.pitch / targetFrequency) : null
  const tuningMessage =
    cents === null ? 'Sing a steady note' : Math.abs(cents) < 35 ? 'Beautifully in tune' : cents > 0 ? 'A little lower' : 'A little higher'

  function chooseExam(nextExam: ExamLevel) {
    setExam(nextExam)
    localStorage.setItem(examKey, nextExam)
  }

  function addTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const topic = newTopic.trim()
    if (!topic) return
    const next = { ...topicsByExam, [exam]: [...currentTopics, topic] }
    setTopicsByExam(next)
    localStorage.setItem(topicsKey, JSON.stringify(next))
    setNewTopic('')
  }

  function removeTopic(index: number) {
    const next = { ...topicsByExam, [exam]: currentTopics.filter((_, itemIndex) => itemIndex !== index) }
    setTopicsByExam(next)
    localStorage.setItem(topicsKey, JSON.stringify(next))
  }

  function completeSession() {
    const next = { minutes: stats.minutes + 15, sessions: stats.sessions + 1 }
    setStats(next)
    localStorage.setItem(statsKey, JSON.stringify(next))
  }

  function startPractice() {
    setView('practice')
    void recorder.refresh()
  }

  function playNextNote() {
    void audio.playNote(practiceNote, tonics[tonicIndex].frequency)
    setPracticeNote((current) => (current + 1) % noteNames.length)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => setView('today')} aria-label="Sur home">
          <span className="brand-mark" aria-hidden="true">सा</span>
          <span>sur<span className="brand-dot">.</span></span>
        </button>
        <p className="side-label">YOUR RIYAAZ</p>
        <nav className="main-nav" aria-label="Main navigation">
          <NavButton active={view === 'today'} onClick={() => setView('today')} icon="◷">Today</NavButton>
          <NavButton active={view === 'syllabus'} onClick={() => setView('syllabus')} icon="▤">My syllabus</NavButton>
          <NavButton active={view === 'practice'} onClick={startPractice} icon="♫">Practice room</NavButton>
          <NavButton active={view === 'progress'} onClick={() => setView('progress')} icon="↗">My progress</NavButton>
        </nav>
        <div className="sidebar-bottom">
          <div className="teacher-card">
            <span className="teacher-icon">✳</span>
            <div>
              <strong>Little by little</strong>
              <span>Every note counts.</span>
            </div>
          </div>
          <a className="official-link" href="https://abgmvm.org/examinations/" target="_blank" rel="noreferrer">
            ABGMVM exams <span aria-hidden="true">↗</span>
          </a>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Riyaz room</span><span className="crumb-slash">/</span><strong>{pageTitle(view)}</strong></div>
          <div className="topbar-right">
            <span className="today-date">{todayDate}</span>
            <button type="button" className="avatar" aria-label={`Lock Sur for ${studentName}`} onClick={onLock}>{studentName.charAt(0).toUpperCase()}</button>
          </div>
        </header>

        {view === 'today' && (
          <TodayView exam={exam} chooseExam={chooseExam} selectedExam={selectedExam} stats={stats} studentName={studentName} startPractice={startPractice} />
        )}

        {view === 'syllabus' && (
          <section className="content-page">
            <PageHeading eyebrow="YOUR LEARNING PATH" title="Syllabus & practice" detail="Shape a practice list that matches what your teacher is preparing you for." />
            <ExamSelector exam={exam} chooseExam={chooseExam} />
            <div className="syllabus-note">
              <span className="note-icon">✳</span>
              <p>This is your personal practice list, not an official ABGMVM syllabus. Check the current syllabus with your teacher or <a href="https://abgmvm.org/examinations/" target="_blank" rel="noreferrer">ABGMVM</a>.</p>
            </div>
            <div className="topic-list">
              {currentTopics.map((topic, index) => (
                <div className="topic-row" key={`${topic}-${index}`}>
                  <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="topic-name">{topic}</span>
                  <button className="remove-topic" type="button" onClick={() => removeTopic(index)} aria-label={`Remove ${topic}`}>×</button>
                </div>
              ))}
              {currentTopics.length === 0 && <p className="empty-note">Your list is empty. Add a practice topic to get started.</p>}
            </div>
            <form className="add-topic-form" onSubmit={addTopic}>
              <label htmlFor="new-topic">Add a topic for {selectedExam.name}</label>
              <div className="input-row">
                <input id="new-topic" value={newTopic} onChange={(event) => setNewTopic(event.target.value)} placeholder="e.g. Raga Yaman aroha-avaroha" maxLength={80} />
                <button className="button button-dark" type="submit" disabled={!newTopic.trim()}>Add topic <span aria-hidden="true">＋</span></button>
              </div>
            </form>
          </section>
        )}

        {view === 'practice' && (
          <section className="content-page">
            <PageHeading eyebrow="YOUR PRACTICE ROOM" title="Find your sur" detail="Listen, settle into your Sa, and sing along at your own pace." />
            <div className="practice-grid">
              <div className="practice-card scale-card">
                <div className="card-kicker"><span className="live-dot" /> SWARA PRACTICE</div>
                <h2>Listen & sing</h2>
                <p className="card-description">Hear synthesized swaras, choose a comfortable Sa, and sing each note back.</p>
                <div className="swaras" aria-label="Swaras">
                  {noteNames.map((note, index) => (
                    <button className={`swara ${index === practiceNote ? 'swara-current' : ''}`} key={`${note}-${index}`} type="button" onClick={() => { setPracticeNote(index); void audio.playNote(index, tonics[tonicIndex].frequency) }}>
                      <span>{note}</span><small>{index === 7 ? 'upper Sa' : 'swara'}</small>
                    </button>
                  ))}
                </div>
                <div className="practice-controls">
                  <button type="button" className="button button-dark" onClick={playNextNote}><span className="button-play">▶</span> Play next swara</button>
                  <button type="button" className={`button button-outline ${audio.droneOn ? 'button-active' : ''}`} onClick={() => void audio.toggleDrone(tonics[tonicIndex].frequency)}>{audio.droneOn ? '■ Stop tanpura' : '♫ Tanpura drone'}</button>
                </div>
              </div>

              <div className="practice-card pitch-card">
                <div className="card-kicker">SING BACK</div>
                <h2>How does it feel?</h2>
                <p className="card-description">Live pitch feedback is not saved. Use the separate recorder below if you want to keep a take on this device.</p>
                <div className={`pitch-display ${cents !== null && Math.abs(cents) < 35 ? 'pitch-match' : ''}`}>
                  <div className="pitch-ring"><span>{audio.pitch ? noteNames[nearestSwara(audio.pitch, swaraFrequencies)] : noteNames[targetNote]}</span></div>
                  <strong>{tuningMessage}</strong>
                  <span className="pitch-hint">{audio.pitch ? `${Math.abs(Math.round(cents ?? 0))} cents ${cents && cents > 0 ? 'sharp' : 'flat'}` : `Aim for ${noteNames[targetNote]}`}</span>
                </div>
                <label className="target-select-label" htmlFor="target-note">Practice note</label>
                <select id="target-note" className="target-select" value={targetNote} onChange={(event) => setTargetNote(Number(event.target.value))}>
                  {noteNames.map((note, index) => <option value={index} key={`${note}-${index}`}>{note}</option>)}
                </select>
                <label className="target-select-label tonic-label" htmlFor="tonic-note">Your Sa</label>
                <select id="tonic-note" className="target-select" value={tonicIndex} onChange={(event) => setTonicIndex(Number(event.target.value))}>
                  {tonics.map((note, index) => <option value={index} key={note.label}>{note.label}</option>)}
                </select>
                <button type="button" className={`button ${audio.listening ? 'button-recording' : 'button-dark'} mic-button`} onClick={() => audio.listening ? audio.stopListening() : void audio.startListening()}>
                  <span aria-hidden="true">{audio.listening ? '■' : '◉'}</span> {audio.listening ? 'Stop listening' : 'Listen to my voice'}
                </button>
                {audio.error && <p className="audio-error" role="status">{audio.error}</p>}
              </div>
            </div>
            <section className="recording-card" aria-labelledby="recording-title">
              <div className="recording-heading">
                <div>
                  <p className="eyebrow">YOUR VOICE, YOUR DEVICE</p>
                  <h2 id="recording-title">Save a singing practice</h2>
                  <p className="recording-detail">Record a phrase, listen back, or download a copy. Audio stays in this browser on this device.</p>
                </div>
                <button type="button" className={`button ${recorder.recording ? 'button-recording' : 'button-dark'}`} onClick={() => recorder.recording ? recorder.stop() : void recorder.start()} disabled={recorder.busy}>
                  <span aria-hidden="true">{recorder.recording ? '■' : '●'}</span>
                  {recorder.recording ? `Stop · ${formatDuration(recorder.elapsedMs)}` : recorder.busy ? 'Saving…' : 'Start recording'}
                </button>
              </div>
              {recorder.error && <p className="audio-error" role="status">{recorder.error}</p>}
              <div className="recordings-list">
                {recorder.recordings.map((item) => <RecordingRow key={item.id} recording={item} onDelete={() => void recorder.remove(item.id)} />)}
                {!recorder.recordings.length && !recorder.error && <p className="recordings-empty">No recordings yet. Your practice recordings will appear here.</p>}
              </div>
              <p className="recordings-caveat">Microphone permission is requested only when you start recording. Recordings use device storage; export important takes because browser data can be cleared by device settings.</p>
            </section>
            <div className="session-footer">
              <div><span className="session-check">✓</span><span><strong>Finished for today?</strong><small>Mark 15 minutes of practice complete.</small></span></div>
              <button type="button" className="button button-outline" onClick={completeSession}>Complete session <span aria-hidden="true">→</span></button>
            </div>
          </section>
        )}

        {view === 'progress' && (
          <section className="content-page">
            <PageHeading eyebrow="YOUR JOURNEY" title="Every note adds up" detail="A little practice, a little progress. Keep going." />
            <div className="progress-stats">
              <StatCard label="Minutes practiced" value={stats.minutes} suffix="min" icon="◷" />
              <StatCard label="Sessions completed" value={stats.sessions} suffix="sessions" icon="♫" />
              <StatCard label="Current exam" value={selectedExam.shortName} suffix="" icon="✳" />
            </div>
            <div className="progress-message">
              <div className="progress-art" aria-hidden="true"><span>सा</span><span>रे</span><span>गा</span><span>मा</span></div>
              <h2>{stats.sessions ? 'Your riyaaz is taking shape.' : 'Your first session is waiting.'}</h2>
              <p>{stats.sessions ? `You have made time for ${stats.sessions} practice ${stats.sessions === 1 ? 'session' : 'sessions'}. Come back tomorrow and add another.` : 'Start with one note, one breath, one small step. Your progress will show up here.'}</p>
              <button type="button" className="button button-dark" onClick={startPractice}>Go to practice room <span aria-hidden="true">→</span></button>
            </div>
          </section>
        )}

        <footer className="app-footer"><span>Made for steady, joyful practice.</span><span>Practice content is a learning aid, not official exam guidance.</span></footer>
      </main>
    </div>
  )
}

function RecordingRow({ recording, onDelete }: { recording: LocalRecording; onDelete: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const downloadRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(recording.blob)
    if (audioRef.current) audioRef.current.src = url
    if (downloadRef.current) downloadRef.current.href = url
    return () => URL.revokeObjectURL(url)
  }, [recording.blob])

  return (
    <div className="recording-row">
      <div className="recording-meta">
        <strong>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(recording.createdAt)}</strong>
        <span>{formatDuration(recording.durationMs)}</span>
      </div>
      <audio ref={audioRef} controls preload="metadata">Audio playback is not supported in this browser.</audio>
      <a ref={downloadRef} className="recording-download" download={`sur-practice-${new Date(recording.createdAt).toISOString().slice(0, 10)}.${fileExtension(recording.mimeType)}`}>Download</a>
      <button type="button" className="remove-topic" onClick={onDelete} aria-label="Delete this recording">×</button>
    </div>
  )
}

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function fileExtension(mimeType: string) {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'm4a'
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: string }) {
  return <button type="button" className={`nav-button ${active ? 'nav-active' : ''}`} onClick={onClick}><span className="nav-icon" aria-hidden="true">{icon}</span>{children}{active && <span className="nav-active-mark" />}</button>
}

function TodayView({ exam, chooseExam, selectedExam, stats, studentName, startPractice }: { exam: ExamLevel; chooseExam: (exam: ExamLevel) => void; selectedExam: (typeof exams)[number]; stats: PracticeStats; studentName: string; startPractice: () => void }) {
  return (
    <section className="content-page today-page">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">YOUR MUSIC, YOUR PACE</p>
          <h1>Namaste, <em>{studentName}.</em></h1>
          <p className="welcome-copy">A little riyaaz every day makes room for something beautiful.</p>
        </div>
        <div className="today-sun" aria-hidden="true"><span>सा</span><i>♪</i></div>
      </div>

      <div className="hero-card">
        <div className="hero-copy">
          <span className="hero-label"><span className="hero-sparkle">✳</span> TODAY'S RIYAAZ</span>
          <h2>Come back to<br /><em>your Sa.</em></h2>
          <p>Warm up your voice, find your note, and let the music unfold.</p>
          <button type="button" className="button button-cream" onClick={startPractice}>Start practicing <span aria-hidden="true">→</span></button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-circle art-circle-one" /><div className="art-circle art-circle-two" />
          <div className="art-note note-one">सा</div><div className="art-note note-two">रे</div><div className="art-note note-three">♪</div>
          <div className="art-horizon" />
        </div>
      </div>

      <div className="home-section-heading">
        <div><p className="eyebrow">YOUR LEARNING PATH</p><h2>Ready for your next note?</h2></div>
        <button type="button" className="text-button" onClick={startPractice}>Go to practice <span aria-hidden="true">→</span></button>
      </div>
      <div className="home-grid">
        <div className="exam-card">
          <div className="exam-card-top"><span className="mini-icon">✳</span><span className="card-kicker">CURRENT EXAM</span></div>
          <label htmlFor="home-exam" className="exam-label">I’m preparing for</label>
          <select id="home-exam" className="exam-select" value={exam} onChange={(event) => chooseExam(event.target.value as ExamLevel)}>
            {exams.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <p className="exam-caption">{selectedExam.note}</p>
          <span className="exam-change-hint">You can change this anytime</span>
        </div>
        <div className="minutes-card">
          <div className="minutes-card-header"><span className="mini-icon mini-icon-yellow">♫</span><span className="card-kicker">YOUR RIYAAZ</span></div>
          <div className="minutes-number">{stats.minutes}<span> min</span></div>
          <p>{stats.sessions ? `${stats.sessions} practice ${stats.sessions === 1 ? 'session' : 'sessions'} completed` : 'Your practice journey starts here.'}</p>
          <div className="minutes-progress"><span style={{ width: `${Math.min(100, (stats.minutes % 60) / 60 * 100)}%` }} /></div>
          <span className="minutes-caption">This device only · saved privately</span>
        </div>
        <button type="button" className="listen-card" onClick={() => void new Audio().play().catch(() => undefined)}>
          <span className="listen-card-icon">♫</span>
          <span className="listen-card-copy"><strong>Listen & sing</strong><small>Practice swaras with a gentle tone</small></span>
          <span className="listen-arrow" aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  )
}

function PageHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-detail">{detail}</p></div>
}

function ExamSelector({ exam, chooseExam }: { exam: ExamLevel; chooseExam: (exam: ExamLevel) => void }) {
  return <div className="exam-selector"><label htmlFor="syllabus-exam">Exam level</label><select id="syllabus-exam" value={exam} onChange={(event) => chooseExam(event.target.value as ExamLevel)}>{exams.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
}

function StatCard({ label, value, suffix, icon }: { label: string; value: number | string; suffix: string; icon: string }) {
  return <div className="stat-card"><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span><strong>{value}<small>{suffix ? ` ${suffix}` : ''}</small></strong></div>
}

function nearestSwara(frequency: number, swaraFrequencies: number[]) {
  let closest = 0
  let smallestDistance = Number.POSITIVE_INFINITY
  swaraFrequencies.forEach((note, index) => {
    const distance = Math.abs(1200 * Math.log2(frequency / note))
    if (distance < smallestDistance) {
      closest = index
      smallestDistance = distance
    }
  })
  return closest
}

function pageTitle(view: View) {
  return { today: 'Today', syllabus: 'My syllabus', practice: 'Practice room', progress: 'My progress' }[view]
}

export default App
