import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
    Volume2, VolumeX, Volume1, Loader2, Download, Maximize2, Minimize2, X
  } from 'lucide-react';

// Custom Audio Player Component
export const CustomAudioPlayer = ({ src, captionSrc }) => {
    // State variables
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
  
    // Refs for audio element and player container
    const audioRef = useRef(null);
    const volumeControlRef = useRef(null);
  
    // --- Effects ---
  
    // Effect to track dark mode changes for dynamic styling
    useEffect(() => {
      const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      checkDarkMode(); // Initial check
      return () => observer.disconnect();
    }, []);
  
  
    // Effect to setup audio event listeners and cleanup
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
  
      // Event Handlers
      const handleLoadedData = () => {
        setDuration(audio.duration);
        setCurrentTime(audio.currentTime);
        setIsLoading(false);
      };
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        if (isLoading && !audio.paused && audio.readyState > 2) setIsLoading(false);
      };
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      const handleWaiting = () => setIsLoading(true);
      const handlePlaying = () => setIsLoading(false);
      const handleCanPlay = () => setIsLoading(false);
  
      // Add Event Listeners
      audio.addEventListener('loadeddata', handleLoadedData);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('waiting', handleWaiting);
      audio.addEventListener('playing', handlePlaying);
      audio.addEventListener('canplay', handleCanPlay);
  
      // Cleanup Function
      return () => {
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }, [isLoading]);
  
    // Effect to handle clicks outside the volume control
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (volumeControlRef.current && !volumeControlRef.current.contains(event.target)) {
          setShowVolumeSlider(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
  
    // --- Control Handlers ---
  
    const playPauseHandler = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(err => {
          console.error("Playback failed:", err);
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    };
  
    const handleTimeChange = (e) => {
      const newTime = parseFloat(e.target.value);
      if (audioRef.current && !isNaN(newTime)) {
         audioRef.current.currentTime = newTime;
         setCurrentTime(newTime);
      }
    };
  
    const skipBackward = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
      }
    };
  
    const skipForward = () => {
      if (audioRef.current && duration) {
        audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
      }
    };
  
    const toggleMute = () => {
      const audio = audioRef.current;
      if (!audio) return;
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      audio.muted = newMutedState;
      if (!newMutedState && volume === 0) {
        setVolume(0.5);
        audio.volume = 0.5;
      }
    };
  
    const handleVolumeChange = (e) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (audioRef.current) {
         audioRef.current.volume = newVolume;
      }
      if (newVolume === 0) {
        setIsMuted(true);
        if (audioRef.current) audioRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        if (audioRef.current) audioRef.current.muted = false;
      }
    };
  
  
    // --- Helper Functions ---
  
    const formatTime = (time) => {
      if (isNaN(time) || time === Infinity) return "0:00";
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
  
    const getVolumeIcon = () => {
      if (isMuted || volume === 0) return <VolumeX size={20} />;
      if (volume < 0.5) return <Volume1 size={20} />;
      return <Volume2 size={20} />;
    };
  
    const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  
    // Define accent colors based on dark mode state
    const accentColorLight = '#111827'; // gray-900 (almost black)
    const accentColorDark = '#2563eb'; // blue-600
    const accentColor = isDarkMode ? accentColorDark : accentColorLight;
    const trackBgColor = isDarkMode ? '#4b5563' : '#e5e7eb'; // gray-600 dark, gray-200 light
  
    // --- Render ---
    return (
      // Added pb-6 md:pb-8 for extra bottom padding
      <div
        className="w-full p-4 md:p-6 pb-6 md:pb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-colors duration-300 relative"
      >
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={() => {
              if (audioRef.current) {
                  setDuration(audioRef.current.duration);
                  setCurrentTime(audioRef.current.currentTime);
                  setIsLoading(false);
              }
          }}
          className="hidden"
        >
          {captionSrc && (
            <track src={captionSrc} kind="captions" srcLang="en" label="English" default />
          )}
        </audio>
  
  
        {/* Progress Bar and Time */}
        <div className="mb-4"> {/* Reduced margin bottom slightly to compensate for overall padding */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleTimeChange}
            disabled={isLoading || !duration}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-black dark:accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Audio progress"
            style={{
              background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${progressPercent}%, ${trackBgColor} ${progressPercent}%, ${trackBgColor} 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
  
        {/* Control Buttons - Rearranged Layout */}
        {/* Added h-8 to give controls a fixed height, preventing layout shift */}
        <div className="flex items-center justify-center relative h-8"> {/* Centering wrapper */}
           {/* Center Controls (Prev, Play/Pause, Next) */}
           <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-3 md:space-x-4">
             <button
               onClick={skipBackward}
               disabled={isLoading}
               className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
               aria-label="Skip Backward 10 seconds"
               title="Skip Backward 10s"
             >
               <SkipBack size={20} />
             </button>
  
             <button
               onClick={playPauseHandler}
               disabled={!duration && isLoading}
               className="p-3 rounded-full bg-black text-white hover:bg-gray-800 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-60 disabled:cursor-wait"
               aria-label={isPlaying ? "Pause" : "Play"}
             >
               {isLoading ? (
                 <Loader2 size={24} className="animate-spin" />
               ) : isPlaying ? (
                 <Pause size={24} fill="currentColor" />
               ) : (
                 <Play size={24} fill="currentColor" />
               )}
             </button>
  
             <button
               onClick={skipForward}
               disabled={isLoading}
               className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
               aria-label="Skip Forward 10 seconds"
               title="Skip Forward 10s"
             >
               <SkipForward size={20} />
             </button>
           </div>
  
           {/* Right Controls (Volume, Download) */}
           <div className="absolute right-0 flex items-center space-x-3 md:space-x-4">
              {/* Volume Control */}
              <div className="relative flex items-center" ref={volumeControlRef}>
                <button
                  onClick={toggleMute}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {getVolumeIcon()}
                </button>
                 <div
                   className={`absolute bottom-full right-0 transform translate-x-1/4 mb-2 p-2 bg-white dark:bg-gray-900 rounded-md shadow-lg transition-opacity duration-200 ${showVolumeSlider ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                   onMouseEnter={() => setShowVolumeSlider(true)}
                   onMouseLeave={() => setShowVolumeSlider(false)}
                 >
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.01"
                     value={isMuted ? 0 : volume}
                     onChange={handleVolumeChange}
                     className="w-20 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-black dark:accent-blue-600"
                     aria-label="Volume control"
                   />
                 </div>
              </div>
  
              {/* Download Button */}
              <a
                href={src}
                download
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Download audio"
                aria-label="Download audio"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={18} />
              </a>
           </div>
        </div>
      </div>
    );
  };
  