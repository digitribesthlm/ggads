"use client";

import { useEffect, useState } from "react";

interface VideoItem {
  _id: string;
  videoId: string;
  url: string;
  title?: string;
  thumbnailUrl: string;
  channelName?: string;
}

interface Props {
  pageUrl: string;
  domain: string;
  selected: string[];
  onSelect: (urls: string[]) => void;
  onClose: () => void;
}

export default function VideoPicker({ pageUrl, domain, selected, onSelect, onClose }: Props) {
  const [pageVideos, setPageVideos] = useState<VideoItem[]>([]);
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [tab, setTab] = useState<"page" | "all">("page");
  const [picked, setPicked] = useState<Set<string>>(new Set(selected));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 20;

  useEffect(() => {
    const sq = search ? `&search=${encodeURIComponent(search)}` : "";
    fetch(`/api/videos?pageUrl=${encodeURIComponent(pageUrl)}${sq}`)
      .then((r) => r.json())
      .then((d) => setPageVideos(d.videos || []))
      .catch(() => {});

    fetch(`/api/videos?page=${page}&limit=${limit}${sq}`)
      .then((r) => r.json())
      .then((d) => {
        setAllVideos(d.videos || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageUrl, search, page]);

  const videos = tab === "page" ? pageVideos : allVideos;

  useEffect(() => { setPage(1); }, [search]);

  const toggle = (url: string) => {
    const next = new Set(picked);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setPicked(next);
  };

  const playUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-slate">Select Videos</h2>
            <p className="text-xs text-slate-light mt-0.5">{picked.size} selected</p>
          </div>
          <button onClick={onClose} className="text-slate-light hover:text-slate text-xl leading-none">&times;</button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 pt-3 border-b border-gray-100">
          <button
            onClick={() => setTab("page")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "page" ? "border-brand text-brand" : "border-transparent text-slate-light hover:text-slate"
            }`}
          >
            Page Videos ({pageVideos.length})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "all" ? "border-brand text-brand" : "border-transparent text-slate-light hover:text-slate"
            }`}
          >
            All videos ({total || allVideos.length})
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-slate-light text-center py-12">Loading videos...</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-slate-light text-center py-12">No videos found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {videos.map((vid) => {
                const isPicked = picked.has(vid.url);
                return (
                  <div
                    key={vid._id || vid.url}
                    className={`relative bg-gray-100 rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.01] ${
                      isPicked ? "border-brand ring-2 ring-brand/20" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative aspect-video bg-black cursor-pointer"
                      onClick={() => window.open(playUrl(vid.videoId), "_blank")}
                    >
                      {vid.thumbnailUrl ? (
                        <img
                          src={vid.thumbnailUrl}
                          alt={vid.videoId}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                          No preview
                        </div>
                      )}
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white text-sm">
                          ▶
                        </div>
                      </div>
                    </div>

                    {/* Info bar */}
                    <div
                      className="flex items-center justify-between px-3 py-2 cursor-pointer"
                      onClick={() => toggle(vid.url)}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate truncate leading-tight">
                          {vid.title || vid.videoId}
                        </div>
                        {vid.channelName && (
                          <div className="text-[10px] text-slate-light truncate mt-0.5">{vid.channelName}</div>
                        )}
                      </div>
                      {isPicked && (
                        <div className="w-5 h-5 bg-brand rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ml-2">
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {tab === "all" && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-6 py-2 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-slate-light hover:text-slate hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-slate-light">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-slate-light hover:text-slate hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => setPicked(new Set())}
            className="text-xs text-slate-light hover:text-slate"
          >
            Clear selection
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-light hover:text-slate">
              Cancel
            </button>
            <button
              onClick={() => onSelect(Array.from(picked))}
              className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
            >
              Save ({picked.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
