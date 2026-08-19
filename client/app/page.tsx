"use client";

import Header from "../components/Header";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CreateRoom from "../components/CreateRoom";
import JoinRoom from "../components/JoinRoom";
import { io, Socket } from "socket.io-client";

export default function Home() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState("");

  const socketRef = useRef<Socket | null>(null);

  const router = useRouter();

  // =========================
  // Socket.IO Connection
  // =========================
  useEffect(() => {
    const socket = io("http://localhost:5000");

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO:", socket.id);
    });

    // Receive message
    socket.on("message", (message: string) => {
      console.log("Received message:", message);

      setMessages((prevMessages) => [
        ...prevMessages,
        message,
      ]);
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // =========================
  // Send Message
  // =========================
  function sendMessage() {
    if (message.trim() === "") {
      return;
    }

    if (currentRoomId === "") {
      alert("Please create or join a room first.");
      return;
    }

    console.log("Sending:", message);

    socketRef.current?.emit("message", {
      roomId: currentRoomId,
      message: `${name || "Anonymous"}: ${message}`,
    });

    setMessage("");
  }

  // =========================
  // Create Room
  // =========================
  function createRoom() {
    const id = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    console.log("Creating Room:", id);

    setCurrentRoomId(id);

    socketRef.current?.emit("joinRoom", id);

    localStorage.setItem("roomId", id);
    localStorage.setItem("userName", name);

    router.push(`/room/${id}`);
  }

  // =========================
  // Join Existing Room
  // =========================
  function joinRoom() {
    const id = joinRoomId.trim().toUpperCase();

    if (id === "") {
      alert("Please enter Room ID");
      return;
    }

    console.log("Joining Room:", id);

    setCurrentRoomId(id);

    socketRef.current?.emit("joinRoom", id);

    localStorage.setItem("roomId", id);
    localStorage.setItem("userName", name);

    router.push(`/room/${id}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex justify-center items-center px-4 py-8">

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ================= HEADER ================= */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 px-7 py-8 text-white text-center">

          <div className="text-5xl mb-3">
            🎬
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight">
            Watch Party
          </h1>

          <p className="mt-2 text-indigo-100 text-sm">
            Watch together • Chat together • Have fun
          </p>

        </div>

        {/* ================= CONTENT ================= */}
        <div className="p-7">

          {/* Name */}
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            👤 Your Name
          </label>

          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 text-gray-800 bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 transition"
          />

          {/* Greeting */}
          {name && (
            <div className="mt-3 mb-5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <p className="text-indigo-700 font-semibold">
                👋 Hello, {name}!
              </p>
            </div>
          )}

          {/* Create Room */}
          <div className={name ? "" : "mt-5"}>
            <CreateRoom onCreateRoom={createRoom} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-gray-200"></div>

            <span className="text-xs font-semibold text-gray-400">
              OR
            </span>

            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Join Room */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">
              🚪 Join Existing Room
            </h2>

            <JoinRoom
              joinRoomId={joinRoomId}
              setJoinRoomId={setJoinRoomId}
              onJoinRoom={joinRoom}
            />
          </div>

          {/* ================= CHAT ================= */}
          <div className="mt-7 pt-6 border-t border-gray-200">

            <h2 className="text-lg font-bold text-gray-800 mb-4">
              💬 Quick Chat
            </h2>

            {/* Messages */}
            <div className="border border-gray-200 rounded-xl p-3 mb-3 h-36 overflow-y-auto bg-gray-50">

              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-gray-400">
                    No messages yet...
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2 shadow-sm"
                  >
                    <p className="text-sm text-gray-700">
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
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                className="flex-1 min-w-0 border border-gray-300 text-gray-800 bg-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
              />

              <button
                onClick={sendMessage}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-4 py-3 rounded-xl transition shadow-sm"
              >
                Send
              </button>

            </div>

          </div>

          {/* Current Room */}
          {currentRoomId && (
            <div className="mt-5 bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
              <p className="text-xs text-purple-500">
                Current Room
              </p>

              <p className="text-lg font-bold tracking-wider text-purple-700">
                {currentRoomId}
              </p>
            </div>
          )}

        </div>

        {/* ================= FOOTER ================= */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 text-center">

          <p className="text-xs text-gray-500">
            🔒 Private rooms • ⚡ Real-time chat • 🎥 Watch together
          </p>

        </div>

      </div>

    </div>
  );
}