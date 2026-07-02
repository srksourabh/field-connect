"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Phone, Lock, X, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import PWAInstallPrompt from "@/components/ui/PWAInstallPrompt";

const SLIDES = [
  "/login-bg/slide-1.webp",
  "/login-bg/slide-2.webp",
  "/login-bg/slide-3.webp",
  "/login-bg/slide-4.webp",
  "/login-bg/slide-5.webp",
];

const SLIDE_CAPTIONS = [
  "Field visits, powered by technology",
  "Smart sales, smarter tracking",
  "Real-time field monitoring",
  "Teams that move with purpose",
  "Attendance at your fingertips",
];

const INTERVAL = 5000;

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const cleanupDone = useRef(false);

  // Clear any stale session on login page mount.
  // If a user reaches /login, they are not authenticated — any leftover
  // session in localStorage is stale and would cause redirect loops.
  useEffect(() => {
    if (cleanupDone.current) return;
    cleanupDone.current = true;
    try { sessionStorage.setItem("user_logout", "true"); } catch { /* ignore */ }
    supabase.auth.signOut().catch(() => {});
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, INTERVAL);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    const { error: authError } = await signIn(cleanPhone, password);
    setLoading(false);

    if (authError) {
      setError("Invalid mobile number or password");
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background slideshow */}
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
          style={{ opacity: i === currentSlide ? 1 : 0 }}
        >
          <Image
            src={src}
            alt={SLIDE_CAPTIONS[i]}
            fill
            className="object-cover"
            priority={i === 0}
            loading={i === 0 ? "eager" : "lazy"}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-between px-6 py-10">
        {/* Top section — Logo + tagline */}
        <div className="text-center pt-8">
          <div className="flex justify-center mb-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg">
              <Image
                src="/brands/uds-logo.jpg"
                alt="Field Connect powered by UDS"
                width={120}
                height={48}
                className="h-12 w-auto"
              />
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight mt-4">
            Field Connect <span className="text-blue-400">HR</span>
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Workforce management, reimagined
          </p>
        </div>

        {/* Middle — Login form */}
        <div className="w-full max-w-sm">
          <div className="bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 text-center">
              Sign in to your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Phone */}
              <div>
                <label htmlFor="phone" className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    maxLength={10}
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !phone || !password}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              {/* Forgot Password */}
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Forgot Password?
              </button>

              {/* Help text */}
              <p className="text-[11px] text-center text-gray-400 dark:text-gray-500">
                Contact your admin if you need help with your credentials
              </p>
            </form>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt variant="overlay" />

        {/* Bottom — Slide caption + dots */}
        <div className="text-center pb-4">
          <p className="text-white/80 text-sm font-medium mb-3 min-h-[20px] transition-all">
            {SLIDE_CAPTIONS[currentSlide]}
          </p>
          <div className="flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"phone" | "confirm" | "success">("phone");
  const [phone, setPhone] = useState("");
  const [maskedName, setMaskedName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMsg("Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, step: "lookup" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong");
        return;
      }

      setMaskedName(data.masked_name);
      setStep("confirm");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setErrorMsg("");
    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, "");
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, step: "reset" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong");
        return;
      }

      setStep("success");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {step === "confirm" && (
              <button onClick={() => { setStep("phone"); setErrorMsg(""); }} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <h3 className="text-lg font-semibold">Forgot Password</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {step === "phone" && (
          <form onSubmit={handleLookup} className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your registered mobile number to reset your password.
            </p>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={10}
                autoFocus
              />
            </div>
            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, "").length !== 10}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Checking..." : "Continue"}
            </button>
          </form>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We found an account. Is this you?
            </p>
            <p className="text-sm font-medium bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 text-center">
              {maskedName}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Your password will be reset to the default: first 4 letters of your name (lowercase) + last 4 digits of your phone.
            </p>
            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Resetting..." : "Yes, Reset My Password"}
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-600">Password reset successfully!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your password is now: first 4 letters of your name (lowercase) + last 4 digits of your phone number. You can change it from your profile after logging in.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
