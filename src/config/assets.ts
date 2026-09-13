import baijuIntroAudio from '../assets/audio/baiju_intro.mp3'
import glixonRevealAudio from '../assets/audio/glixon_score_reveal.mp3'
import hariDialogueAudio from '../assets/audio/hari_ettan_dialogue.mp3'
import joelDialogueAudio from '../assets/audio/joel_ayyappaa.mp3'
import nadashaDialogueAudio from '../assets/audio/nadasha_dialogue.mp3'
import baijuImage from '../assets/characters/baiju_chettan.webp'
import glixonImage from '../assets/characters/glixon.webp'
import hariProfileImage from '../assets/characters/hari_ettan_profile.webp'
import hariWarningImage from '../assets/characters/hari_ettan_warning.webp'
import joelImage from '../assets/characters/joel_ayyappa.webp'
import mp3KingImage from '../assets/characters/mp3_king_profile.webp'
import nadashaImage from '../assets/characters/nadasha.webp'
import room17Image from '../assets/characters/room17_profile.webp'
import aiCameraImage from '../assets/game/ai_camera.webp'
import fordIkonImage from '../assets/game/ford_ikon.webp'
import guitarImage from '../assets/game/guitar.webp'
import mysorePakImage from '../assets/game/mysore_pak.webp'
const guitarFile = (name: string) => `/assets/audio/guitar/${name}`

export const assets = {
  characters: {
    baiju: baijuImage,
    glixon: glixonImage,
    hariProfile: hariProfileImage,
    hariWarning: hariWarningImage,
    joel: joelImage,
    mp3King: mp3KingImage,
    nadasha: nadashaImage,
    room17: room17Image,
  },
  game: { aiCamera: aiCameraImage, fordIkon: fordIkonImage, guitar: guitarImage, mysorePak: mysorePakImage },
  dialogue: { baiju: baijuIntroAudio, glixon: glixonRevealAudio, hari: hariDialogueAudio, joel: joelDialogueAudio, nadasha: nadashaDialogueAudio },
  guitar: {
    A: guitarFile('A2.wav'),
    S: guitarFile('D-sharp3.wav'),
    D: guitarFile('E2.wav'),
    F: guitarFile('G-sharp3.wav'),
    G: guitarFile('A4.wav'),
    H: guitarFile('C4.wav'),
    J: guitarFile('D-sharp4.wav'),
    K: guitarFile('F-sharp4.wav'),
  },
} as const

export type GuitarKey = keyof typeof assets.guitar
