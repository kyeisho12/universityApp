import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Video,
  CheckCircle,
  Mic,
  Camera,
  ChevronRight,
} from "lucide-react";
import { Sidebar } from "../components/common/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useStudentId } from "../hooks/useStudentId";

type NavigateHandler = (route: string) => void;

interface MockInterviewPageContentProps {
  email: string;
  userId: string;
  onLogout: () => Promise<void> | void;
  onNavigate: NavigateHandler;
}

interface Question {
  type: string;
  question: string;
  tip: string;
}

function MockInterviewPageContent({
  email,
  userId,
  studentId,
  onLogout,
  onNavigate,
}: MockInterviewPageContentProps & { studentId?: string }) {
  const userName = email.split("@")[0];
  const userID = studentId || "2024-00001";
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const desiredCameraOnRef = useRef(false);
  const cameraRequestIdRef = useRef(0);
  const STATE_KEY = `mock_interview_state_${userId || email || "guest"}`;
  const hasHydratedRef = useRef(false);
  const hasSavedInitialStateRef = useRef(false);

  useEffect(() => {
    if (!STATE_KEY) return;
    hasHydratedRef.current = false;
    try {
      const savedState = localStorage.getItem(STATE_KEY);
      if (!savedState) {
        hasHydratedRef.current = true;
        return;
      }
      const parsed = JSON.parse(savedState) as {
        hasStarted: boolean;
        isCompleted: boolean;
        currentQuestion: number;
        isCameraOn: boolean;
        isMicOn: boolean;
      };
      if (typeof parsed.hasStarted === "boolean") {
        setHasStarted(parsed.hasStarted);
      }
      if (typeof parsed.isCompleted === "boolean") {
        setIsCompleted(parsed.isCompleted);
      }
      if (typeof parsed.currentQuestion === "number") {
        setCurrentQuestion(parsed.currentQuestion);
      }
      if (typeof parsed.isCameraOn === "boolean") {
        setIsCameraOn(parsed.isCameraOn);
      }
      if (typeof parsed.isMicOn === "boolean") {
        setIsMicOn(parsed.isMicOn);
      }
      hasHydratedRef.current = true;
      hasSavedInitialStateRef.current = true;
    } catch (error) {
      console.error("Failed to restore mock interview state:", error);
      hasHydratedRef.current = true;
    }
  }, [STATE_KEY]);

  useEffect(() => {
    desiredCameraOnRef.current = isCameraOn;
  }, [isCameraOn]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (!hasSavedInitialStateRef.current) {
      hasSavedInitialStateRef.current = true;
      return;
    }
    try {
      const nextState = {
        hasStarted,
        isCompleted,
        currentQuestion,
        isCameraOn,
        isMicOn,
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.error("Failed to persist mock interview state:", error);
    }
  }, [STATE_KEY, hasStarted, isCompleted, currentQuestion, isCameraOn, isMicOn]);

  const questions: Question[] = [
    {
      type: "Introduction",
      question: "Tell me about yourself and your background.",
      tip: "Take a moment to think before answering. Speak clearly and provide specific examples when possible.",
    },
    {
      type: "Strengths",
      question: "What are your greatest strengths?",
      tip: "Choose relevant strengths that align with the job. Use the STAR method (Situation, Task, Action, Result) to provide examples.",
    },
    {
      type: "Weaknesses",
      question: "What is an area where you are working to improve?",
      tip: "Be honest but focus on growth. Mention concrete steps you're taking to improve in that area.",
    },
    {
      type: "Teamwork",
      question: "Tell me about a time you worked effectively in a team.",
      tip: "Use a specific example. Explain your role, the challenge, and the positive outcome you contributed to.",
    },
    {
      type: "Problem-Solving",
      question: "Describe a challenge you overcame and how you solved it.",
      tip: "Focus on your problem-solving approach. Explain the situation, your thought process, and the results.",
    },
    {
      type: "Behavioral",
      question: "Why are you interested in this position and our company?",
      tip: "Research the company beforehand. Explain how your skills and values align with their mission and culture.",
    },
  ];

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePracticeAgain = () => {
    setHasStarted(false);
    setIsCompleted(false);
    setCurrentQuestion(0);
    setIsCameraOn(false);
    setIsMicOn(true);
    setMediaError(null);
    stopCamera();
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("Camera not supported in this browser.");
      setIsCameraOn(false);
      return;
    }

    try {
      const requestId = (cameraRequestIdRef.current += 1);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (requestId !== cameraRequestIdRef.current || !desiredCameraOnRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMediaError(null);
    } catch (error) {
      setMediaError("Unable to access camera. Check permissions.");
      setIsCameraOn(false);
    }
  }, [stopCamera]);

  const handleToggleCamera = useCallback(() => {
    setIsCameraOn((prev) => {
      const next = !prev;
      desiredCameraOnRef.current = next;
      if (!next) {
        cameraRequestIdRef.current += 1;
        stopCamera();
      } else {
        setMediaError(null);
        if (!streamRef.current) {
          void startCamera();
        }
      }
      return next;
    });
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!hasStarted || isCompleted || !isCameraOn) {
      stopCamera();
      return;
    }

    if (!streamRef.current) {
      startCamera();
    }

    return () => {
      if (isCompleted) {
        stopCamera();
      }
    };
  }, [hasStarted, isCompleted, isCameraOn, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (!hasStarted) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="student/interview"
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Top Navigation */}
          <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search jobs, events, resources..."
                className="w-full px-4 py-2.5 bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:bg-white focus:ring-0 outline-none placeholder-gray-500"
              />
            </div>
            <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
          </div>

          {/* Content Area */}
          <div className="p-8">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900">
                  AI Mock Interview
                </h1>
                <span className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-sm font-semibold">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  AI-Powered
                </span>
              </div>
              <p className="text-gray-500">
                Practice your interview skills with AI-evaluated feedback
              </p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 max-w-3xl mx-auto">
              {/* Video Icon */}
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-12 h-12 text-gray-600" />
              </div>

              {/* Title */}
              <h2 className="text-4xl font-bold text-gray-900 text-center mb-4">
                Ready to Practice?
              </h2>

              {/* Description */}
              <p className="text-gray-600 text-center mb-8 text-lg leading-relaxed">
                This AI-powered mock interview will help you practice answering
                common interview questions. Your responses will be recorded,
                transcribed, and evaluated based on HR-validated criteria.
              </p>

              {/* Checklist */}
              <div className="bg-cyan-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Before You Start
                </h3>
                <ul className="space-y-3">
                  <ChecklistItem text="Ensure your microphone and camera are working" />
                  <ChecklistItem text="Find a quiet environment" />
                  <ChecklistItem text="Respond in English for accurate transcription" />
                  <ChecklistItem text="Speak clearly and at a moderate pace" />
                </ul>
              </div>

              {/* Start Button */}
              <button
                onClick={() => {
                  setHasStarted(true);
                  setIsCameraOn(true);
                  setMediaError(null);
                }}
                className="w-full bg-[#1B2744] text-white py-3.5 rounded-lg font-semibold hover:bg-[#131d33] transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Start Mock Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interview Completion Screen
  if (isCompleted) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar
          userName={userName}
          userID={userID}
          onLogout={onLogout}
          onNavigate={onNavigate}
          activeNav="student/interview"
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Top Navigation */}
          <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search jobs, events, resources..."
                className="w-full px-4 py-2.5 bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:bg-white focus:ring-0 outline-none placeholder-gray-500"
              />
            </div>
            <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
          </div>

          {/* Content Area */}
          <div className="p-8">
            {/* Completion Card */}
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 max-w-2xl mx-auto">
              {/* Success Icon */}
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Heading */}
              <h1 className="text-4xl font-bold text-gray-900 text-center mb-2">
                Interview Complete!
              </h1>
              <p className="text-gray-500 text-center mb-8">
                Here's your AI-generated evaluation based on HR-validated criteria
              </p>

              {/* Overall Score Card */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex items-center gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 120 120"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="#1B2744"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(80 / 100) * 339.29} 339.29`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">80</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Overall Score</p>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Good Performance
                  </h2>
                </div>
              </div>

              {/* Evaluation Metrics */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Evaluation Metrics
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <MetricCard
                    label="Clarity"
                    percentage={85}
                    description="Clear and articulate delivery"
                  />
                  <MetricCard
                    label="Relevance"
                    percentage={78}
                    description="Response addresses the question directly"
                  />
                  <MetricCard
                    label="Confidence"
                    percentage={82}
                    description="Confident tone and presentation"
                  />
                  <MetricCard
                    label="Structure"
                    percentage={75}
                    description="Well-organized response flow"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handlePracticeAgain}
                  className="flex-1 bg-[#1B2744] text-white py-3.5 rounded-lg font-semibold hover:bg-[#131d33] transition-colors"
                >
                  Practice Again
                </button>
                <button className="flex-1 border-2 border-gray-300 text-gray-700 py-3.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                  View Full Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interview Recording Screen
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userID={userID}
        onLogout={onLogout}
        onNavigate={onNavigate}
        activeNav="student/interview"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search jobs, events, resources..."
              className="w-full px-4 py-2.5 bg-gray-100 rounded-lg border border-gray-200 focus:border-[#00B4D8] focus:bg-white focus:ring-0 outline-none placeholder-gray-500"
            />
          </div>
          <Bell className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
        </div>

        {/* Recording Interface */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Left - Camera Preview */}
          <div className="flex-1 flex flex-col">
            {/* Recording Status and Controls */}
            <div className="bg-gray-300 rounded-2xl flex-1 flex flex-col items-center justify-between p-6 mb-4 relative">
              {/* Recording Badge */}
              <div className="absolute top-6 left-6 inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Recording
              </div>

              {/* Camera Preview */}
              <div className="flex items-center justify-center h-full">
                {isCameraOn && !mediaError ? (
                  <div className="w-full h-full rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 bg-gray-400 rounded-full flex items-center justify-center mb-4">
                      <Camera className="w-16 h-16 text-gray-600" />
                    </div>
                    <p className="text-gray-600 font-medium">Camera Preview</p>
                    {mediaError && (
                      <p className="text-xs text-red-600 mt-2 text-center max-w-xs">
                        {mediaError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-3 shadow-lg">
                <button
                  onClick={() => setIsMicOn((prev) => !prev)}
                  className={
                    isMicOn
                      ? "p-2 text-gray-600 hover:text-gray-900"
                      : "p-2 text-red-600 hover:text-red-700"
                  }
                  title={isMicOn ? "Mute mic" : "Unmute mic"}
                >
                  <Mic className="w-6 h-6" />
                </button>
                <button
                  onClick={handleToggleCamera}
                  className={
                    isCameraOn
                      ? "p-2 text-gray-600 hover:text-gray-900"
                      : "p-2 text-red-600 hover:text-red-700"
                  }
                  title={isCameraOn ? "Turn off camera" : "Turn on camera"}
                >
                  <Camera className="w-6 h-6" />
                </button>
                <button
                  className="bg-[#1B2744] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#131d33] transition-colors flex items-center gap-2"
                  onClick={handleNextQuestion}
                >
                  Next Question
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right - Question and Transcription */}
          <div className="w-96 flex flex-col gap-6 overflow-y-auto">
            {/* Question Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-cyan-600 text-sm font-semibold mb-2 uppercase">
                {questions[currentQuestion].type}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {questions[currentQuestion].question}
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span>{questions[currentQuestion].tip}</span>
                </p>
              </div>
            </div>

            {/* Live Transcription */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-1 flex flex-col">
              <h4 className="font-semibold text-gray-900 mb-4">
                Live Transcription
              </h4>
              <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto">
                <p className="text-gray-600 text-sm leading-relaxed">
                  Listening for your response...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{text}</span>
    </li>
  );
}

function MetricCard({
  label,
  percentage,
  description,
}: {
  label: string;
  percentage: number;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{label}</h4>
        <span className="text-lg font-bold text-gray-900">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className="bg-[#1B2744] h-2 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export default function MockInterviewPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const studentId = useStudentId(user?.id);

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate("/login");
    }
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  return (
    <MockInterviewPageContent
      email={user?.email || ""}
      userId={user?.id || ""}
      studentId={studentId}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
    />
  );
}
