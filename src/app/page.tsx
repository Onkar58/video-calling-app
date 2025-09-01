"use client";
import { generateMeetingCode } from "@/server/generateMeetingCode";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaUser, FaVideo } from "react-icons/fa";
import {
  MdOutlineArrowBackIos,
  MdOutlineArrowForwardIos,
} from "react-icons/md";

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(now);

    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(now);

    setDate(`${time} - ${day}`);
  }, []);

  const router = useRouter();

  const createMeeting = async () => {
    const _offerId = generateMeetingCode();
    router.push(`/${_offerId}`);
  };
  const joinMeeting = () => {
    router.push(`/join/${offerId}`);
  };

  const slides = [
    {
      title: "Get a link you can share",
      description:
        "Click New meeting to get a link you can send to people you want to meet with",
      image: "/link.png",
    },
    {
      title: "Your meeting is safe",
      description: "Phonic ensures encrypted and secure meetings for everyone",
      image: "/secure.png",
    },
    {
      title: "Join instantly",
      description: "Enter a code or link and join meetings right away",
      image: "/join.png",
    },
  ];

  const nextSlide = () => setSlide((slide + 1) % slides.length);
  const prevSlide = () => setSlide((slide - 1 + slides.length) % slides.length);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex justify-between items-center px-10 py-5">
        <div className="flex items-center justify-center gap-2">
          <FaVideo size={24} />
          <span className="text-2xl font-bold text-gray-700">Phonic</span>
        </div>
        <div className="flex items-center gap-6 text-gray-600">
          <span className="text-xl font-medium">{date}</span>
          <div className="border-2 rounded-full p-2">
            <FaUser />
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-grow">
        {/* Left Side */}
        <div className="w-1/2 flex flex-col justify-center items-start pl-20">
          <h1 className="text-4xl font-semibold mb-4">
            Video calls and meetings for everyone
          </h1>
          <p className="text-lg mb-8">
            Connect, collaborate, and celebrate from anywhere with Phonic
          </p>

          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
              onClick={createMeeting}
            >
              <FaVideo /> New meeting
            </button>

            <div className="flex items-center border rounded-lg px-3 py-2 w-64">
              <input
                type="text"
                placeholder="Enter a code or link"
                className="flex-grow outline-none"
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
              />
              <button
                className="text-gray-600 hover:text-blue-600"
                onClick={joinMeeting}
              >
                Join
              </button>
            </div>
          </div>

          <p className="mt-6 text-sm text-gray-500">Learn more about Phonic</p>
        </div>

        {/* Right Side */}
        <div className="w-1/2 flex flex-col justify-center items-center relative">
          <div className="w-64 h-64 flex flex-col justify-center items-center bg-gray-100 rounded-full p-6 shadow">
            {/* <img src={slides[slide].image} alt="slide" className="w-32 h-32" /> */}
          </div>
          <h2 className="text-xl font-medium mt-6">{slides[slide].title}</h2>
          <p className="text-gray-600 text-center max-w-sm">
            {slides[slide].description}
          </p>

          {/* Navigation */}
          <div className="absolute left-10 top-1/2 -translate-y-1/2">
            <button
              onClick={prevSlide}
              className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
            >
              <MdOutlineArrowBackIos />
            </button>
          </div>

          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <button
              onClick={nextSlide}
              className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
            >
              <MdOutlineArrowForwardIos />
            </button>
          </div>

          {/* Dots */}
          <div className="flex gap-2 mt-4">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === slide ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
