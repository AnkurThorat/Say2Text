import axios from "axios";

const API_BASE = "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE,
});

export const uploadAudio = (blobOrFile, onUploadProgress) => {
  const form = new FormData();
  const isFile = blobOrFile instanceof File;
  form.append(
    "audio",
    isFile
      ? blobOrFile
      : new File([blobOrFile], "recording.webm", { type: "audio/webm" })
  );

  return api.post("/transcribe", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
};

export const fetchTranscriptions = () => api.get("/transcriptions");
export const deleteTranscription = (id) => api.delete(`/transcriptions/${id}`);
