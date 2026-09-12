import { assets, type GuitarKey } from '../config/assets'

type AudioName = keyof typeof assets.dialogue

export class AudioEngine {
  private context: AudioContext | null = null
  private buffers = new Map<GuitarKey, AudioBuffer>()
  private dialogue = new Map<AudioName, HTMLAudioElement>()
  private enabled = true
  private musicEnabled = true

  constructor() {
    for (const [name, url] of Object.entries(assets.dialogue)) {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audio.load()
      this.dialogue.set(name as AudioName, audio)
    }
  }

  setEnabled(value: boolean) { this.enabled = value }
  setMusicEnabled(value: boolean) { this.musicEnabled = value }

  private async getContext() {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return null
    if (!this.context) this.context = new AudioCtor()
    if (this.context.state === 'suspended') await this.context.resume()
    return this.context
  }

  async preloadGuitar() {
    const context = await this.getContext()
    if (!context) return
    await Promise.all(Object.entries(assets.guitar).map(async ([key, url]) => {
      if (this.buffers.has(key as GuitarKey)) return
      try {
        const response = await fetch(url)
        const buffer = await response.arrayBuffer()
        this.buffers.set(key as GuitarKey, await context.decodeAudioData(buffer))
      } catch (error) {
        console.error(`Unable to preload guitar note ${key}`, error)
      }
    }))
  }

  async playGuitar(key: string) {
    if (!this.enabled) return
    const guitarKey = key as GuitarKey
    const context = await this.getContext()
    if (!context) return
    let buffer = this.buffers.get(guitarKey)
    if (!buffer) {
      try {
        const response = await fetch(assets.guitar[guitarKey])
        buffer = await context.decodeAudioData(await response.arrayBuffer())
        this.buffers.set(guitarKey, buffer)
      } catch (error) {
        console.error(`Unable to play guitar note ${key}`, error)
        return
      }
    }
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
    const audio = this.dialogue.get(name)
    if (!audio) return Promise.resolve()
    audio.currentTime = 0
    return new Promise((resolve) => {
      const finish = () => resolve()
      const play = () => {
        void audio.play().catch((error) => {
          console.error(`Unable to play dialogue ${name}`, error)
          resolve()
        })
      }
      audio.addEventListener('ended', finish, { once: true })
      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) play()
      else audio.addEventListener('canplay', play, { once: true })
    })
  }

  stopDialogue(name: AudioName) {
    const audio = this.dialogue.get(name)
    if (audio) {
      audio.pause()
      audio.currentTime = 0
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
