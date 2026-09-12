import { assets, type GuitarKey } from '../config/assets'

type AudioName = keyof typeof assets.dialogue

export class AudioEngine {
  private context: AudioContext | null = null
  private buffers = new Map<GuitarKey, AudioBuffer>()
  private guitarPreload: Promise<void> | null = null
  private resumePromise: Promise<void> | null = null
  private dialogue = new Map<AudioName, HTMLAudioElement[]>()
  private dialogueIndex = new Map<AudioName, number>()
  private dialogueRun = new Map<AudioName, number>()
  private dialoguePreload: Promise<void> | null = null
  private enabled = true
  private musicEnabled = true

  constructor() {
    for (const [name, url] of Object.entries(assets.dialogue)) {
      const players = [0, 1].map(() => {
        const audio = new Audio(url)
        audio.preload = 'auto'
        audio.load()
        return audio
      })
      this.dialogue.set(name as AudioName, players)
      this.dialogueIndex.set(name as AudioName, -1)
    }
  }

  setEnabled(value: boolean) { this.enabled = value }
  setMusicEnabled(value: boolean) { this.musicEnabled = value }

  async preloadDialogue() {
    if (!this.dialoguePreload) {
      this.dialoguePreload = Promise.all(Object.entries(assets.dialogue).map(async ([name, url]) => {
        const players = this.dialogue.get(name as AudioName)
        if (!players) return
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const blobUrl = URL.createObjectURL(await response.blob())
          for (const audio of players) {
            audio.src = blobUrl
            audio.load()
          }
          await Promise.all(players.map((audio) => {
            if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve()
            return new Promise<void>((resolve) => {
              const ready = () => {
                audio.removeEventListener('canplay', ready)
                audio.removeEventListener('error', ready)
                resolve()
              }
              audio.addEventListener('canplay', ready, { once: true })
              audio.addEventListener('error', ready, { once: true })
            })
          }))
        } catch (error) {
          console.warn(`Unable to preload dialogue ${name}; using streaming playback`, error)
        }
      })).then(() => undefined)
    }
    await this.dialoguePreload
  }

  private getContext() {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return null
    if (!this.context) this.context = new AudioCtor()
    return this.context
  }

  async unlock() {
    const context = this.getContext()
    if (!context || context.state !== 'suspended') return
    if (!this.resumePromise) {
      this.resumePromise = context.resume().then(() => undefined).finally(() => { this.resumePromise = null })
    }
    await this.resumePromise
  }

  async preloadGuitar() {
    if (!this.guitarPreload) {
      this.guitarPreload = this.loadGuitarBuffers().catch((error) => {
        this.guitarPreload = null
        console.error('Unable to preload guitar notes', error)
      })
    }
    await this.guitarPreload
  }

  private async loadGuitarBuffers() {
    const context = this.getContext()
    if (!context) return
    await Promise.all(Object.entries(assets.guitar).map(async ([key, url]) => {
      if (this.buffers.has(key as GuitarKey)) return
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()
      this.buffers.set(key as GuitarKey, await context.decodeAudioData(buffer))
    }))
  }

  async playGuitar(key: string) {
    if (!this.enabled) return
    const guitarKey = key as GuitarKey
    const context = this.getContext()
    const buffer = this.buffers.get(guitarKey)
    if (!context || !buffer) return
    try {
      await this.unlock()
    } catch (error) {
      console.error(`Unable to unlock guitar audio for ${key}`, error)
      return
    }
    if (context.state !== 'running') return
    const source = context.createBufferSource()
    const gain = context.createGain()
    gain.gain.value = 0.9
    source.buffer = buffer
    source.connect(gain)
    gain.connect(context.destination)
    source.start()
  }

  playDialogue(name: AudioName): Promise<void> {
    if (!this.enabled) return Promise.resolve()
    const run = (this.dialogueRun.get(name) ?? 0) + 1
    this.dialogueRun.set(name, run)
    return this.preloadDialogue().then(() => new Promise((resolve) => {
      const players = this.dialogue.get(name)
      if (!players || this.dialogueRun.get(name) !== run) {
        resolve()
        return
      }
      const nextIndex = ((this.dialogueIndex.get(name) ?? -1) + 1) % players.length
      this.dialogueIndex.set(name, nextIndex)
      const audio = players[nextIndex]
      audio.pause()
      audio.currentTime = 0
      const finish = () => {
        audio.onended = null
        audio.onerror = null
        audio.oncanplay = null
        audio.onstalled = null
        resolve()
      }
      const play = () => {
        if (this.dialogueRun.get(name) !== run) {
          finish()
          return
        }
        void audio.play().catch((error) => {
          console.error(`Unable to play dialogue ${name}`, error)
          finish()
        })
      }
      audio.onended = finish
      audio.onerror = finish
      audio.onstalled = () => {
        if (audio.paused) return
        void audio.play().catch(() => finish())
      }
      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) play()
      else audio.oncanplay = play
    }))
  }

  stopDialogue(name: AudioName) {
    this.dialogueRun.set(name, (this.dialogueRun.get(name) ?? 0) + 1)
    const players = this.dialogue.get(name)
    if (players) {
      for (const audio of players) {
        audio.onended = null
        audio.onerror = null
        audio.oncanplay = null
        audio.onstalled = null
        audio.pause()
        audio.currentTime = 0
      }
    }
  }

  stopAllDialogue() {
    for (const name of this.dialogue.keys()) this.stopDialogue(name)
  }

  playCameraFlash() {
    if (!this.enabled) return
    console.warn('Camera flash audio is not uploaded; continuing with visual flash.')
  }

  playMusic(name: 'glixon') {
    if (!this.enabled || !this.musicEnabled) return
    this.playDialogue(name)
  }
}
