'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader2, RefreshCw } from 'lucide-react'

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
    <div className={`${isCompact ? 'p-4' : 'p-6 mb-8'} bg-bg-secondary border border-white/10 rounded-xl shadow-xl`}>
      {!isCompact && (
        <div className="flex items-center gap-3 mb-4">
          <div className="text-lg font-semibold text-white font-rajdhani flex items-center gap-2">
            <span className="w-8 h-8 flex items-center justify-center bg-brand-blue/10 rounded-full text-brand-blue text-sm">
              🎧
            </span>
            語音播報
          </div>
        </div>
      )}

      {/* 錯誤狀態 */}
      {state === 'error' && (
        <div className={`flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg ${isCompact ? 'p-2' : 'p-4'} mb-4`}>
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
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-3 text-brand-blue font-ibm text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI 朗讀生成中...</span>
          </div>
        </div>
      )}

      {/* 播放器控制 */}
      {(state === 'ready' || state === 'playing' || state === 'paused') && (
        <div className={isCompact ? 'space-y-3' : 'space-y-4'}>
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
            <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5">
              {[1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
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

      {/* 初始狀態 */}
      {state === 'idle' && (
        <button
          onClick={handleFirstPlay}
          className={`flex items-center justify-center gap-2 w-full ${isCompact ? 'py-2.5 text-xs' : 'py-3 text-base'} bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue rounded-lg transition font-ibm font-bold border border-brand-blue/20 active:scale-95 group`}
        >
          <Play className="w-4 h-4 fill-current group-hover:scale-110 transition" />
          開始語音導讀
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
    </div>
  )
}
