"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  // =========================
  // CHAT STATE
  // =========================

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  // =========================
  // DOWNLOAD STATE
  // =========================

  const [isDownloading, setIsDownloading] = useState(false);

  // =========================
  // VIDEO STATE
  // =========================

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const remoteActionRef = useRef(false);

  // Video list
  const videoSources = [
    "/sample.mp4",
    "/sample2.mp4",
  ];

  const videoTitles = [
    "Video 1",
    "Video 2",
  ];

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // =========================
  // CURRENT VIDEO
  // =========================

  const currentVideoSource = videoSources[currentVideoIndex];

  // =========================
  // SOCKET.IO CONNECTION
  // =========================

  useEffect(() => {
    const socket = io("http://localhost:5000");

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected:", socket.id);

      socket.emit("joinRoom", roomId);

      console.log("Joined room:", roomId);
    });

    // =========================
    // RECEIVE CHAT MESSAGE
    // =========================

    socket.on("message", (incomingMessage: string) => {
      console.log("Received:", incomingMessage);

      setMessages((prevMessages) => [
        ...prevMessages,
        incomingMessage,
      ]);
    });

    // =========================
    // RECEIVE VIDEO PLAY
    // =========================

    socket.on(
      "video:play",
      ({ currentTime }: { currentTime: number }) => {
        const video = videoRef.current;

        if (!video) {
          return;
        }

        remoteActionRef.current = true;

        video.currentTime = currentTime;

        video.play().catch((error) => {
          console.log("Video play error:", error);
        });

        setTimeout(() => {
          remoteActionRef.current = false;
        }, 500);
      }
    );

    // =========================
    // RECEIVE VIDEO PAUSE
    // =========================

    socket.on(
      "video:pause",
      ({ currentTime }: { currentTime: number }) => {
        const video = videoRef.current;

        if (!video) {
          return;
        }

        remoteActionRef.current = true;

        video.currentTime = currentTime;

        video.pause();

        setTimeout(() => {
          remoteActionRef.current = false;
        }, 500);
      }
    );

    // =========================
    // RECEIVE VIDEO CHANGE
    // =========================

    socket.on(
      "video:change",
      ({ videoIndex }: { videoIndex: number }) => {
        if (
          videoIndex < 0 ||
          videoIndex >= videoSources.length
        ) {
          return;
        }

        remoteActionRef.current = true;

        setCurrentVideoIndex(videoIndex);

        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        setIsLoading(true);

        setTimeout(() => {
          remoteActionRef.current = false;
        }, 700);
      }
    );

    // =========================
    // CLEANUP
    // =========================

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  // =========================
  // CHAT
  // =========================

  function sendMessage() {
    if (message.trim() === "") {
      return;
    }

    socketRef.current?.emit("message", {
      roomId: roomId,
      message: message.trim(),
    });

    setMessage("");
  }

  // =========================
  // VIDEO PLAY
  // =========================

  function handleVideoPlay() {
    setIsPlaying(true);

    if (remoteActionRef.current) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    const time = video.currentTime;

    console.log("Sending video play:", time);

    socketRef.current?.emit("video:play", {
      roomId: roomId,
      currentTime: time,
    });
  }

  // =========================
  // VIDEO PAUSE
  // =========================

  function handleVideoPause() {
    setIsPlaying(false);

    if (remoteActionRef.current) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    const time = video.currentTime;

    console.log("Sending video pause:", time);

    socketRef.current?.emit("video:pause", {
      roomId: roomId,
      currentTime: time,
    });
  }

  // =========================
  // PLAY / PAUSE BUTTON
  // =========================

  function togglePlay() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().catch((error) => {
        console.log("Play error:", error);
      });
    } else {
      video.pause();
    }
  }

  // =========================
  // SEEK
  // =========================

  function seekBy(seconds: number) {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const newTime = Math.min(
      Math.max(video.currentTime + seconds, 0),
      video.duration || 0
    );

    video.currentTime = newTime;
    setCurrentTime(newTime);
  }

  // =========================
  // PROGRESS BAR
  // =========================

  function handleProgressChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const newTime = Number(event.target.value);

    video.currentTime = newTime;
    setCurrentTime(newTime);
  }

  // =========================
  // VOLUME
  // =========================

  function handleVolumeChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const newVolume = Number(event.target.value);

    video.volume = newVolume;

    setVolume(newVolume);

    if (newVolume === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
  }

  // =========================
  // MUTE / UNMUTE
  // =========================

  function toggleMute() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.muted) {
      video.muted = false;

      if (video.volume === 0) {
        video.volume = 1;
        setVolume(1);
      }

      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }

  // =========================
  // FULLSCREEN
  // =========================

  async function toggleFullscreen() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await video.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.log("Fullscreen error:", error);
    }
  }

  // =========================
  // FULLSCREEN CHANGE
  // =========================

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  // =========================
  // FORMAT TIME
  // =========================

  function formatTime(time: number) {
    if (!Number.isFinite(time)) {
      return "00:00";
    }

    const totalSeconds = Math.max(
      0,
      Math.floor(time)
    );

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(
        2,
        "0"
      )}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(
        2,
        "0"
      )}`;
    }

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  // =========================
  // VIDEO LOADING
  // =========================

  function handleLoadStart() {
    setIsLoading(true);
  }

  function handleWaiting() {
    setIsLoading(true);
  }

  function handleCanPlay() {
    setIsLoading(false);
  }

  function handlePlaying() {
    setIsLoading(false);
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setDuration(video.duration);
    setCurrentTime(video.currentTime);

    setVolume(video.volume);
    setIsMuted(video.muted);

    setIsLoading(false);
  }

  function handleTimeUpdate() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setCurrentTime(video.currentTime);
  }

  // =========================
  // VIDEO ERROR
  // =========================

  function handleVideoError() {
    setIsLoading(false);

    console.error(
      "Could not load video:",
      currentVideoSource
    );
  }

  // =========================
  // NEXT VIDEO
  // =========================

  function handleNextVideo() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const nextIndex =
      currentVideoIndex + 1;

    // No more videos
    if (
      nextIndex >= videoSources.length
    ) {
      alert(
        "This is the last video."
      );

      return;
    }

    console.log(
      "Switching to video:",
      nextIndex
    );

    remoteActionRef.current = true;

    // Change video
    setCurrentVideoIndex(nextIndex);

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(true);

    // Tell other users in the room
    socketRef.current?.emit(
      "video:change",
      {
        roomId: roomId,
        videoIndex: nextIndex,
      }
    );

    setTimeout(() => {
      remoteActionRef.current = false;
    }, 700);
  }

  // =========================
  // DOUBLE TAP / DOUBLE CLICK
  // =========================

  function handleDoubleTap(
    direction: "forward" | "backward"
  ) {
    if (direction === "forward") {
      seekBy(10);
    } else {
      seekBy(-10);
    }
  }

  // =========================
  // KEYBOARD CONTROLS
  // =========================

  function handleVideoKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>
  ) {
    if (
      event.target !==
      event.currentTarget
    ) {
      return;
    }

    if (
      event.key === " " ||
      event.key === "Enter"
    ) {
      event.preventDefault();
      togglePlay();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(10);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekBy(-10);
    }

    if (
      event.key === "f" ||
      event.key === "F"
    ) {
      event.preventDefault();
      toggleFullscreen();
    }

    if (
      event.key === "m" ||
      event.key === "M"
    ) {
      event.preventDefault();
      toggleMute();
    }
  }

  // =========================
  // DOWNLOAD VIDEO
  // =========================

  async function handleDownload() {
    try {
      setIsDownloading(true);

      const userId =
        localStorage.getItem("userId");

      const videoId =
        localStorage.getItem("videoId");

      if (!userId) {
        alert("Please login first.");
        return;
      }

      if (!videoId) {
        alert(
          "Video ID not found. Please set the video ID first."
        );

        return;
      }

      console.log(
        "Download request:",
        {
          userId,
          videoId,
        }
      );

      const response =
        await fetch(
          "http://localhost:5000/api/downloads",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId: userId,
              videoId: videoId,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "Download API response:",
        data
      );

      if (!response.ok) {
        alert(
          data.message ||
            "Download not allowed."
        );

        return;
      }

      alert(
        `Download allowed!\n\nPlan: ${data.plan}\nToday: ${data.downloadedToday}/${data.dailyLimit}`
      );

      const link =
        document.createElement("a");

      link.href =
        data.video.videoUrl;

      link.download =
        data.video.title ||
        "video";

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );
    } catch (error) {
      console.error(
        "Download error:",
        error
      );

      alert(
        "Download failed. Please try again."
      );
    } finally {
      setIsDownloading(false);
    }
  }

  // =========================
  // UI
  // =========================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex justify-center items-center px-4 py-8">

      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ================= HEADER ================= */}

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">

          <h1 className="text-3xl font-bold">
            🎬 Watch Party
          </h1>

          <p className="mt-2 text-indigo-100">
            Watch together in real time
          </p>

          <div className="mt-4 inline-block bg-white/20 px-4 py-2 rounded-lg">

            <span className="text-sm text-indigo-100">
              Room ID
            </span>

            <p className="text-lg font-bold tracking-wider">
              {roomId}
            </p>

          </div>

        </div>

        {/* ================= MAIN CONTENT ================= */}

        <div className="p-6">

          {/* ================= VIDEO TITLE ================= */}

          <div className="flex items-center justify-between mb-3">

            <h2 className="text-xl font-bold text-gray-800">
              🎥 {videoTitles[currentVideoIndex]}
            </h2>

            <span className="text-sm text-gray-500">
              Custom Video Player
            </span>

          </div>

          {/* ================= CUSTOM VIDEO PLAYER ================= */}

          <div
            className="relative bg-black rounded-xl overflow-hidden mb-4 shadow-md group outline-none"
            tabIndex={0}
            onKeyDown={handleVideoKeyDown}
          >

            {/* VIDEO */}

            <video
              key={currentVideoSource}
              ref={videoRef}
              src={currentVideoSource}
              playsInline
              preload="metadata"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onLoadStart={handleLoadStart}
              onWaiting={handleWaiting}
              onCanPlay={handleCanPlay}
              onPlaying={handlePlaying}
              onLoadedMetadata={
                handleLoadedMetadata
              }
              onTimeUpdate={
                handleTimeUpdate
              }
              onError={
                handleVideoError
              }
              onEnded={() => {
                setIsPlaying(false);
              }}
              className="w-full aspect-video object-contain bg-black"
            />

            {/* ================= LOADING ================= */}

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">

                <div className="flex flex-col items-center gap-3 text-white">

                  <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />

                  <span className="text-sm font-medium">
                    Loading video...
                  </span>

                </div>

              </div>
            )}

            {/* ================= DOUBLE TAP LEFT ================= */}

            <button
              type="button"
              aria-label="Rewind 10 seconds"
              onDoubleClick={() =>
                handleDoubleTap(
                  "backward"
                )
              }
              className="absolute left-0 top-0 bottom-16 w-1/3 bg-transparent hover:bg-white/5 transition cursor-pointer"
            >

              <span className="sr-only">
                Double click to rewind
                10 seconds
              </span>

            </button>

            {/* ================= DOUBLE TAP RIGHT ================= */}

            <button
              type="button"
              aria-label="Forward 10 seconds"
              onDoubleClick={() =>
                handleDoubleTap(
                  "forward"
                )
              }
              className="absolute right-0 top-0 bottom-16 w-1/3 bg-transparent hover:bg-white/5 transition cursor-pointer"
            >

              <span className="sr-only">
                Double click to skip
                forward 10 seconds
              </span>

            </button>

            {/* ================= CONTROL BAR ================= */}

            <div className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-3 pb-3 pt-8">

              {/* ================= PROGRESS ================= */}

              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(
                  currentTime,
                  duration || 0
                )}
                onChange={
                  handleProgressChange
                }
                aria-label="Video progress"
                className="w-full accent-indigo-500 cursor-pointer mb-3"
              />

              {/* ================= BUTTON ROW ================= */}

              <div className="flex items-center gap-2 text-white">

                {/* PLAY / PAUSE */}

                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={
                    isPlaying
                      ? "Pause video"
                      : "Play video"
                  }
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  {isPlaying
                    ? "❚❚"
                    : "▶"}
                </button>

                {/* REWIND */}

                <button
                  type="button"
                  onClick={() =>
                    seekBy(-10)
                  }
                  aria-label="Rewind 10 seconds"
                  className="px-3 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
                >
                  ↶ 10s
                </button>

                {/* FORWARD */}

                <button
                  type="button"
                  onClick={() =>
                    seekBy(10)
                  }
                  aria-label="Forward 10 seconds"
                  className="px-3 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
                >
                  10s ↷
                </button>

                {/* TIME */}

                <div className="text-sm font-medium min-w-[105px] text-center">

                  {formatTime(
                    currentTime
                  )}

                  {" / "}

                  {formatTime(
                    duration
                  )}

                </div>

                {/* VOLUME */}

                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={
                    isMuted
                      ? "Unmute video"
                      : "Mute video"
                  }
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  {isMuted ||
                  volume === 0
                    ? "🔇"
                    : "🔊"}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={
                    isMuted
                      ? 0
                      : volume
                  }
                  onChange={
                    handleVolumeChange
                  }
                  aria-label="Volume"
                  className="w-20 accent-indigo-500 cursor-pointer hidden sm:block"
                />

                <div className="flex-1" />

                {/* NEXT VIDEO */}

                <button
                  type="button"
                  onClick={
                    handleNextVideo
                  }
                  aria-label="Next video"
                  className="px-3 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
                >
                  Next ▶
                </button>

                {/* FULLSCREEN */}

                <button
                  type="button"
                  onClick={
                    toggleFullscreen
                  }
                  aria-label={
                    isFullscreen
                      ? "Exit fullscreen"
                      : "Enter fullscreen"
                  }
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  ⛶
                </button>

              </div>

            </div>

          </div>

          {/* ================= VIDEO STATUS ================= */}

          <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-100 p-3">

            <p className="text-sm text-indigo-700 text-center">

              🎬 Now playing:{" "}
              <strong>
                {videoTitles[
                  currentVideoIndex
                ]}
              </strong>

              {" • "}

              Video{" "}
              {currentVideoIndex + 1}
              {" of "}
              {videoSources.length}

            </p>

          </div>

          {/* ================= MOBILE GESTURE INFO ================= */}

          <div className="mb-6 rounded-xl bg-indigo-50 border border-indigo-100 p-3">

            <p className="text-sm text-indigo-700 text-center">

              📱 Mobile: double-tap the
              left side to rewind 10s
              and the right side to
              skip 10s.

            </p>

          </div>

          {/* ================= DOWNLOAD BUTTON ================= */}

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full mb-8 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-5 rounded-xl transition"
          >

            {isDownloading
              ? "⏳ Checking download..."
              : "⬇️ Download Video"}

          </button>

          {/* ================= CHAT ================= */}

          <h2 className="text-xl font-bold text-gray-800 mb-4">
            💬 Room Chat
          </h2>

          {/* ================= MESSAGES ================= */}

          <div className="border border-gray-200 rounded-xl p-4 mb-4 h-56 overflow-y-auto bg-gray-50">

            {messages.length === 0 ? (

              <div className="h-full flex items-center justify-center">

                <p className="text-gray-400">
                  No messages yet...
                </p>

              </div>

            ) : (

              messages.map(
                (msg, index) => (

                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-3 mb-2 shadow-sm"
                  >

                    <p className="text-gray-800">
                      {msg}
                    </p>

                  </div>

                )
              )

            )}

          </div>

          {/* ================= MESSAGE INPUT ================= */}

          <div className="flex gap-2">

            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              onKeyDown={(event) => {

                if (
                  event.key ===
                  "Enter"
                ) {
                  sendMessage();
                }

              }}
              className="flex-1 border border-gray-300 text-gray-800 bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
            />

            <button
              onClick={sendMessage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl transition"
            >
              Send
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}