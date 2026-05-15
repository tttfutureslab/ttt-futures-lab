import { useEffect, useRef, useState } from 'react';
import './IntroAudio.css';

const AUDIO_KEY = 'ttt_intro_played';

export default function IntroAudio() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [shown, setShown] = useState(false);
  const [hasFile, setHasFile] = useState(true);

  useEffect(() => {
    const alreadyPlayed = sessionStorage.getItem(AUDIO_KEY);
    if (alreadyPlayed) return;

    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;

    const playTimer = setTimeout(() => {
      audio.play()
        .then(() => {
          setPlaying(true);
          setShown(true);
          sessionStorage.setItem(AUDIO_KEY, '1');
        })
        .catch(() => setShown(true));
    }, 1500);

    return () => clearTimeout(playTimer);
  }, []);

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  }

  function play() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setPlaying(true)).catch(() => {});
  }

  if (!hasFile) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src="/intro-audio.mp3"
        preload="auto"
        onError={() => setHasFile(false)}
        onEnded={() => setPlaying(false)}
      />
      {shown && (
        <div className="intro-audio-control">
          {playing ? (
            <button onClick={toggleMute} className="audio-btn" title={muted ? 'Quitar mute' : 'Silenciar'}>
              {muted ? '🔇' : '🔊'}
            </button>
          ) : (
            <button onClick={play} className="audio-btn audio-btn-play" title="Reproducir">▶</button>
          )}
        </div>
      )}
    </>
  );
}
