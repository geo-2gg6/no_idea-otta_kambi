export type SongNote = { key: string; time: number }

export type Song = {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium'
  bpm: number
  notes: SongNote[]
}

const sequence = (keys: string[], gap = 0.72) => keys.map((key, index) => ({ key, time: 0.8 + index * gap }))

export const songs: Song[] = [
  { id: 'bicycle', title: 'Bicycle', difficulty: 'Easy', bpm: 100, notes: sequence(['A', 'A', 'S', 'S', 'D', 'D', 'S', 'A', 'A', 'S', 'S', 'D', 'D', 'S']) },
  { id: 'aaradhike', title: 'Aaradhike', difficulty: 'Easy', bpm: 90, notes: sequence(['A', 'S', 'D', 'F', 'F', 'D', 'A', 'S', 'A', 'S', 'D', 'F', 'F', 'D']) },
  { id: 'chaiyya', title: 'Chaiyya Chaiyya', difficulty: 'Medium', bpm: 120, notes: sequence(['A', 'S', 'D', 'F', 'G', 'F', 'D', 'S', 'A', 'D', 'F', 'G', 'F', 'D', 'S']) },
  { id: 'ilayaraja', title: 'Ilayaraja BGM', difficulty: 'Medium', bpm: 110, notes: sequence(['D', 'F', 'G', 'H', 'G', 'F', 'D', 'A', 'D', 'F', 'G', 'H', 'J', 'H', 'G', 'F']) },
]
