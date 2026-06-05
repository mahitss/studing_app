import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Music, Layers } from 'lucide-react';

interface SpotifyPlayerProps {
  playlistId?: string;
}

const TRACKS = [
  { title: "Retro Cyber Synth (Lofi)", duration: "3:45", artist: "Grid Runner" },
  { title: "Midnight Matrix Run", duration: "4:12", artist: "Operative Zero" },
  { title: "Deep Brain Waves (Alpha 1)", duration: "5:00", artist: "Neural Sync" },
  { title: "Operative Concentration Loop", duration: "3:30", artist: "Tokyo Ghost" }
];

export default function SpotifyPlayer({ playlistId = "37i9dQZF1DX8Ueb9CidzhR" }: SpotifyPlayerProps) {
  const [activeTab, setActiveTab] = useState<'embed' | 'simulated'>('simulated');
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(70);
  
  const currentTrack = TRACKS[trackIndex];
  
  // Progress simulation
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setTrackIndex((prevIdx) => (prevIdx + 1) % TRACKS.length);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => {
    setTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setProgress(0);
  };
  const prevTrack = () => {
    setTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setProgress(0);
  };

  const getFormatTime = (percent: number) => {
    const [minStr, secStr] = currentTrack.duration.split(":");
    const totalSecs = parseInt(minStr) * 60 + parseInt(secStr);
    const currentSecs = Math.floor((percent / 100) * totalSecs);
    const m = Math.floor(currentSecs / 60);
    const s = currentSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card overflow-hidden h-full min-h-[350px] flex flex-col border border-white/5 bg-black/40">
      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-white/5">
        <button
          onClick={() => setActiveTab('simulated')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'simulated' 
              ? 'border-accent text-accent bg-accent/5' 
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          <Layers size={12} />
          Neural Controller
        </button>
        <button
          onClick={() => setActiveTab('embed')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'embed' 
              ? 'border-accent text-accent bg-accent/5' 
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          <Music size={12} />
          Live Stream Embed
        </button>
      </div>

      <div className="flex-1 flex flex-col p-4 justify-center">
        {activeTab === 'embed' ? (
          <div className="flex-1 min-h-[300px] relative">
            <iframe 
              style={{ borderRadius: "12px" }}
              src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`} 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              allowFullScreen 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between py-2 space-y-6">
            {/* Visualizer Graph and Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-accent animate-pulse shadow-[0_0_10px_rgba(var(--color-accent),0.8)]' : 'bg-white/20'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted">
                  {isPlaying ? "Neural Uplink Sync active" : "Audio Loop Paused"}
                </span>
              </div>

              {/* Visualizer Waves */}
              <div className="h-16 flex items-end justify-between gap-1 px-2 py-1 bg-black/60 rounded-xl border border-white/5">
                {[...Array(24)].map((_, i) => {
                  const animationDuration = `${0.5 + Math.random() * 0.8}s`;
                  const animationDelay = `${Math.random() * 0.5}s`;
                  return (
                    <div
                      key={i}
                      className="w-1.5 bg-accent/80 rounded-t-sm transition-all"
                      style={{
                        height: isPlaying ? `${20 + Math.random() * 80}%` : '10%',
                        animation: isPlaying ? `bounce ${animationDuration} ease-in-out ${animationDelay} infinite alternate` : 'none'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Track metadata */}
            <div className="text-center">
              <p className="text-sm font-bold text-white uppercase tracking-wider">{currentTrack.title}</p>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">{currentTrack.artist}</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer relative">
                <div 
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-mono text-white/50 tracking-wider">
                <span>{getFormatTime(progress)}</span>
                <span>{currentTrack.duration}</span>
              </div>
            </div>

            {/* Deck Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={12} className="text-muted" />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-16 h-1 accent-accent bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={prevTrack} 
                  className="p-2 bg-white/5 rounded-lg border border-white/5 hover:border-accent/40 text-white/80 hover:text-accent transition-all"
                >
                  <SkipBack size={16} />
                </button>
                <button 
                  onClick={togglePlay} 
                  className="p-3 bg-accent text-black rounded-xl hover:bg-accent/80 shadow-[0_0_15px_rgba(var(--color-accent),0.3)] hover:scale-105 transition-all"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button 
                  onClick={nextTrack} 
                  className="p-2 bg-white/5 rounded-lg border border-white/5 hover:border-accent/40 text-white/80 hover:text-accent transition-all"
                >
                  <SkipForward size={16} />
                </button>
              </div>

              <div className="w-16" />
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0% { height: 15%; }
          100% { height: 95%; }
        }
      `}</style>
    </div>
  );
}
