import React, { useRef, useState, useEffect } from "react";
import { Mic, MicOff, Upload, Trash2, Clock } from "lucide-react";
import {
  uploadAudio,
  fetchTranscriptions,
  deleteTranscription,
} from "./services/api";

const voiceIllustration = "/logo.png";

/* ---------------------- Reusable UI Components ---------------------- */
const Button = ({
  children,
  variant = "default",
  size = "default",
  className = "",
  onClick,
  ...props
}) => {
  const variants = {
    default:
      "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-purple-400 text-purple-200 hover:bg-purple-500/10",
    secondary: "bg-purple-100 text-purple-800 hover:bg-purple-200",
    ghost: "text-purple-200 hover:bg-purple-500/10",
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-6 text-lg",
    icon: "h-10 w-10 p-2",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "", ...props }) => (
  <div
    className={`rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg hover:shadow-2xl transition ${className}`}
    {...props}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className = "", ...props }) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ children, className = "", ...props }) => (
  <h3
    className={`text-xl font-semibold text-purple-100 ${className}`}
    {...props}
  >
    {children}
  </h3>
);

const CardContent = ({ children, className = "", ...props }) => (
  <div className={`p-5 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = "default", className = "", ...props }) => {
  const variants = {
    default: "bg-purple-600 text-white",
    secondary: "bg-purple-200 text-purple-900",
    destructive: "bg-red-500 text-white",
    outline: "border border-purple-300 text-purple-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
/* ------------------------------------------------------------------- */

export default function VoiceToTextApp() {
  const [text, setText] = useState("Your transcribed text will appear here...");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const uploadInputRef = useRef(null);

  // Load history on mount
  useEffect(() => {
    fetchTranscriptionHistory();
  }, []);

  const fetchTranscriptionHistory = async () => {
    try {
      const { data } = await fetchTranscriptions();
      setItems(data);
    } catch (error) {
      console.error(error);
      alert("Failed to load history");
    }
  };

  /* -------------------- Upload/Recording Logic -------------------- */
  const handleUploadClick = () => uploadInputRef.current?.click();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await transcribeAudio(file, "upload");
    e.target.value = ""; // reset file input
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(blob, "recording");
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream
      .getTracks()
      .forEach((track) => track.stop());
    setIsRecording(false);
  };

  const transcribeAudio = async (blobOrFile, source) => {
    setIsUploading(true);
    setUploadProgress(0);
    setText("Transcribing... please wait...");

    try {
      const { data } = await uploadAudio(blobOrFile, (progressEvent) => {
        if (!progressEvent.total) return;
        const percent = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100
        );
        setUploadProgress(percent);
      });

      setItems((prev) => [data, ...prev]);
      setSelectedId(data._id);
      setText(data.transcript);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.error || "Upload/transcription failed");
      setText("Your transcribed text will appear here...");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  /* --------------------------------------------------------------- */

  /* ------------------------ History Actions ----------------------- */
  const selectItem = (item) => {
    setText(item.transcript);
    setSelectedId(item._id);
  };

  const deleteItem = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteTranscription(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setText("Your transcribed text will appear here...");
      }
    } catch (error) {
      console.error(error);
      alert("Delete failed");
    }
  };

  const clearHistory = () => {
    setItems([]);
    setSelectedId(null);
    setText("Your transcribed text will appear here...");
  };

  const formatTimestamp = (ts) => new Date(ts).toLocaleString();
  /* --------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white flex flex-col">
      {/* Header */}
      <header className="py-10 text-center">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text ">
          🎤 Voice-to-Text Studio
        </h1>
        <p className="text-lg text-purple-200">
          Convert your voice into words with AI precision
        </p>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col xl:flex-row gap-6 px-6 md:px-12 pb-12">
        {/* Left Section */}
        <div className="xl:w-2/3 space-y-6">
          {/* Audio Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-300">
                <Mic className="w-5 h-5" /> Audio Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap items-center">
                <Button
                  variant="secondary"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Audio"}
                </Button>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleUpload}
                  className="hidden"
                />
                {!isRecording ? (
                  <Button onClick={startRecording} disabled={isUploading}>
                    <Mic className="w-4 h-4 mr-2" /> Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive">
                    <MicOff className="w-4 h-4 mr-2" /> Stop Recording
                  </Button>
                )}
              </div>

              {isUploading && (
                <div className="mt-4 w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcription Output */}
          <Card>
            <CardHeader>
              <CardTitle>Transcribed Text</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[250px] rounded-lg p-4 bg-white/5 border border-white/20 text-white outline-none resize-none focus:ring-2 focus:ring-purple-300"
                value={text}
                readOnly
              />
              <div className="mt-4 text-right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(text);
                    alert("Transcribed text copied to clipboard!");
                  }}
                >
                  📋 Copy Text
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Section */}
        <div className="xl:w-1/3 space-y-6">
          {/* Illustration */}
          <Card>
            <CardContent className="p-0 mt-2">
              <img
                src={voiceIllustration}
                alt="Voice Illustration"
                className="w-full h-64 object-cover rounded-t-xl"
              />
              <div className="p-4 text-center text-purple-200 italic">
                "Transform your voice into powerful words"
              </div>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                History ({items.length})
              </CardTitle>
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-purple-200 text-center py-8">
                  No transcriptions yet.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => selectItem(item)}
                    className={`p-3 rounded-lg cursor-pointer transition transform hover:scale-[1.01] hover:shadow-lg ${
                      selectedId === item._id
                        ? "bg-purple-600/30 border border-purple-400"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="secondary">
                        {item.mimeType || "audio"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => deleteItem(item._id, e)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-purple-100 line-clamp-2 mb-1">
                      {item.transcript}
                    </p>
                    <p className="text-xs text-purple-300">
                      {formatTimestamp(item.createdAt)} • {item.size}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-purple-200 text-sm">
        © {new Date().getFullYear()} Voice-to-Text Studio. Transform speech into
        text with precision.
      </footer>
    </div>
  );
}
