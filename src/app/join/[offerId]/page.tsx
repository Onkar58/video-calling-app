"use client";
import { use, useEffect, useRef, useState } from "react";
import { BiUser } from "react-icons/bi";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { ImPhoneHangUp } from "react-icons/im";

export default function JoinCallPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = use(params);
  const [username, setUsername] = useState("komal");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  async function handleJoinCall() {
    setError(null);

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!offerId.trim()) {
      setError("Offer code is required.");
      return;
    }

    try {
      // Get local camera stream
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = localStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Fetch the offer SDP from the server
      const resp = await fetch(`/api/offer?offerId=${offerId}`);
      if (!resp.ok) {
        setError("Invalid or expired offer code.");
        return;
      }
      const offerEntry = await resp.json();

      // Create a new RTCPeerConnection
      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      // Add local tracks to peer connection
      localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
      });

      // Listen for remote tracks
      peer.ontrack = (event) => {
        if (remoteVideoRef.current) {
          const [stream] = event.streams;
          remoteVideoRef.current.srcObject = stream;
        }
      };

      // Set the remote description using the offer's SDP
      const remoteDesc = JSON.parse(atob(offerEntry.sdp));
      await peer.setRemoteDescription(new RTCSessionDescription(remoteDesc));

      // Create an answer
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        if (peer.iceGatheringState === "complete") {
          resolve();
        } else {
          peer.onicegatheringstatechange = () => {
            if (peer.iceGatheringState === "complete") {
              resolve();
            }
          };
        }
      });

      setConnected(true);

      // Send the answer to the server
      await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          answer: btoa(JSON.stringify(peer.localDescription)),
        }),
      });
    } catch (err) {
      setError(
        "Failed to join call. Please check the offer code and try again."
      );
    }
  }
  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
    }
  };

  const endCall = () => {
    // Stop all media tracks
    // const stream = localStreamRef.current;
    // if (!stream) return;
    // const tracks = stream.getTracks();
    // tracks.forEach((track) => track.stop());
    // if (localStreamRef && localStreamRef.current) {
    //   //@ts-ignore
    //   localVideoRef.current.srcObject = null;
    // }
    // setIsAudioOn(false);
    // setIsVideoOn(false);
    // alert("Call Ended");
  };
  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioOn(audioTrack.enabled);
    }
  };
  useEffect(() => {
    handleJoinCall();
  }, []);
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Remote Video Fullscreen */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute bottom-6 right-6 w-40 h-32 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-white flex items-center justify-center">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isVideoOn ? "hidden" : ""}`}
        />
        {!isVideoOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="border-2 border-[#ddd] rounded-full p-2">
              <BiUser size="32" color="#ddd" />
            </div>
          </div>
        )}
        {!isAudioOn && (
          <FaMicrophoneSlash
            size="20"
            color="#ddd"
            className="absolute z-[10] top-2 right-2"
          />
        )}
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-6">
        <button
          onClick={toggleAudio}
          className={`px-6 py-3 rounded-full shadow flex items-center gap-2 ${
            isAudioOn
              ? "bg-gray-700 text-white hover:bg-gray-800"
              : "bg-yellow-600 text-white hover:bg-yellow-700"
          }`}
        >
          {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          {/* {isAudioOn ? "Mute" : "Unmute"}/ */}
        </button>

        <button
          onClick={toggleVideo}
          className={`px-6 py-3 rounded-full shadow flex items-center gap-2 ${
            isVideoOn
              ? "bg-gray-700 text-white hover:bg-gray-800"
              : "bg-yellow-600 text-white hover:bg-yellow-700"
          }`}
        >
          {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
          {/* {isVideoOn ? "Turn Off Camera" : "Turn On Camera"} */}
        </button>
        <button
          // onClick={undefined}
          className="px-6 py-3 rounded-full shadow flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
        >
          <ImPhoneHangUp />
        </button>
      </div>
    </div>
  );
}
