import React, { useEffect, useRef, useState } from "react";
import socket from "../services/socket";
import ReactPlayer from "react-player";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const RoomPage = () => {
  const navigate = useNavigate();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [otherUserStream, setOtherUserStream] = useState(null);
  const peerConnection = useRef(null);

  const handleUserJoined = (data) => {
    console.log(`User ${data.email} joined room`);
    setRemoteSocketId(data.id);
  };

  const startVideoCall = async (remoteId) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: remoteId,
        });
      }
    };
    peerConnection.current.ontrack = (event) => {
      setOtherUserStream(event.streams[0]);
    };
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("offer-call", { to: remoteId, offer: offer });
  };

  const handleICECandidate = async ({ candidate }) => {
    if (candidate && peerConnection.current) {
      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (err) {
        console.error("Error adding ice candidate :", err);
      }
    }
  };

  const handleIncomingCall = async ({ from, offer }) => {
    setRemoteSocketId(from);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    stream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, stream);
    });
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: from,
          candidate: event.candidate,
        });
      }
    };
    peerConnection.current.ontrack = (event) => {
      setOtherUserStream(event.streams[0]);
    };
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    socket.emit("answer-call", { to: from, answer: answer });
  };

  const handleAcceptedCall = async ({ from, answer }) => {
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleEndCall = () => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setOtherUserStream(null);
    setMyStream(null);
    setRemoteSocketId(null);
    socket.emit("end-call", { to: remoteSocketId });
    socket.emit("leave-room");
  };

  useEffect(() => {
    socket.on("user-joined", (data) => {
      handleUserJoined(data);
    });
    socket.on("incoming-call", (data) => {
      toast.info("Incoming call...");
      handleIncomingCall(data);
    });
    socket.on("call-accepted", handleAcceptedCall);
    socket.on("ice-response", handleICECandidate);
    socket.on("call-ended", () => {
      toast.error("Call ended");
      handleEndCall();
    });
    socket.on("room-left", () => {
      toast.success("Left room successfully");
      navigate("/");
    });

    return () => {
      socket.off("user-joined");
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("ice-response");
      socket.off("call-ended");
      socket.off("room-left");
    };
  }, [socket,navigate]);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl text-white font-semibold py-2 px-5 m-3 bg-purple-600 rounded-lg">
        Video Call Room
      </h1>
      <div>
        {remoteSocketId ? (
          <p>User {remoteSocketId} is in the room</p>
        ) : (
          <p>No user is in the room</p>
        )}
      </div>
      {!myStream && (
        <div className="flex flex-col items-center gap-3 mt-5">
          {remoteSocketId && (
            <button
              onClick={() => startVideoCall(remoteSocketId)}
              className="bg-blue-600 hover:bg-blue-700 transition text-white py-2 px-4 rounded-lg"
            >
              Start Video Call
            </button>
          )}
          <button
            onClick={() => {
              socket.emit("leave-room");
            }}
            className="bg-red-600 hover:bg-red-400 transition text-white py-2 px-4 rounded-lg"
          >
            Leave Room
          </button>
        </div>
      )}
      {myStream && (
        <div className="w-11/12 md:w-2/3 bg-gray-800 border-2 border-gray-400 rounded-lg bg-opacity-70 p-4 m-4 text-lg overflow-y-auto md:overflow-visible custom-scroll max-h-[100vh]">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <div className="w-full md:w-1/2 flex flex-col items-center">
              <ReactPlayer
                url={myStream}
                playing
                controls
                width="100%"
                height="auto"
                pip
                muted
                className="rounded-lg"
              />
              <p className="text-center text-white mt-2 font-semibold">You</p>
            </div>
            <div className="w-full md:w-1/2 flex flex-col items-center">
              <ReactPlayer
                url={otherUserStream}
                playing
                controls
                width="100%"
                height="auto"
                pip
                muted={false}
                className="rounded-lg"
              />
              <p className="text-center text-white mt-2 font-semibold">
                User {remoteSocketId}
              </p>
            </div>
          </div>
          <div className="w-full flex justify-center md:justify-end mt-4">
            <button
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg"
            >
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomPage;
