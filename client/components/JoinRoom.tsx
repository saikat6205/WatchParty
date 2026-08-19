"use client";

type JoinRoomProps = {
  joinRoomId: string;
  setJoinRoomId: (value: string) => void;
  onJoinRoom: () => void;
};

export default function JoinRoom({
  joinRoomId,
  setJoinRoomId,
  onJoinRoom,
}: JoinRoomProps) {
  return (
    <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">

      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-md">
          🚪
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Join a Room
          </h2>

          <p className="text-sm text-gray-500">
            Enter your Room ID to join
          </p>
        </div>
      </div>

      {/* Room ID Input */}
      <label
        htmlFor="roomId"
        className="mb-2 block text-sm font-semibold text-gray-700"
      >
        Room ID
      </label>

      <input
        id="roomId"
        type="text"
        placeholder="e.g. 65G8W6"
        value={joinRoomId}
        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onJoinRoom();
          }
        }}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />

      {/* Join Button */}
      <button
        onClick={onJoinRoom}
        className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98]"
      >
        🚀 Join Room
      </button>

      {/* Small Help Text */}
      <p className="mt-3 text-center text-xs text-gray-500">
        Ask your friend for the 6-character Room ID
      </p>

    </div>
  );
}