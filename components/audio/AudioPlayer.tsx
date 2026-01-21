'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Loader2, 
  RefreshCw,
  MoreHorizontal,
  FastForward
} from 'lucide-react';
import { toast } from 'sonner';

interface AudioPlayerProps {
  summaryId: string;
}

type PlayerStatus = 'idle' | 'generating' | 'ready' | 'playing' | 'paused' | 'error';

export function AudioPlayer({ summaryId }: AudioPlayerProps) {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGenerateAudio = useCallback(async () => {
    try {
      setStatus('generating');
      const response = await fetch(`/api/summaries/${summaryId}/audio`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();
      setAudioUrl(data.audioUrl);
      setStatus('ready');
    } catch (error) {
      console.error('Error generating audio:', error);
      setStatus('error');
      toast.error('Failed to generate audio. Please try again.');
    }
  }, [summaryId]);

  const togglePlayPause = () => {
    if (status === 'idle' || status === 'error') {
      handleGenerateAudio();
      return;
    }

    if (audioRef.current) {
      if (status === 'playing') {
        audioRef.current.pause();
        setStatus('paused');
      } else {
        audioRef.current.play();
        setStatus('playing');
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || status === 'idle' || status === 'generating') return;

    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setStatus('paused');
    const onPlay = () => setStatus('playing');
    const onPause = () => setStatus('paused');

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [audioUrl]);

  return (
    <div className="w-full bg-bg-secondary border border-bg-tertiary rounded-xl p-4 md:p-6 shadow-lg">
      <audio ref={audioRef} src={audioUrl || undefined} preload="auto" />
      
      {/* Top Section: Info & Progress */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-rajdhani font-semibold text-text-primary uppercase tracking-wider">
              Audio Summary
            </h3>
            {status === 'generating' && (
              <span className="flex items-center gap-1 text-xs text-brand-blue animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-text-secondary">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Progress Bar */}
        <div 
          ref={progressRef}
          className="relative h-2 w-full bg-bg-tertiary rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-brand-blue rounded-full transition-all duration-100"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-white border-2 border-brand-blue rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${(currentTime / duration) * 100 || 0}% - 8px)` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayPause}
              disabled={status === 'generating'}
              className="p-3 bg-brand-blue hover:bg-blue-600 disabled:bg-bg-tertiary text-white rounded-full transition-all active:scale-95 shadow-md glow-blue"
            >
              {status === 'generating' ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : status === 'playing' ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>
            
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = 0;
              }}
              className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-6">
            {/* Playback Rate */}
            <button
              onClick={cyclePlaybackRate}
              className="px-3 py-1 text-xs font-bold bg-bg-tertiary text-text-primary rounded-md border border-bg-tertiary hover:border-text-secondary transition-all"
            >
              {playbackRate}x
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group relative">
              <button onClick={toggleMute} className="text-text-secondary hover:text-text-primary">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 md:w-24 h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-brand-blue"
              />
            </div>

            {status === 'error' && (
              <button
                onClick={handleGenerateAudio}
                className="flex items-center gap-2 text-brand-red text-sm font-semibold hover:glow-red"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
