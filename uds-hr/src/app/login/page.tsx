"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Phone, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";

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
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === currentSlide ? 1 : 0 }}
        >
          <Image
            src={src}
            alt={SLIDE_CAPTIONS[i]}
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-between px-6 py-10">
        {/* Top section — Logo + tagline */}
        <div className="text-center pt-8">
          <div className="flex justify-center mb-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg">
              <Image
                src="/brands/uds-logo.jpg"
                alt="UDS - Ultimate Digital Solutions"
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
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
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
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
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

              {/* Hint */}
              <p className="text-[11px] text-center text-gray-400 dark:text-gray-500">
                Default password: first 4 letters of name (lowercase) + last 4
                digits of mobile
              </p>
            </form>
          </div>
        </div>

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
