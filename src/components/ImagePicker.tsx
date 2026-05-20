"use client";

import { useEffect, useState } from "react";

interface ImageItem {
  _id: string;
  url: string;
  type?: string;
  category?: string;
  desc?: string;
}

interface Props {
  pageUrl: string;
  domain: string;
  selected: string[];
  onSelect: (urls: string[]) => void;
  onClose: () => void;
}

export default function ImagePicker({ pageUrl, domain, selected, onSelect, onClose }: Props) {
  const [pageImages, setPageImages] = useState<ImageItem[]>([]);
  const [allImages, setAllImages] = useState<ImageItem[]>([]);
  const [tab, setTab] = useState<"page" | "all">("page");
  const [picked, setPicked] = useState<Set<string>>(new Set(selected));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch page images
    fetch(`/api/images?pageUrl=${encodeURIComponent(pageUrl)}`)
      .then((r) => r.json())
      .then((d) => setPageImages(d.images || []))
      .catch(() => {});

    // Fetch all domain images
    fetch(`/api/images?domain=${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then((d) => setAllImages(d.images || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageUrl, domain]);

  const images = tab === "page" ? pageImages : allImages;

  const toggle = (url: string) => {
    const next = new Set(picked);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setPicked(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-slate">Select Images</h2>
            <p className="text-xs text-slate-light mt-0.5">{picked.size} selected</p>
          </div>
          <button onClick={onClose} className="text-slate-light hover:text-slate text-xl leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 pt-3 border-b border-gray-100">
          <button
            onClick={() => setTab("page")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "page" ? "border-brand text-brand" : "border-transparent text-slate-light hover:text-slate"
            }`}
          >
            Page Images ({pageImages.length})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "all" ? "border-brand text-brand" : "border-transparent text-slate-light hover:text-slate"
            }`}
          >
            All {domain} ({allImages.length})
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-slate-light text-center py-12">Loading images...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-slate-light text-center py-12">No images found.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img) => {
                const isPicked = picked.has(img.url);
                return (
                  <div
                    key={img._id || img.url}
                    onClick={() => toggle(img.url)}
                    className={`relative aspect-[1.9/1] bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02] ${
                      isPicked ? "border-brand ring-2 ring-brand/20" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.desc || ""}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {isPicked && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-brand rounded-full flex items-center justify-center text-white text-xs font-bold">
                        ✓
                      </div>
                    )}
                    {img.category && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] rounded">
                        {img.category}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
