"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  Calendar,
  TreePalm,
  Users,
  MapPin,
  CheckCircle,
  FileText,
  UserPlus,
  Shield,
  Wifi,
  WifiOff,
  Smartphone,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import PWAInstallPrompt from "@/components/ui/PWAInstallPrompt";

/* ── Hero Slides ── */
const heroSlides = [
  {
    src: "/hero/hero-1.webp",
    headline: "Empowering India's MSMEs",
    sub: "Digital tools that help small businesses manage their field teams with enterprise-grade precision.",
  },
  {
    src: "/hero/hero-2.webp",
    headline: "Teams That Move Together",
    sub: "Morning huddles to evening reports — track every moment of your distributed workforce.",
  },
  {
    src: "/hero/hero-3.webp",
    headline: "Built for Business Leaders",
    sub: "Real-time dashboards, attendance insights, and leave management at your fingertips.",
  },
  {
    src: "/hero/hero-4.webp",
    headline: "Smart Field Tracking",
    sub: "GPS-verified routes, live locations, and automated distance calculation for your field force.",
  },
];

/* ── Feature Screens ── */
const features = [
  {
    icon: Clock,
    title: "One-Tap Punch In/Out",
    desc: "GPS-verified attendance with live timer. Works offline too — syncs automatically when back online.",
    screen: "/screens/01_employee_punch_dashboard.png",
    screenAlt: "Employee punch dashboard",
    bg: "/feature-bg/feat-1.webp",
  },
  {
    icon: Calendar,
    title: "Attendance History",
    desc: "Color-coded calendar view with daily punch timelines. Spot patterns, track hours, request rectifications.",
    screen: "/screens/02_attendance_history_calendar.png",
    screenAlt: "Attendance history calendar",
    bg: "/feature-bg/feat-2.webp",
  },
  {
    icon: TreePalm,
    title: "Leave Management",
    desc: "Real-time balance cards, one-step applications with auto-deduction. No more paper forms.",
    screen: "/screens/03_leave_application_portal.png",
    screenAlt: "Leave application portal",
    bg: "/feature-bg/feat-3.webp",
  },
  {
    icon: Users,
    title: "Team Organogram",
    desc: "Interactive org chart showing your entire team hierarchy. Tap any node for employee details.",
    screen: "/screens/06_interactive_team_organogram.png",
    screenAlt: "Interactive team organogram",
    bg: "/feature-bg/feat-4.webp",
  },
  {
    icon: MapPin,
    title: "Live Field Tracking",
    desc: "Real-time map view of field team locations. Track routes, distances, and activity status.",
    screen: "/screens/07_field_team_live_tracking_map.png",
    screenAlt: "Field team live tracking map",
    bg: "/feature-bg/feat-5.webp",
  },
  {
    icon: CheckCircle,
    title: "Manager Approvals",
    desc: "Review and approve leave requests with full context — reason, attachments, team capacity impact.",
    screen: "/screens/08_manager_leave_approval_center.png",
    screenAlt: "Manager leave approval center",
    bg: "/feature-bg/feat-6.webp",
  },
  {
    icon: FileText,
    title: "Reports & Export",
    desc: "Filter by date, project, department. Preview data tables and download CSV with one tap.",
    screen: "/screens/09_admin_attendance_report_gen.png",
    screenAlt: "Admin attendance report generator",
    bg: "/feature-bg/feat-7.webp",
  },
  {
    icon: UserPlus,
    title: "Employee Onboarding",
    desc: "3-step guided form — personal details, KYC & bank, job info. Auto-saved drafts, no data loss.",
    screen: "/screens/10_employee_onboarding_form.png",
    screenAlt: "Employee onboarding form",
    bg: "/feature-bg/feat-8.webp",
  },
];

const highlights = [
  {
    icon: WifiOff,
    title: "Offline-First",
    desc: "Punch in without internet. Data queues locally and syncs when connected.",
  },
  {
    icon: Shield,
    title: "GPS Verified",
    desc: "Every punch is tagged with location. No proxy attendance.",
  },
  {
    icon: Smartphone,
    title: "Mobile PWA",
    desc: "Install on any phone. No app store needed. Works like a native app.",
  },
  {
    icon: Wifi,
    title: "Real-Time Sync",
    desc: "Supabase-powered backend. Changes reflect instantly across all devices.",
  },
];

const HERO_INTERVAL = 6000;

