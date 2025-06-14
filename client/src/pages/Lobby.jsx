import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../services/socket";
import { toast } from "react-toastify";

const Lobby = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [roomNo, setRoomNo] = useState("");

  const submitHandler = (e) => {
    e.preventDefault();

    if (!email || !roomNo) {
      toast.error("Email and Room Number are required!");
      return;
    }

    // Emit join-room event to server
    socket.emit("join-room", { email, roomNo });
  };

  const handleJoinRoom = (data) => {
    toast.success(`Joined room ${data.roomNo} successfully!`);
    // Navigate to the room page with the room number
    navigate(`/room/${data.roomNo}`, { state: { email: data.email } });
  };

  useEffect(() => {
    socket.on("room-joined", (data) => {
      handleJoinRoom(data);
    });

    socket.on("error", (error) => {
      console.error("Error:", error);
      toast.error(error);
    });

    // Clean up the socket connection on component unmount
    return () => {
      socket.off("room-joined");
      socket.off("error");
    };
  }, [socket, navigate]);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl text-white font-semibold py-2 px-5 m-3 bg-purple-600 rounded-lg">
        Face-Chat : Video Caller
      </h1>
      <div className="bg-gray-800 border-2 border-gray-400 rounded-lg bg-opacity-70 p-8 m-8 text-lg">
        <form className="flex flex-col gap-6" onSubmit={submitHandler}>
          <div>
            <label htmlFor="email">Email Id : </label>
            <input
              type="email"
              id="email"
              placeholder="Enter email Id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-none font-semibold py-2 px-4 bg-gray-600 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="roomNo">Room No : </label>
            <input
              type="text"
              id="roomNo"
              placeholder="Enter Room Number"
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              className="border-none font-semibold py-2 px-4 bg-gray-600 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="hover:bg-blue-400 bg-blue-600 py-2 rounded-lg"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  );
};

export default Lobby;
