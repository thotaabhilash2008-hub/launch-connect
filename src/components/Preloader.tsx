"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Volume2, VolumeX, SkipForward, Sparkles } from "lucide-react";

type PreloadPhase = "launching" | "ready" | "post-launching" | "done";

export function Preloader() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [phase, setPhase] = useState<PreloadPhase>("launching");
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLaunchingClicked, setIsLaunchingClicked] = useState(false);

  const launchVideoRef = useRef<HTMLVideoElement>(null);
  const postLaunchVideoRef = useRef<HTMLVideoElement>(null);

  const handleDismiss = useCallback(() => {
    if (launchVideoRef.current) launchVideoRef.current.pause();
    if (postLaunchVideoRef.current) postLaunchVideoRef.current.pause();
    setIsLoading(false);
    setPhase("done");
    sessionStorage.setItem("hasVisitedConnectClub", "true");
  }, []);

  // Check if visited in current session
  useEffect(() => {
    const hasVisited = sessionStorage.getItem("hasVisitedConnectClub");

    if (!hasVisited) {
      setIsLoading(true);
      setPhase("launching");
    } else {
      setIsLoading(false);
      setPhase("done");
    }
    setHasChecked(true);

    // Global event to replay launch & intro
    const handleReplay = () => {
      setIsLoading(true);
      setPhase("launching");
      setIsLaunchingClicked(false);
      setProgress(0);

      if (launchVideoRef.current) {
        launchVideoRef.current.currentTime = 0;
        launchVideoRef.current.play().catch(() => {});
      }
      if (postLaunchVideoRef.current) {
        postLaunchVideoRef.current.currentTime = 0;
        postLaunchVideoRef.current.pause();
      }
    };

    window.addEventListener("open-intro-video", handleReplay);
    return () => window.removeEventListener("open-intro-video", handleReplay);
  }, []);

  // Ensure video starts playing immediately when preloader appears
  useEffect(() => {
    if (isLoading && phase === "launching" && launchVideoRef.current) {
      launchVideoRef.current.play().catch(() => {});
    }
  }, [isLoading, phase]);

  // Target timestamp where the glass launch card settles and the launch slot appears
  const LAUNCH_READY_TIMESTAMP = 9.50;

  // Handle launch video time update & end
  const handleLaunchTimeUpdate = () => {
    if (!launchVideoRef.current) return;
    const current = launchVideoRef.current.currentTime;
    const total = launchVideoRef.current.duration;

    if (total > 0) {
      setProgress(Math.min(100, Math.round((current / LAUNCH_READY_TIMESTAMP) * 100)));
      // Stop precisely when the launch space arrives and reveal the launch button
      if (current >= LAUNCH_READY_TIMESTAMP && phase === "launching") {
        launchVideoRef.current.pause();
        launchVideoRef.current.currentTime = LAUNCH_READY_TIMESTAMP;
        setPhase("ready");
      }
    }
  };

  const handleLaunchVideoEnded = () => {
    if (phase === "launching") {
      setPhase("ready");
    }
  };

  // Handle post-launch video time update & completion
  const handlePostLaunchTimeUpdate = () => {
    if (!postLaunchVideoRef.current) return;
    const current = postLaunchVideoRef.current.currentTime;
    const total = postLaunchVideoRef.current.duration;
    if (total > 0) {
      setProgress(Math.min(100, Math.round((current / total) * 100)));
    }
  };

  const handlePostLaunchEnded = () => {
    handleDismiss();
  };

  // User clicks the Launch button
  const handleLaunchButtonClick = () => {
    if (isLaunchingClicked) return;
    setIsLaunchingClicked(true);

    // Unmute for the post-launch sequence now that user interacted
    setIsMuted(false);

    // Brief tactile delay for button burst animation, then start post-launch video
    setTimeout(() => {
      setPhase("post-launching");
      setProgress(0);

      if (launchVideoRef.current) {
        launchVideoRef.current.pause();
      }

      if (postLaunchVideoRef.current) {
        postLaunchVideoRef.current.muted = false;
        postLaunchVideoRef.current.currentTime = 0;
        postLaunchVideoRef.current
          .play()
          .catch(() => {
            // Fallback if browser requires muted
            if (postLaunchVideoRef.current) {
              postLaunchVideoRef.current.muted = true;
              postLaunchVideoRef.current.play().catch(() => {});
            }
          });
      }
    }, 280);
  };

  // Toggle sound
  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (phase === "launching" && launchVideoRef.current) {
      launchVideoRef.current.muted = nextMuted;
    } else if (phase === "post-launching" && postLaunchVideoRef.current) {
      postLaunchVideoRef.current.muted = nextMuted;
    }
  };

  // Keyboard shortcut: Escape to skip, Enter/Space to Launch when ready
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLoading) return;
      if (e.key === "Escape") {
        handleDismiss();
      } else if ((e.key === "Enter" || e.key === " ") && phase === "ready") {
        e.preventDefault();
        handleLaunchButtonClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, phase, handleDismiss, isLaunchingClicked]);

  if (!hasChecked) return null;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="preloader-overlay"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] },
          }}
          className="fixed inset-0 z-[100] bg-black overflow-hidden flex items-center justify-center select-none"
        >
          {/* Fullscreen Video Canvas: scales to cover entire screen without black letterboxes */}
          <div
            className="relative flex items-center justify-center shrink-0"
            style={{
              width: "max(100vw, calc(100vh * (16 / 9)))",
              height: "max(100vh, calc(100vw * (9 / 16)))",
              aspectRatio: "16 / 9",
            }}
          >
            {/* Launch Video (First stage) */}
            <video
              ref={launchVideoRef}
              src="/launch3.mp4"
              autoPlay
              playsInline
              preload="auto"
              muted={isMuted}
              onCanPlay={(e) => {
                if (phase === "launching" && e.currentTarget.paused) {
                  e.currentTarget.play().catch(() => {});
                }
              }}
              onTimeUpdate={handleLaunchTimeUpdate}
              onEnded={handleLaunchVideoEnded}
              style={{ imageRendering: "auto" }}
              className={`absolute inset-0 w-full h-full object-cover contrast-[1.03] transition-opacity duration-300 ${
                phase === "post-launching" ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            />

            {/* Post Launch Video (Second stage, preloaded) */}
            <video
              ref={postLaunchVideoRef}
              src="/post-launch2.mp4"
              preload="auto"
              playsInline
              muted={isMuted}
              onTimeUpdate={handlePostLaunchTimeUpdate}
              onEnded={handlePostLaunchEnded}
              style={{ imageRendering: "auto" }}
              className={`absolute inset-0 w-full h-full object-cover contrast-[1.03] transition-opacity duration-300 ${
                phase === "post-launching" ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />

            {/* Launch Button Placed Exactly Inside the Glass Card Slot */}
            <AnimatePresence>
              {(phase === "ready" || (phase === "launching" && isLaunchingClicked)) && (
                <motion.div
                  key="launch-button-container"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  style={{
                    position: "absolute",
                    top: "75%",
                    left: "17%",
                    width: "66%",
                    height: "17%",
                  }}
                  className="z-30 flex items-center justify-center pointer-events-auto"
                >
                  <motion.button
                    type="button"
                    onClick={handleLaunchButtonClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={isLaunchingClicked}
                    className="relative w-full h-full overflow-hidden cursor-pointer group flex items-center justify-center"
                    style={{
                      borderRadius: "6px",
                      background: "linear-gradient(135deg, rgba(10,4,28,0.96) 0%, rgba(30,12,60,0.96) 50%, rgba(10,4,28,0.96) 100%)",
                      border: "1px solid rgba(168,85,247,0.8)",
                      boxShadow: "0 0 18px rgba(168,85,247,0.6), inset 0 0 18px rgba(90,30,180,0.25), 0 0 4px rgba(168,85,247,0.9)",
                    }}
                  >
                    {/* Top edge laser line */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-80 pointer-events-none" />
                    {/* Bottom edge laser line */}
                    <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent pointer-events-none" />

                    {/* Corner hex accents — top-left */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-300/90 pointer-events-none" style={{ borderRadius: "0 0 4px 0" }} />
                    {/* Corner hex accents — top-right */}
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-purple-300/90 pointer-events-none" style={{ borderRadius: "0 0 0 4px" }} />
                    {/* Corner hex accents — bottom-left */}
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-purple-300/90 pointer-events-none" style={{ borderRadius: "0 4px 0 0" }} />
                    {/* Corner hex accents — bottom-right */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-purple-300/90 pointer-events-none" style={{ borderRadius: "4px 0 0 0" }} />

                    {/* Scan-line shimmer sweep */}
                    <motion.div
                      initial={{ x: "-110%" }}
                      animate={{ x: "210%" }}
                      transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut", repeatDelay: 0.8 }}
                      className="absolute inset-0 w-2/5 h-full bg-gradient-to-r from-transparent via-purple-300/15 to-transparent skew-x-12 pointer-events-none"
                    />

                    {/* Subtle grid pattern background */}
                    <div
                      className="absolute inset-0 opacity-10 pointer-events-none"
                      style={{
                        backgroundImage: "linear-gradient(rgba(168,85,247,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.4) 1px, transparent 1px)",
                        backgroundSize: "12px 12px",
                      }}
                    />

                    {/* Hover glow pulse */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: "radial-gradient(ellipse at center, rgba(168,85,247,0.18) 0%, transparent 70%)" }}
                    />

                    {/* Button content: rocket left, text center */}
                    <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                      {/* Live status indicator */}
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>

                      {/* Rocket icon - left of text */}
                      {!isLaunchingClicked && (
                        <Rocket
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-300 group-hover:text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200 shrink-0"
                        />
                      )}

                      {/* Main text */}
                      <span
                        className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold tracking-[0.18em] text-white/95 group-hover:text-white transition-colors duration-200 whitespace-nowrap"
                        style={{ fontFamily: "'Courier New', monospace", textShadow: "0 0 12px rgba(168,85,247,0.9)" }}
                      >
                        {isLaunchingClicked ? "INITIATING..." : "LAUNCH WEBSITE"}
                      </span>

                      {/* Spinning loader shown on click */}
                      {isLaunchingClicked && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-transparent border-t-purple-300 shrink-0"
                        />
                      )}
                    </div>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>


            {/* Gemini Logo Mask — Cyber Watermark Badge fully covering the Gemini watermark */}
            <div
              style={{
                position: "absolute",
                left: "87.5%",
                top: "74.5%",
                width: "7.5%",
                height: "12.5%",
                background: "linear-gradient(135deg, #0b0318 0%, #05010c 100%)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                boxShadow: "0 0 15px rgba(147, 51, 234, 0.25), inset 0 0 10px rgba(147, 51, 234, 0.15)",
                borderRadius: "8px",
              }}
              className="z-30 pointer-events-none select-none flex flex-col items-center justify-center p-2 text-center overflow-hidden"
            >
              {/* Subtle cyber scanline grid overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: "linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px)",
                  backgroundSize: "100% 4px",
                }}
              />

              {/* Status Header: Pulse dot + Brand */}
              <div className="relative flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse shrink-0" />
                <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-purple-200 uppercase whitespace-nowrap">
                  CONNECT CLUB
                </span>
              </div>

              {/* Copyright Notice */}
              <span className="relative text-[6px] sm:text-[7px] font-mono tracking-widest text-purple-300/60 uppercase whitespace-nowrap font-medium">
                © ALL RIGHTS RESERVED
              </span>

              {/* Cyber HUD Corner Accents */}
              <span className="absolute top-0.5 left-0.5 text-[6px] text-purple-400/50 leading-none select-none">⌜</span>
              <span className="absolute top-0.5 right-0.5 text-[6px] text-purple-400/50 leading-none select-none">⌝</span>
              <span className="absolute bottom-0.5 left-0.5 text-[6px] text-purple-400/50 leading-none select-none">⌞</span>
              <span className="absolute bottom-0.5 right-0.5 text-[6px] text-purple-400/50 leading-none select-none">⌟</span>
            </div>
          </div>

          {/* Top Bar Controls (Floating Audio & Skip) */}
          <div className="absolute top-5 inset-x-5 z-40 flex items-center justify-between pointer-events-none">
            {/* Audio Toggle Pill */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={toggleSound}
              className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/90 hover:text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
              title={isMuted ? "Click to enable sound" : "Mute sound"}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Sound Off</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Sound On</span>
                </>
              )}
            </motion.button>

            {/* Skip Button */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={handleDismiss}
              className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/90 hover:text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-lg group active:scale-95"
              title="Skip into website directly"
            >
              <span>Skip</span>
              <SkipForward className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </div>

          {/* Bottom Sleek Progress Bar */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-40">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
