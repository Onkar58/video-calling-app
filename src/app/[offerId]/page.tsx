"use client";
import { Loader } from "@/components/Loading";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { BiUser } from "react-icons/bi";
import { BsInfoCircle } from "react-icons/bs";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { FaRegCopy, FaX } from "react-icons/fa6";
import { ImPhoneHangUp } from "react-icons/im";
import { toast } from "sonner";

export default function CallPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = use(params);

  const [username] = useState("onkar");
  const [, setSdp] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [showOffer, setShowOffer] = useState(true);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [currentDomain, setCurrentDomain] = useState("");

  const handleCreateCall = useCallback(async () => {
    setError(null);

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    try {
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
      if (typeof window !== "undefined") {
        setCurrentDomain(window.location.hostname);
      }
    } catch (err) {
      console.log({ err });
      setError("Failed to create call. Please try again.");
    }
  }, []);

  const handleGetAnswerAndConnect = useCallback(async () => {
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
      console.log({ err });
      setError("Failed to set answer. Try again.");
    }
  }, [offerId]);

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
  // const endCall = () => {
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
  // };
  useEffect(() => {
    handleCreateCall();
  }, [handleCreateCall]);

  useEffect(() => {
    if (!offerId || connected) return;

    let attempts = 0;

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

    const intervalId = setInterval(
      poll,
      attempts < 10 ? 2000 : 10000 // 2s for first 10 attempts, then 10s
    );

    return () => clearInterval(intervalId);
  }, [offerId, connected, handleGetAnswerAndConnect]);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentDomain + "/join/" + offerId!);
    toast("Link copied to clipboard");
  };

  return (
    <div className="relative">
      <div
        className={`absolute bottom-6 left-6 bg-white shadow-lg rounded-xl ${
          showOffer ? "p-4" : "p-2 cursor-pointer"
        } z-[10] flex flex-col items-center gap-2`}
      >
        {showOffer ? (
          <>
            <div className="flex justify-between items-center w-full gap-10">
              <span className="font-semibold text-sm">
                Share this code with your friend:
              </span>
              <button
                onClick={() => setShowOffer(false)}
                className="hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                <FaX className="scale-y-90" />
              </button>
            </div>

            {/* Textarea */}
            {currentDomain ? (
              <div className="flex justify-between items-center mt-2 w-full px-2 py-2 bg-gray-200 rounded-sm">
                <span className="text-sm font-semibold text-gray-800 resize-none w-full">
                  {currentDomain + "/join/" + offerId!}
                </span>
                <button onClick={copyToClipboard} className="" title="Copy">
                  <FaRegCopy className="cursor-pointer" />
                </button>
              </div>
            ) : (
              <Loader />
            )}
          </>
        ) : (
          <BsInfoCircle onClick={() => setShowOffer(true)} />
        )}
      </div>
      <div className="relative w-screen h-screen bg-black overflow-hidden">
        {/* Remote Video Fullscreen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Local Camera in Corner */}
        <div
          className={`absolute bottom-6 right-6 w-40 h-32 bg-black rounded-lg overflow-hidden shadow-lg border-2 ${
            isAudioOn ? "border-white" : "border-gray-900"
          } flex items-center justify-center`}
        >
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
