import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { DialoguePopup } from './components/DialoguePopup'
import { AudioEngine } from './audio/AudioEngine'
import { assets, type GuitarKey } from './config/assets'
import { GameEngine } from './game/GameEngine'
import { songs, type Song } from './data/songs'

type Screen = 'character' | 'warning' | 'baiju' | 'home' | 'freeplay' | 'tutorial' | 'complete' | 'results'
type Character = 'MP3.KING' | 'ROOM17'
type Mode = 'freeplay' | 'tutorial'
type Stats = { score: number; perfect: number; good: number; missed: number; combo: number; maxCombo: number; mysorePak: number }

const themes = {
  'MP3.KING': { primary: '#1bb8ff', secondary: '#f20b73', accent: '#18f4ee', background: '#13051a' },
  ROOM17: { primary: '#f20b73', secondary: '#1bb8ff', accent: '#18f4ee', background: '#13051a' },
} as const

const keyboard: GuitarKey[] = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K']
const initialStats: Stats = { score: 0, perfect: 0, good: 0, missed: 0, combo: 0, maxCombo: 0, mysorePak: 12 }

function getStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch { return fallback }
}

function App() {
  const [screen, setScreen] = useState<Screen>(() => getStored<Character | null>('otta-character', null) ? 'character' : 'character')
  const [character, setCharacter] = useState<Character | null>(() => getStored<Character | null>('otta-character', null))
  const [mode, setMode] = useState<Mode>('tutorial')
  const [song, setSong] = useState<Song>(songs[0])
  const [stats, setStats] = useState<Stats>(() => getStored('otta-stats', initialStats))
  const [activeKey, setActiveKey] = useState<GuitarKey | null>(null)
  const [noteIndex, setNoteIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [toast, setToast] = useState('')
  const [dialogue, setDialogue] = useState<'joel' | 'nadasha' | null>(null)
  const [dialogueReady, setDialogueReady] = useState(false)
  const [flash, setFlash] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [results, setResults] = useState<Stats>(initialStats)
  const audioRef = useRef(new AudioEngine())
  const engineRef = useRef(new GameEngine())
  const toastTimer = useRef<number | null>(null)
  const statsRef = useRef(stats)
  const screenRef = useRef(screen)

  const theme = character ? themes[character] : themes['MP3.KING']
  const currentNote = song.notes[noteIndex]
  const noteLeft = currentNote ? Math.min(85, Math.max(8, 8 + ((elapsed - currentNote.time + 0.8) / 0.8) * 70)) : 8

  const navigate = useCallback((nextScreen: Screen) => {
    if (nextScreen === screenRef.current) return
    window.history.pushState({ screen: nextScreen }, '', window.location.href)
    screenRef.current = nextScreen
    setScreen(nextScreen)
  }, [])

  useEffect(() => {
    window.history.replaceState({ screen: screenRef.current }, '', window.location.href)
    const onPopState = (event: PopStateEvent) => {
      const nextScreen = event.state?.screen as Screen | undefined
      if (!nextScreen) return
      engineRef.current.stop()
      setDialogue(null)
      setDialogueReady(false)
      screenRef.current = nextScreen
      setScreen(nextScreen)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    statsRef.current = stats
  }, [stats])

  const notify = (message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1000)
  }

  useEffect(() => {
    void audioRef.current.preloadGuitar()
    void audioRef.current.preloadDialogue()
  }, [])

  useEffect(() => {
    audioRef.current.setEnabled(audioEnabled)
    audioRef.current.setMusicEnabled(musicEnabled)
  }, [audioEnabled, musicEnabled])

  useEffect(() => {
    if (character) localStorage.setItem('otta-character', JSON.stringify(character))
    localStorage.setItem('otta-stats', JSON.stringify(stats))
  }, [character, stats])

  useEffect(() => {
    const audio = audioRef.current
    audio.stopAllDialogue()
    if (screen === 'baiju') void audio.playDialogue('baiju')
    if (screen === 'warning') void audio.playDialogue('hari')
    if (screen === 'results') audio.playMusic('glixon')
    return () => audio.stopAllDialogue()
  }, [navigate, screen])

  useEffect(() => {
    const audio = audioRef.current
    if (!dialogue) return
    const name = dialogue === 'joel' ? 'joel' : 'nadasha'
    let cancelled = false
    void audio.playDialogue(name).then(() => {
      if (!cancelled) setDialogueReady(true)
    })
    return () => {
      cancelled = true
      audio.stopDialogue(name)
    }
  }, [dialogue])

  useEffect(() => {
    const engine = engineRef.current
    engine.onEvent((event) => {
      if (event.type === 'note') {
        setNoteIndex(event.index)
        setElapsed(event.elapsed)
        return
      }
      if (event.type === 'judgment') {
        if (event.judgment === 'MISS') {
          const nextStats = { ...statsRef.current, missed: statsRef.current.missed + 1, combo: 0 }
          statsRef.current = nextStats
          setStats(nextStats)
          setDialogueReady(false)
          setDialogue('nadasha')
          notify('MISS')
        } else {
          const combo = statsRef.current.combo + 1
          const nextStats = {
            ...statsRef.current,
            score: statsRef.current.score + (event.judgment === 'PERFECT' ? 100 : 50),
            perfect: statsRef.current.perfect + (event.judgment === 'PERFECT' ? 1 : 0),
            good: statsRef.current.good + (event.judgment === 'GOOD' ? 1 : 0),
            combo,
            maxCombo: Math.max(statsRef.current.maxCombo, combo),
            mysorePak: statsRef.current.mysorePak + 1,
          }
          statsRef.current = nextStats
          setStats(nextStats)
          notify(event.judgment === 'PERFECT' ? 'PERFECT +100' : 'GOOD +50')
        }
      }
      if (event.type === 'complete') {
        engine.stop()
        setResults(statsRef.current)
        navigate('complete')
      }
    })
    return () => engine.stop()
  }, [navigate])

  useEffect(() => {
    if (screen !== 'tutorial') return
    if (dialogue === 'nadasha') engineRef.current.pause()
    if (!dialogue) engineRef.current.resume()
  }, [dialogue, screen])

  useEffect(() => {
    if (screen !== 'complete') return
    const flashTimer = window.setTimeout(() => {
      setFlash(true)
      audioRef.current.playCameraFlash()
    }, 650)
    const revealTimer = window.setTimeout(() => {
      setFlash(false)
      navigate('results')
    }, 1200)
    return () => { window.clearTimeout(flashTimer); window.clearTimeout(revealTimer) }
  }, [navigate, screen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase() as GuitarKey
      if (!keyboard.includes(key)) return
      event.preventDefault()
      setActiveKey(key)
      void audioRef.current.playGuitar(key)
      window.setTimeout(() => setActiveKey((value) => value === key ? null : value), 180)
      if (screen === 'tutorial' && !dialogue) engineRef.current.press(key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, dialogue])

  const chooseCharacter = (value: Character) => {
    setCharacter(value)
    navigate('baiju')
  }

  const chooseHari = () => navigate('warning')

  const openMode = (nextMode: Mode, nextSong = song) => {
    setMode(nextMode)
    setSong(nextSong)
    setDialogueReady(false)
    setDialogue('joel')
  }

  const beginMode = async () => {
    await audioRef.current.unlock()
    await audioRef.current.preloadGuitar()
    await audioRef.current.preloadDialogue()
    setDialogue(null)
    if (mode === 'freeplay') {
      navigate('freeplay')
      return
    }
    const cleanStats = { ...initialStats, mysorePak: stats.mysorePak }
    statsRef.current = cleanStats
    setStats(cleanStats)
    setNoteIndex(0)
    setElapsed(0)
    navigate('tutorial')
    engineRef.current.start(song)
  }

  const leaveGame = () => { engineRef.current.stop(); setDialogue(null); navigate('home') }
  const replay = () => openMode('tutorial', song)
  const clickKey = (key: GuitarKey) => window.dispatchEvent(new KeyboardEvent('keydown', { key }))

  const renderCharacter = () => (
    <section className="screen active">
      <div className="selector-wrap">
        <span className="badge">01 · CHARACTER SELECT</span>
        <h1 className="comic-title center">WHO'S PLAYING?</h1>
        <p className="subtitle">Choose your legend.</p>
        <div className="character-grid">
          <button className="character-card" type="button" onClick={() => chooseCharacter('MP3.KING')}><img src={assets.characters.mp3King} alt="MP3.KING" /><span>MP3.KING</span></button>
          <button className="character-card" type="button" onClick={() => chooseCharacter('ROOM17')}><img src={assets.characters.room17} alt="ROOM17" /><span>ROOM17</span></button>
          <button className="character-card danger-card" type="button" onClick={chooseHari}><img src={assets.characters.hariProfile} alt="HARI ETTAN" /><span>HARI ETTAN</span></button>
        </div>
      </div>
    </section>
  )

  const renderHome = () => (
    <section className="screen active home-screen">
      <header className="topbar"><div className="brand">OTTA <span>KAMBI</span></div><nav className="nav-row"><button type="button" onClick={() => navigate('home')}>HOME</button><button type="button" onClick={() => navigate('home')}>SONGS</button><button type="button" onClick={() => openMode('tutorial')}>LEARN</button><button type="button" onClick={() => navigate('character')}>PROFILE</button></nav><div className="meta-pill">{character}</div></header>
      <div className="home-layout"><div className="left-copy"><p className="eyebrow">{character}</p><h2 className="comic-title big">NAMASKARAM!</h2><p className="mini-copy">Let's make some music.</p><div className="cta-row"><button className="main-btn" type="button" onClick={() => openMode('tutorial')}>START PLAYING</button><button className="alt-btn" type="button" onClick={() => openMode('freeplay')}>FREE PLAY</button></div></div><img src={assets.game.guitar} alt="One string guitar" className="home-hero" /></div>
      <div className="bottom-panels"><div className="panel"><h3>SONGS</h3>{songs.map((item) => <button className={`song-row ${item.id === song.id ? 'active' : ''}`} type="button" key={item.id} onClick={() => openMode('tutorial', item)}><span>{item.title}</span><small>{item.difficulty}</small></button>)}</div><div className="panel"><h3>SETTINGS</h3><button className="song-row" type="button" onClick={() => setAudioEnabled((value) => !value)}><span>SOUND</span><small>{audioEnabled ? 'ON' : 'OFF'}</small></button><button className="song-row" type="button" onClick={() => setMusicEnabled((value) => !value)}><span>MUSIC</span><small>{musicEnabled ? 'ON' : 'OFF'}</small></button><p className="learn-copy">Desktop keyboard recommended.</p></div></div>
    </section>
  )

  const renderGame = (free: boolean) => (
    <section className="screen active play-screen"><div className="play-head"><div><span className="badge">{free ? 'FREE PLAY' : 'TUTORIAL / SONG'}</span><h2 className="comic-title small-title">{free ? 'PLAY WHATEVER YOU WANT' : `${song.title} · ${song.difficulty.toUpperCase()}`}</h2></div><div className="score-chip">MYSORE PAK × {stats.mysorePak}</div></div><div className="play-grid"><div className="game-stage"><div className="lane free-lane">{!free && <><div className="target-circle" /><div className="note-ball" style={{ left: `${noteLeft}%` }}>{currentNote?.key}</div></>}</div><div className={`guitar-wrap ${activeKey ? 'guitar-pulse' : ''}`}><img src={assets.game.guitar} alt="One string guitar" className="guitar-art" /></div><div className="keyboard-row">{keyboard.map((key) => <button className={activeKey === key ? 'key-tile active' : 'key-tile'} type="button" key={key} onClick={() => clickKey(key)}>{key}</button>)}</div></div><aside className="side-panel"><h3>{free ? 'SANDBOX' : 'HIT THE NOTE'}</h3><p className="learn-copy">{free ? 'Play whatever you want. Every supported key is valid.' : 'Press the expected key when the note reaches the cyan circle.'}</p>{!free && <div className="note-seq">{song.notes.map((note, index) => <span className={index === noteIndex ? 'seq current' : 'seq'} key={`${note.key}-${index}`}>{note.key}</span>)}</div>}{!free && <><div className="stat-box"><span>Score</span><strong>{stats.score}</strong></div><div className="stat-box"><span>Combo</span><strong>{stats.combo}</strong></div><div className="stat-box"><span>Missed</span><strong>{stats.missed}</strong></div></>}<button className="alt-btn wide" type="button" onClick={leaveGame}>EXIT TO HOME</button></aside></div></section>
  )

  const renderResults = () => (
    <section className="screen active result-screen"><div className="result-layout"><img src={assets.characters.glixon} alt="Glixon" className="glixon-image" /><div className="result-card"><span className="badge">SONG COMPLETE</span><h2 className="comic-title">GLIXON<br />APPROVES!</h2><div className="result-grid"><div><span>SCORE</span><strong>{results.score}</strong></div><div><span>ACCURACY</span><strong>{Math.round(((results.perfect + results.good * .5) / Math.max(1, results.perfect + results.good + results.missed)) * 100)}%</strong></div><div><span>PERFECT NOTES</span><strong>{results.perfect}</strong></div><div><span>GOOD NOTES</span><strong>{results.good}</strong></div><div><span>MISSED NOTES</span><strong>{results.missed}</strong></div><div><span>MYSORE PAK</span><strong>+{Math.max(0, results.mysorePak - stats.mysorePak)}</strong></div></div><p className="glixon-line">Well played!</p><div className="cta-row"><button className="main-btn" type="button" onClick={replay}>REPLAY</button><button className="alt-btn" type="button" onClick={() => navigate('home')}>HOME</button></div></div></div></section>
  )

  return <div className={`otto-app ${flash ? 'camera-flash' : ''}`} style={{ '--primary': theme.primary, '--secondary': theme.secondary, '--accent': theme.accent, '--background': theme.background } as React.CSSProperties}>
    <div className="journey-strip"><div className="journey-rail"><div className="journey-car-wrap" style={{ left: `${screen === 'character' ? 8 : screen === 'warning' ? 12 : screen === 'baiju' ? 18 : screen === 'home' ? 34 : screen === 'freeplay' || screen === 'tutorial' ? 66 : 91}%` }}><img src={assets.game.fordIkon} alt="Ford Ikon" className="car-mini" /></div><div className="camera-end"><img src={assets.game.aiCamera} alt="AI camera" /></div></div></div>
    <div className="mysore-hud"><img src={assets.game.mysorePak} alt="Mysore Pak" /><span>× {stats.mysorePak}</span></div>
    {screen === 'character' && renderCharacter()}
    {screen === 'warning' && <section className="screen active warning-screen"><div className="warning-card"><div className="warning-mark">!</div><img src={assets.characters.hariWarning} alt="Hari Ettan warning" className="warning-character" /><h2>HARI ETTAN</h2><p>"I don't have time for this.</p><p>Naale oru stage show ind."</p><button className="main-btn danger" type="button" onClick={() => navigate('character')}>GO BACK</button></div></section>}
    {screen === 'baiju' && <section className="screen active intro-screen baiju-intro"><div className="intro-copy"><span className="badge">BAIJU XAVIER</span><div className="speech-bubble">Aha... Otta kambi!</div><h1 className="comic-title">READY<br />FOR MUSIC?</h1><p>One string. One attitude. Zero chill.</p><button className="main-btn" type="button" onClick={() => navigate('home')}>CONTINUE</button></div><img src={assets.characters.baiju} alt="Baiju Chettan" className="hero-shot" /></section>}
    {screen === 'home' && renderHome()}
    {screen === 'freeplay' && renderGame(true)}
    {screen === 'tutorial' && renderGame(false)}
    {screen === 'complete' && <section className="screen active camera-screen"><h1 className="comic-title">CAMERA READY!</h1><p>The Ford Ikon has arrived.</p></section>}
    {screen === 'results' && renderResults()}
    {dialogue === 'joel' && <DialoguePopup image={assets.characters.joel} alt="Joel" title="AYYAPPAA!" buttonLabel="BEGIN" audioReady={dialogueReady} onClose={() => { setDialogue(null); navigate('home') }} onContinue={beginMode}><h2>Ready to make some noise?</h2><p>Time to hit the right note, macha!</p></DialoguePopup>}
    {dialogue === 'nadasha' && <DialoguePopup image={assets.characters.nadasha} alt="Nadasha" title="ENOUGH!" buttonLabel="BACK TO SONG" audioReady={dialogueReady} onClose={() => setDialogue(null)} onContinue={() => setDialogue(null)}><h2>Don't produce too much okay!</h2></DialoguePopup>}
    <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
  </div>
}

export default App
