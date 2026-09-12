import type { Song } from '../data/songs'

type EngineEvent =
  | { type: 'note'; index: number; key: string; elapsed: number }
  | { type: 'judgment'; judgment: 'PERFECT' | 'GOOD' | 'MISS'; key: string }
  | { type: 'complete' }

type EngineListener = (event: EngineEvent) => void

export class GameEngine {
  private song: Song | null = null
  private listener: EngineListener | null = null
  private frame: number | null = null
  private startedAt = 0
  private noteIndex = 0
  private active = false
  private readonly window = { perfect: 0.16, good: 0.32, miss: 0.52 }

  onEvent(listener: EngineListener) { this.listener = listener }

  start(song: Song) {
    this.stop()
    this.song = song
    this.noteIndex = 0
    this.startedAt = performance.now()
    this.active = true
    this.tick()
  }

  pause() {
    this.active = false
    if (this.frame !== null) window.cancelAnimationFrame(this.frame)
  }

  resume() {
    if (!this.song || this.active) return
    this.active = true
    this.startedAt = performance.now() - this.currentElapsed() * 1000
    this.tick()
  }

  stop() {
    this.active = false
    if (this.frame !== null) window.cancelAnimationFrame(this.frame)
    this.frame = null
  }

  press(key: string) {
    if (!this.active || !this.song) return
    const note = this.song.notes[this.noteIndex]
    if (!note) return
    const delta = Math.abs(this.currentElapsed() - note.time)
    if (key !== note.key) {
      this.listener?.({ type: 'judgment', judgment: 'MISS', key })
      return
    }
    const judgment = delta <= this.window.perfect ? 'PERFECT' : delta <= this.window.good ? 'GOOD' : delta <= this.window.miss ? 'MISS' : 'MISS'
    this.listener?.({ type: 'judgment', judgment, key })
    if (judgment !== 'MISS') this.advance()
  }

  getCurrentNote() { return this.song?.notes[this.noteIndex] ?? null }
  getCurrentIndex() { return this.noteIndex }

  private currentElapsed() { return (performance.now() - this.startedAt) / 1000 }

  private advance() {
    this.noteIndex += 1
    if (this.song && this.noteIndex >= this.song.notes.length) {
      this.stop()
      this.listener?.({ type: 'complete' })
    }
  }

  private tick = () => {
    if (!this.active || !this.song) return
    const elapsed = this.currentElapsed()
    const note = this.song.notes[this.noteIndex]
    if (!note) return
    this.listener?.({ type: 'note', index: this.noteIndex, key: note.key, elapsed })
    if (elapsed > note.time + this.window.miss) {
      this.listener?.({ type: 'judgment', judgment: 'MISS', key: note.key })
      this.advance()
    }
    if (this.active) this.frame = window.requestAnimationFrame(this.tick)
  }
}
