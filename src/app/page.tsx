"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  if (loading) return null;
  if (user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left — brand statement */}
      <div className="hidden lg:flex lg:w-5/12 bg-slate items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,92,53,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(81,111,144,0.2),transparent_50%)]" />
        <div className="relative z-10 max-w-sm px-12">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-xs font-medium text-white/40 tracking-widest uppercase">AdsPortal</span>
          </div>
          <p className="text-3xl font-bold text-white leading-tight mb-6">
            Every headline, every image, every landing page — applied before it goes live.
          </p>
          <p className="text-base text-white/50 leading-relaxed">
            Creative approval for Google Ads campaigns. Built for agencies that can&apos;t afford mistakes.
          </p>
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-xs text-white/30">Google Ads creative approval</p>
            <p className="text-sm text-white/50 mt-1 font-medium">Request. Process. Go live.</p>
          </div>
        </div>
      </div>

      {/* Right — login */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-brand" />
              <span className="text-xs font-medium text-slate-light/50 tracking-widest uppercase">AdsPortal</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate mb-2">Sign in</h2>
          <p className="text-sm text-slate-light mb-10">Access your campaign dashboard.</p>

          <form onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-6 text-xs text-red-700">{error}</div>
            )}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@agency.com"
                  className="w-full px-0 py-3 border-0 border-b border-gray-200 text-sm text-slate placeholder:text-slate-light/40 focus:outline-none focus:border-slate transition-colors bg-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-0 py-3 border-0 border-b border-gray-200 text-sm text-slate placeholder:text-slate-light/40 focus:outline-none focus:border-slate transition-colors bg-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-8 py-3 bg-slate text-white rounded-xl text-sm font-semibold hover:bg-slate/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