export default function LandingPage() {
  const [heroIdx, setHeroIdx] = useState(0);

  const nextHero = useCallback(() => {
    setHeroIdx((prev) => (prev + 1) % heroSlides.length);
  }, []);

  useEffect(() => {
    const t = setInterval(nextHero, HERO_INTERVAL);
    return () => clearInterval(t);
  }, [nextHero]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brands/uds-logo.jpg"
              alt="Field Connect powered by UDS"
              width={100}
              height={40}
              className="h-9 w-auto"
            />
          </Link>
          <div className="hidden sm:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#products" className="hover:text-primary transition-colors">Products</a>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#highlights" className="hover:text-primary transition-colors">Why Field Connect</a>
          </div>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero Slideshow ── */}
      <section className="relative h-[70vh] sm:h-[80vh] overflow-hidden">
        {/* Slides */}
        {heroSlides.map((slide, i) => (
          <div
            key={slide.src}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === heroIdx ? 1 : 0 }}
          >
            <Image
              src={slide.src}
              alt={slide.headline}
              fill
              className="object-cover"
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium mb-5 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Field Connect powered by UDS
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white mb-4 max-w-3xl">
              {heroSlides[heroIdx].headline}
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mb-8 leading-relaxed">
              {heroSlides[heroIdx].sub}
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/login"
                className="group flex items-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/30"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-2xl border border-white/30 hover:bg-white/10 backdrop-blur-sm transition-all"
              >
                Explore Features
              </a>
            </div>

            {/* Dots */}
            <div className="flex gap-2.5 mt-8">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === heroIdx ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Banners ── */}
      <section id="products" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Our Products
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Purpose-built tools for every team in your organization.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Field Connect */}
            <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all">
              <div className="aspect-[4/1] relative bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brands/field-connect-banner.svg"
                  alt="Field Connect"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="6" fill="#137fec" />
                    <path d="M16 6c-4.4 0-8 3.6-8 8 0 6 8 14 8 14s8-8 8-14c0-4.4-3.6-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" fill="white" />
                  </svg>
                  <h3 className="text-xl font-bold">Field Connect</h3>
                </div>
                <p className="text-gray-500 leading-relaxed">
                  GPS-verified attendance, live field team tracking, leave management,
                  and team organogram — built for distributed teams that work on the ground.
                </p>
              </div>
            </div>

            {/* POSBuddy */}
            <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all">
              <div className="aspect-[4/1] relative overflow-hidden">
                <Image
                  src="/brands/posbuddy-banner-wide.png"
                  alt="UDS POSBuddy"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Image
                    src="/brands/posbuddy-icon.png"
                    alt="POSBuddy"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                  <h3 className="text-xl font-bold">UDS POSBuddy</h3>
                </div>
                <p className="text-gray-500 leading-relaxed">
                  POS team management, shift tracking, terminal assignment, and attendance
                  — purpose-built for retail and hospitality point-of-sale teams.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features with Phone Screens ── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Field Connect
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Everything Your HR Team Needs
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From daily punch-in to annual reports — 8 modules designed for Indian field teams.
            </p>
          </div>

          <div className="space-y-12">
            {features.map((f, i) => {
              const isEven = i % 2 === 0;
              return (
                <div
                  key={f.title}
                  className={`relative rounded-3xl overflow-hidden min-h-[400px] sm:min-h-[440px] flex ${isEven ? "flex-row" : "flex-row-reverse"}`}
                >
                  {/* Full-width tech background image */}
                  <Image
                    src={f.bg}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />

                  {/* Gradient fade: opaque on phone side → transparent in middle → white on text side */}
                  <div
                    className="absolute inset-0 z-[1]"
                    style={{
                      background: isEven
                        ? "linear-gradient(to right, transparent 0%, transparent 25%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.7) 55%, white 70%, white 100%)"
                        : "linear-gradient(to left, transparent 0%, transparent 25%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.7) 55%, white 70%, white 100%)",
                    }}
                  />

                  {/* Phone side */}
                  <div className={`relative z-[2] w-5/12 hidden lg:flex items-center ${isEven ? "justify-center" : "justify-center"} py-10`}>
                    <div className="relative w-[200px] sm:w-[220px]">
                      <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-black/30 border-[5px] border-gray-800 bg-gray-900">
                        <Image
                          src={f.screen}
                          alt={f.screenAlt}
                          width={220}
                          height={476}
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text side */}
                  <div className={`relative z-[2] flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-16 ${!isEven ? "lg:text-right" : ""}`}>
                    <div className={`${!isEven ? "lg:ml-auto" : ""} max-w-md`}>
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
                        <f.icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold mb-4">{f.title}</h3>
                      <p className="text-lg text-gray-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>

                  {/* Mobile: faint phone watermark */}
                  <div className="lg:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-[140px] opacity-15 z-[3]">
                    <Image
                      src={f.screen}
                      alt={f.screenAlt}
                      width={140}
                      height={300}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Key Highlights ── */}
      <section id="highlights" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Why Field Connect?
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((h) => (
              <div key={h.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <h.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-base mb-1.5">{h.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero/hero-4.webp"
            alt="Smart tracking"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/85" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-white">
            Ready to modernize your HR?
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto">
            Access Field Connect, POSBuddy, and more from a single unified platform.
          </p>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 px-10 py-4 bg-primary text-white font-semibold text-lg rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/30"
          >
            Sign in to Field Connect
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt variant="inline" />

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brands/uds-logo.jpg"
              alt="UDS"
              width={80}
              height={32}
              className="h-7 w-auto"
            />
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm font-medium text-gray-600">
              Unified HR Platform
            </span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Field Connect powered by UDS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
