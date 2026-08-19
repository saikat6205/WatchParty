"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

export default function RoomPage() {
  const params = useParams();

  const roomId = params.roomId as string;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  // Video reference
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Socket reference
  const socketRef = useRef<Socket | null>(null);

  // Prevent video event loop
  const remoteActionRef = useRef(false);

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

  socket.on("message", (message: string) => {
    console.log("Received:", message);

    setMessages((prevMessages) => [
      ...prevMessages,
      message,
    ]);
  });

  // =========================
  // RECEIVE VIDEO PLAY
  // =========================
  socket.on(
  "video:play",
  ({ currentTime }: { currentTime: number }) => {
    const video = videoRef.current;

    if (!video) return;

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

    if (!video) return;

    remoteActionRef.current = true;

    video.currentTime = currentTime;

    video.pause();

    setTimeout(() => {
      remoteActionRef.current = false;
    }, 500);
  }
);
  return () => {
    socket.disconnect();
  };
}, [roomId]);

  // =========================
  // SEND CHAT MESSAGE
  // =========================
  function sendMessage() {
    if (message.trim() === "") {
      return;
    }

    socketRef.current?.emit("message", {
      roomId: roomId,
      message: message,
    });

    setMessage("");
  }

  // =========================
  // VIDEO PLAY
  // =========================
 function handleVideoPlay() {
  // অন্য user-এর Play হলে server-এ আবার পাঠাবো না
  if (remoteActionRef.current) {
    return;
  }

  const currentTime = videoRef.current?.currentTime || 0;

  console.log("Sending video play:", currentTime);

  socketRef.current?.emit("video:play", {
    roomId: roomId,
    currentTime: currentTime,
  });
}

  // =========================
  // VIDEO PAUSE
  // =========================
  function handleVideoPause() {
  // অন্য user-এর Pause হলে server-এ আবার পাঠাবো না
  if (remoteActionRef.current) {
    return;
  }

  const currentTime = videoRef.current?.currentTime || 0;

  console.log("Sending video pause:", currentTime);

  socketRef.current?.emit("video:pause", {
    roomId: roomId,
    currentTime: currentTime,
  });
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex justify-center items-center px-4 py-8">

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ================= HEADER ================= */}

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">

          <h1 className="text-3xl font-bold">
            🎬 Watch Party
          </h1>

          <p className="mt-2 text-indigo-100">
            Watch together in real time
          </p>

          {/* Room ID */}

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

          {/* ================= VIDEO ================= */}

          <h2 className="text-xl font-bold text-gray-800 mb-3">
            🎥 Watch Video
          </h2>

          <div className="bg-black rounded-xl overflow-hidden mb-8 shadow-md">

            <video
              ref={videoRef}
              src="/sample.mp4"
              controls
              playsInline
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              className="w-full aspect-video"
            />

          </div>

          {/* ================= CHAT ================= */}

          <h2 className="text-xl font-bold text-gray-800 mb-4">
            💬 Room Chat
          </h2>

          {/* Messages */}

          <div className="border border-gray-200 rounded-xl p-4 mb-4 h-56 overflow-y-auto bg-gray-50">

            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">

                <p className="text-gray-400">
                  No messages yet...
                </p>

              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-3 mb-2 shadow-sm"
                >

                  <p className="text-gray-800">
                    {msg}
                  </p>

                </div>
              ))
            )}

          </div>

          {/* Message Input */}

          <div className="flex gap-2">

            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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