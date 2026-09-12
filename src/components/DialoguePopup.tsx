import type { ReactNode } from 'react'

type DialoguePopupProps = {
  image: string
  alt: string
  title?: string
  children: ReactNode
  buttonLabel: string
  onClose: () => void
  onContinue: () => void
  audioReady: boolean
  className?: string
}

export function DialoguePopup({ image, alt, title, children, buttonLabel, onClose, onContinue, audioReady, className = '' }: DialoguePopupProps) {
  return (
    <div className={`modal-backdrop ${className}`}>
      <div className="dialog-box">
        <button className="close-btn" type="button" onClick={onClose} disabled={!audioReady} aria-label="Close dialogue">×</button>
        <img className="dialog-character" src={image} alt={alt} />
        <div className="dialog-copy">
          <div className="speech-bubble">{title ?? 'AYYAPPAA!'}</div>
          {children}
          <button className="main-btn" type="button" onClick={onContinue} disabled={!audioReady}>{audioReady ? buttonLabel : 'PLAYING...'}</button>
        </div>
      </div>
    </div>
  )
}
