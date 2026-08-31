"use client";

import { useEffect, useState } from "react";

interface Video {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

interface Download {
  _id: string;
  userPlan: string;
  downloadedAt: string;
  videoId: Video;
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [downloadInfo, setDownloadInfo] = useState<{
    plan: string;
    downloadedToday: number;
    dailyLimit: number | string;
    remaining: number | string;
  } | null>(null);

  // ==========================================
  // GET DOWNLOAD HISTORY
  // ==========================================

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      setError("Please login first.");
      setLoading(false);
      return;
    }

    fetchDownloads(userId);
    fetchDownloadInfo(userId);
  }, []);

  // ==========================================
  // FETCH DOWNLOAD HISTORY
  // ==========================================

  async function fetchDownloads(userId: string) {
    try {
      const response = await fetch(
        `http://localhost:5000/api/downloads/user/${userId}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not load downloads.");
        return;
      }

      setDownloads(data.downloads || []);
    } catch (error) {
      console.error(error);

      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // FETCH TODAY DOWNLOAD INFO
  // ==========================================

  async function fetchDownloadInfo(userId: string) {
    try {
      const response = await fetch(
        `http://localhost:5000/api/downloads/user/${userId}/today`
      );

      const data = await response.json();

      if (response.ok) {
        setDownloadInfo(data);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // ==========================================
  // DOWNLOAD VIDEO
  // ==========================================

  async function downloadVideo(video: Video) {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      setDownloadError("Please login first.");
      return;
    }

    setDownloadError("");
    setDownloadingId(video._id);

    try {
      // ========================================
      // STEP 1: ASK BACKEND FOR DOWNLOAD
      // ========================================

      const response = await fetch(
        "http://localhost:5000/api/downloads",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId: userId,
            videoId: video._id,
          }),
        }
      );

      const data = await response.json();

      // ========================================
      // STEP 2: CHECK BACKEND RESPONSE
      // ========================================

      if (!response.ok) {
        setDownloadError(
          data.message || "Download is not allowed."
        );

        // Refresh today's download information
        await fetchDownloadInfo(userId);

        return;
      }

      // ========================================
      // STEP 3: DOWNLOAD VIDEO
      // ========================================

      const link = document.createElement("a");

      link.href = video.videoUrl;

      link.download = video.title || "video";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      // ========================================
      // STEP 4: UPDATE DOWNLOAD INFO
      // ========================================

      await fetchDownloadInfo(userId);

      // ========================================
      // SUCCESS MESSAGE
      // ========================================

      setDownloadError("");

    } catch (error) {
      console.error("Download error:", error);

      setDownloadError(
        "Could not connect to download server."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white text-xl">
          Loading downloads...
        </p>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 px-4 py-10">

      <div className="max-w-5xl mx-auto">

        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">

          <div>
            <h1 className="text-3xl font-bold text-white">
              📥 My Downloads
            </h1>

            <p className="text-gray-300 mt-2">
              Videos you have downloaded
            </p>
          </div>

          {downloadInfo && (
            <div className="mt-4 sm:mt-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-white">

              <p className="text-sm text-gray-300">
                Current Plan
              </p>

              <p className="text-xl font-bold capitalize">
                {downloadInfo.plan}
              </p>

              <p className="text-sm text-gray-300 mt-1">
                Today: {downloadInfo.downloadedToday} /{" "}
                {downloadInfo.dailyLimit}
              </p>

              <p className="text-sm text-green-300 mt-1">
                Remaining: {downloadInfo.remaining}
              </p>

            </div>
          )}

        </div>

        {/* ==========================================
            GENERAL ERROR
        ========================================== */}

        {error && (
          <div className="bg-red-500/20 border border-red-400 text-red-200 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* ==========================================
            DOWNLOAD ERROR
        ========================================== */}

        {downloadError && (
          <div className="bg-red-500/20 border border-red-400 text-red-200 rounded-xl p-4 mb-6">
            ❌ {downloadError}
          </div>
        )}

        {/* ==========================================
            EMPTY
        ========================================== */}

        {!error && downloads.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center">

            <div className="text-5xl mb-4">
              📥
            </div>

            <h2 className="text-2xl font-bold text-gray-800">
              No downloads yet
            </h2>

            <p className="text-gray-500 mt-2">
              Videos you download will appear here.
            </p>

          </div>
        )}

        {/* ==========================================
            DOWNLOAD LIST
        ========================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {downloads.map((download) => {

            const video = download.videoId;

            const limitReached =
              downloadInfo &&
              downloadInfo.remaining !== "Unlimited" &&
              Number(downloadInfo.remaining) <= 0;

            const isDownloading =
              downloadingId === video._id;

            return (
              <div
                key={download._id}
                className="bg-white rounded-2xl overflow-hidden shadow-xl"
              >

                {/* ==================================
                    VIDEO
                ================================== */}

                <div className="bg-black">

                  <video
                    src={video.videoUrl}
                    controls
                    className="w-full aspect-video"
                  />

                </div>

                {/* ==================================
                    DETAILS
                ================================== */}

                <div className="p-5">

                  <h2 className="text-xl font-bold text-gray-800">
                    {video.title}
                  </h2>

                  {video.description && (
                    <p className="text-gray-500 mt-2">
                      {video.description}
                    </p>
                  )}

                  {/* PLAN + DATE */}

                  <div className="flex items-center justify-between mt-4">

                    <span className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full capitalize">
                      {download.userPlan}
                    </span>

                    <span className="text-sm text-gray-500">
                      {new Date(
                        download.downloadedAt
                      ).toLocaleDateString()}
                    </span>

                  </div>

                  {/* ==================================
                      DOWNLOAD BUTTON
                  ================================== */}

                  <button
                    onClick={() => downloadVideo(video)}
                    disabled={
                      isDownloading ||
                      Boolean(limitReached)
                    }
                    className={`w-full mt-4 font-semibold py-3 rounded-xl transition ${
                      isDownloading || limitReached
                        ? "bg-gray-400 cursor-not-allowed text-white"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >

                    {isDownloading
                      ? "⏳ Checking..."
                      : limitReached
                      ? "🚫 Daily Limit Reached"
                      : "⬇️ Download Again"}

                  </button>

                </div>

              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}