import { useEffect, useRef, useState } from 'react';
import './IntroAudio.css';

const AUDIO_KEY = 'ttt_audio_played';

/**
 * Reproduce un audio una sola vez al abrir la app.
 * Muestra un control para mute/unmute en la esquina.
 */
export default function IntroAudio() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const alreadyPlayed = sessionStorage.getItem(AUDIO_KEY);
    if (alreadyPlayed) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.35;

    // Intentar reproducir tras 800ms (espera a que pase el splash)
    const playTimer = setTimeout(() => {
      audio.play()
        .then(() => {
          setPlaying(true);
          setShown(true);
          sessionStorage.setItem(AUDIO_KEY, '1');
        })
        .catch(() => {
          // Autoplay bloqueado por el navegador. Mostrar boton.
          setShown(true);
        });
    }, 800);

    return () => clearTimeout(playTimer);
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true));
    }
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  }

  return (
    <>
      <audio
        ref={audioRef}
        src="/intro-audio.mp3"
        preload="auto"
        onEnded={() => setPlaying(false)}
      />
      {shown && (
        <div className="intro-audio-control" title={playing ? 'Pausar audio' : 'Reproducir audio'}>
          {playing ? (
            <button onClick={toggleMute} className="audio-btn">
              {muted ? '🔇' : '🔊'}
            </button>
          ) : (
            <button onClick={toggle} className="audio-btn audio-btn-play">▶</button>
          )}
        </div>
      )}
    </>
  );
}
