'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader2, RefreshCw, Sparkles } from 'lucide-react'

interface AudioPlayerProps {
  summaryId: string
  initialAudioUrl?: string | null
  variant?: 'default' | 'compact'
}

type PlayerState = 'idle' | 'generating' | 'ready' | 'playing' | 'paused' | 'error'

export function AudioPlayer({ summaryId, initialAudioUrl, variant = 'default' }: AudioPlayerProps) {
  const [state, setState] = useState<PlayerState>(initialAudioUrl ? 'ready' : 'idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)

  const isCompact = variant === 'compact'

  // 生成語音
  const generateAudio = async () => {
    setState('generating')
    setError(null)

    try {
      const res = await fetch(`/api/summaries/${summaryId}/audio`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '生成失敗')
      }

      const { audioUrl: url } = await res.json()
      setAudioUrl(url)
      setState('ready')

      // 自動播放
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.error)
        }
      }, 100)
    } catch (err: any) {
      console.error('音訊生成失敗:', err)
      setError(err.message)
      setState('error')
    }
  }

  // 播放/暫停
  const togglePlay = () => {
    if (!audioRef.current) return

    if (state === 'playing') {
      audioRef.current.pause()
      setState('paused')
    } else {
      audioRef.current.play().catch(console.error)
      setState('playing')
    }
  }

  // 首次播放
  const handleFirstPlay = () => {
    if (audioUrl) {
      togglePlay()
    } else {
      generateAudio()
    }
  }

  // 進度條拖曳
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  // 音量調整
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
    if (vol > 0) setIsMuted(false)
  }

  // 靜音切換
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
    }
  }

  // 播放速度
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  // 音訊事件監聽
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleEnded = () => setState('paused')
    const handlePlay = () => setState('playing')
    const handlePause = () => setState('paused')

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [audioUrl])

  // 格式化時間
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`${isCompact ? 'p-4' : 'p-6 mb-8'} bg-bg-secondary border border-white/10 rounded-xl shadow-xl overflow-hidden relative group/player`}>
      {/* 背景裝飾 (Gemini 風格微弱發光) */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-blue/5 blur-[80px] rounded-full" />
      
      {!isCompact && (
        <div className="flex items-center gap-3 mb-4">
          <div className="text-lg font-semibold text-white font-rajdhani flex items-center gap-2">
            <span className="w-8 h-8 flex items-center justify-center bg-brand-blue/10 rounded-full text-brand-blue text-sm">
              <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            </span>
            AI 語音導讀
          </div>
        </div>
      )}

      {/* 生成中狀態背景動畫 */}
      {state === 'generating' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/10 via-purple-500/10 to-brand-blue/10 animate-shimmer" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_60%)] animate-breathe" />
          </div>
        </div>
      )}

      {/* 錯誤狀態 */}
      {state === 'error' && (
        <div className={`flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg ${isCompact ? 'p-2' : 'p-4'} mb-4 relative z-10`}>
          <p className="text-red-400 text-xs font-ibm">{error || '生成失敗'}</p>
          <button
            onClick={generateAudio}
            className="flex items-center gap-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition font-ibm text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            重試
          </button>
        </div>
      )}

      {/* 生成中狀態 */}
      {state === 'generating' && (
        <div className="flex flex-col gap-2 py-2 relative z-10">
          <div className="flex items-center gap-3 text-brand-blue font-ibm text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
            <span className="animate-pulse tracking-wide text-base">正在喚醒 AI 導讀助理...</span>
          </div>
          <div className="flex items-center gap-2 pl-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className="w-1 h-1 bg-brand-blue/60 rounded-full animate-bounce" 
                  style={{ animationDelay: `${i * 0.15}s` }} 
                />
              ))}
            </div>
            <span className="text-[11px] text-text-secondary/80 font-ibm">正在將摘要轉化為流暢語音</span>
          </div>
        </div>
      )}

      {/* 播放器控制 */}
      {(state === 'ready' || state === 'playing' || state === 'paused') && (
        <div className={isCompact ? 'space-y-3 relative z-10' : 'space-y-4 relative z-10'}>
          {/* 進度條 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-secondary min-w-[35px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-blue
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue"
            />
            <span className="text-[10px] font-mono text-text-secondary min-w-[35px]">
              {formatTime(duration)}
            </span>
          </div>

          {/* 控制按鈕區 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 lg:gap-4">
              {/* 播放/暫停 */}
              <button
                onClick={togglePlay}
                className={`${isCompact ? 'w-9 h-9' : 'w-12 h-12'} flex items-center justify-center bg-brand-blue hover:bg-blue-600 text-white rounded-full transition active:scale-95 shadow-lg shadow-blue-500/20`}
              >
                {state === 'playing' ? (
                  <Pause className={isCompact ? 'w-4 h-4 fill-current' : 'w-6 h-6 fill-current'} />
                ) : (
                  <Play className={`${isCompact ? 'w-4 h-4 fill-current ml-0.5' : 'w-6 h-6 fill-current ml-1'}`} />
                )}
              </button>

              {/* 音量控制 */}
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/5 rounded transition text-text-secondary"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* 播放速度 */}
            <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5 text-[10px]">
              {[1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`px-2 py-0.5 font-bold rounded transition ${
                    playbackRate === rate
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 初始狀態 (Gemini 風格按鈕) */}
      {state === 'idle' && (
        <button
          onClick={handleFirstPlay}
          className={`relative overflow-hidden flex items-center justify-center gap-2.5 w-full ${isCompact ? 'py-2.5 text-xs' : 'py-3.5 text-base'} bg-gradient-to-br from-brand-blue/20 via-blue-400/20 to-purple-500/20 hover:from-brand-blue/30 hover:via-blue-400/30 hover:to-purple-500/30 text-white rounded-xl transition-all duration-500 font-ibm font-bold border border-white/10 hover:border-white/20 active:scale-95 group/btn shadow-[0_4px_15px_rgba(0,0,0,0.2)]`}
        >
          {/* 光影動效 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
          
          <div className="relative flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-300 group-hover/btn:text-white transition-colors duration-500 group-hover/btn:animate-spin-slow" />
            <span className="relative z-10">AI 語音導讀</span>
          </div>
        </button>
      )}

      {/* 隱藏的 audio 元素 */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          preload="metadata" 
          autoPlay={state === 'ready'} 
        />
      )}

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }
        .animate-breathe {
          animation: breathe 4s ease-in-out infinite;
        }
        :global(.group-hover\/btn\:animate-spin-slow) {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  )
}
