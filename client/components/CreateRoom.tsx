type CreateRoomProps = {
  onCreateRoom: () => void;
};

export default function CreateRoom({ onCreateRoom }: CreateRoomProps) {
  return (
    <div>
      <button
  onClick={onCreateRoom}
  className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-300"
>
  🎬 Create Room
</button>
    </div>
  );
}