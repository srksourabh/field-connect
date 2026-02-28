"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { logError } from "@/lib/utils";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import StepProgress from "@/components/onboarding/StepProgress";
import PersonalDetailsForm from "@/components/onboarding/PersonalDetailsForm";
import KycBankForm from "@/components/onboarding/KycBankForm";
import JobInfoForm from "@/components/onboarding/JobInfoForm";
import { supabase } from "@/lib/supabase";

const STEPS = ["Personal", "KYC & Bank", "Job Info"];

type TokenStatus = "loading" | "valid" | "used" | "expired" | "invalid";

export default function PublicOnboardingPage() {
  const params = useParams();
  const token = params.token as string;

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [credentials, setCredentials] = useState<{ phone: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    bloodGroup: "",
    address: "",
  });

  const [kyc, setKyc] = useState({
    aadhaar: "",
    pan: "",
    bankName: "",
    accountNo: "",
    ifsc: "",
  });

  const [job, setJob] = useState({
    designation: "",
    department: "",
    project: "",
    reportingManager: "",
    joiningDate: "",
    role: "employee",
  });

  // Validate token on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("hr_onboarding_tokens")
          .select("expires_at, used_at")
          .eq("token", token)
          .maybeSingle();

        if (!data) {
          setTokenStatus("invalid");
          return;
        }
        if (data.used_at) {
          setTokenStatus("used");
          return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setTokenStatus("expired");
          return;
        }
        setTokenStatus("valid");
      } catch (err) {
        logError("Token validation error:", err);
        setTokenStatus("invalid");
      }
    })();
  }, [token]);

  const handlePersonalChange = (field: string, value: string) => {
    setPersonal((prev) => ({ ...prev, [field]: value }));
  };

  const handleKycChange = (field: string, value: string) => {
    setKyc((prev) => ({ ...prev, [field]: value }));
  };

  const handleJobChange = (field: string, value: string) => {
    setJob((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    if (currentStep < 3) {
      // Validate step 1 required fields
      if (currentStep === 1) {
        if (!personal.fullName.trim() || !personal.phone.trim()) {
          setError("Please fill in Name and Phone.");
          return;
        }
        const digits = personal.phone.replace(/\D/g, "");
        if (digits.length < 10) {
          setError("Please enter a valid 10-digit phone number.");
          return;
        }
        if (personal.fullName.replace(/\s+/g, "").length < 4) {
          setError("Name must be at least 4 characters (needed to generate your password).");
          return;
        }
        setError(null);
      }
      // Validate step 2: no required fields (KYC/Bank are optional during onboarding)
      // Validate step 3 required fields
      if (currentStep === 2) {
        setError(null);
      }
      setCurrentStep((s) => s + 1);
      return;
    }

    // Final submission: validate step 3 required fields
    if (!job.designation.trim() || !job.department || !job.project) {
      setError("Please fill in Designation, Department, and Project.");
      return;
    }

    // Submit
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, personal, kyc, job }),
      });

      const data = await res.json();

      if (res.ok) {
        setCredentials({ phone: data.loginPhone, password: data.defaultPassword });
        setSubmitted(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      logError("Onboarding submission error:", err);
      setError("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  // Loading state
  if (tokenStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-gray-500">Validating your link...</p>
      </div>
    );
  }

  // Invalid/expired/used states
  if (tokenStatus !== "valid") {
    const messages: Record<string, { title: string; desc: string }> = {
      invalid: { title: "Invalid Link", desc: "This onboarding link doesn't exist. Please contact your admin for a new link." },
      used: { title: "Already Used", desc: "This onboarding link has already been used. Your account should be ready — try logging in." },
      expired: { title: "Link Expired", desc: "This onboarding link has expired. Please contact your admin for a new link." },
    };
    const msg = messages[tokenStatus];

    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-lg font-semibold mb-2">{msg.title}</h1>
        <p className="text-sm text-gray-500 text-center">{msg.desc}</p>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Welcome Aboard!</h1>
        <p className="text-sm text-gray-500 text-center mb-1">
          Your account has been created successfully.
        </p>
        {credentials && (
          <div className="w-full max-w-xs bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 my-4">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3 text-center">Your Login Credentials</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Phone</span>
                <span className="text-sm font-mono font-medium">{credentials.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Password</span>
                <span className="text-sm font-mono font-medium">{credentials.password}</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-3">
              Save these before leaving this page. You can change your password after logging in.
            </p>
          </div>
        )}
        <Link href="/login" className="uds-btn-primary px-8">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="pt-8 pb-4 px-6 bg-white/50 dark:bg-[#151f2b] backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-center">
          Employee Onboarding
        </h1>
        <p className="text-xs text-gray-400 text-center mt-1">
          Fill out the form below to set up your account
        </p>
      </header>

      {/* Step Progress */}
      <StepProgress currentStep={currentStep} steps={STEPS} />

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32">
        {currentStep === 1 && (
          <PersonalDetailsForm data={personal} onChange={handlePersonalChange} />
        )}
        {currentStep === 2 && (
          <KycBankForm data={kyc} onChange={handleKycChange} />
        )}
        {currentStep === 3 && (
          <JobInfoForm data={job} onChange={handleJobChange} />
        )}

        {/* Error message */}
        {error && (
          <p className="text-center text-sm text-red-500 mt-4">{error}</p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 z-30">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button onClick={handleBack} disabled={submitting} className="uds-btn-secondary flex-1">
              Back
            </button>
          )}
          <button onClick={handleNext} disabled={submitting} className="uds-btn-primary flex-1">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : currentStep < 3 ? (
              "Save & Next"
            ) : (
              "Complete Onboarding"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
