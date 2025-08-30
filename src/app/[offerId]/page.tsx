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

export default function CallPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = use(params);

  const [username, setUsername] = useState("onkar");
  const [sdp, setSdp] = useState<string | null>(null);
  // const [offerId, setOfferId] = useState<string | null>("hellooo");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [showOffer, setShowOffer] = useState(true);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  async function handleCreateCall() {
    // e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Username is required.");
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
          // If multiple tracks, combine into one stream
          const [stream] = event.streams;
          remoteVideoRef.current.srcObject = stream;
        }
      };

      // (Optional) Add a dummy data channel to ensure ICE gathering
      peer.createDataChannel("chat");

      // Create offer
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

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

      const encoded = btoa(JSON.stringify(peer.localDescription));
      setSdp(encoded);

      const resp = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, sdp: encoded, offerId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to store offer");
    } catch (err) {
      console.log({ err });
      setError("Failed to create call. Please try again.");
    }
  }

  async function handleGetAnswerAndConnect() {
    setError(null);
    if (!offerId) return;
    try {
      const resp = await fetch(`/api/answer?offerId=${offerId}`);
      if (!resp.ok) {
        setError("No answer yet. Ask your friend to join.");
        return;
      }
      const data = await resp.json();
      const answerDesc = JSON.parse(atob(data.answer));
      const peer = peerRef.current;
      if (!peer) {
        setError("Peer connection not found.");
        return;
      }
      await peer.setRemoteDescription(new RTCSessionDescription(answerDesc));
      setConnected(true);
    } catch (err) {
      setError("Failed to set answer. Try again.");
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
  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioOn(audioTrack.enabled);
    }
  };
  const endCall = () => {
    // Stop all media tracks
    // const stream = localStreamRef.current;
    // if (!stream) return;
    // const tracks = stream.getTracks();
    // tracks.forEach((track) => track.stop());
    // if (localStreamRef.current) {
    //   //@ts-ignore
    //   localVideoRef.current.srcObject = null;
    // }
    // setIsAudioOn(false);
    // setIsVideoOn(false);
    // alert("Call Ended");
  };
  useEffect(() => {
    handleCreateCall();
  }, []);

  useEffect(() => {
    if (!offerId || connected) return;

    let attempts = 0;
    let intervalId: any;

    const poll = async () => {
      attempts++;
      try {
        await handleGetAnswerAndConnect(); // ✅ reuse your function
        if (connected) {
          clearInterval(intervalId); // stop once connected
        }
      } catch (err) {
        console.error("Polling failed", err);
      }
    };

    intervalId = setInterval(
      poll,
      attempts < 10 ? 2000 : 10000 // 2s for first 10 attempts, then 10s
    );

    return () => clearInterval(intervalId);
  }, [offerId, connected, handleGetAnswerAndConnect]);

  return (
    <div className="relative">
      {showOffer && (
        <div className="absolute bottom-6 left-6 bg-white border border-gray-200 shadow-lg rounded-xl p-4 w-72 z-[10]">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-700 text-sm">
              Share this code with your friend:
            </span>
            <button
              onClick={() => setShowOffer(false)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ×
            </button>
          </div>

          {/* Textarea */}
          <textarea
            className="w-full p-2 rounded-lg border border-gray-300 bg-gray-100 text-xs resize-none"
            rows={3}
            readOnly
            value={offerId!}
          />

          {/* Footer with copy button */}
          <div className="flex justify-end mt-2">
            <button
              onClick={() => navigator.clipboard.writeText(offerId!)}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Copy
            </button>
          </div>
        </div>
      )}
      <div className="relative w-screen h-screen bg-black overflow-hidden">
        {/* Remote Video Fullscreen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Local Camera in Corner */}
        <div className="absolute bottom-6 right-6 w-40 h-32 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-white flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              !isVideoOn ? "hidden" : ""
            }`}
          />
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="border-2 border-[#ddd] rounded-full p-2">
                <BiUser size="32" color="#ddd" />
              </div>
            </div>
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
            // onClick={endCall}
            className="px-6 py-3 rounded-full shadow flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
          >
            <ImPhoneHangUp />
          </button>
        </div>
      </div>
    </div>
  );
}
