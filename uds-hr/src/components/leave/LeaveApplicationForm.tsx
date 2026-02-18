"use client";

import { useState, useRef } from "react";
import { ChevronDown, Upload, Send, X, FileText, Calendar } from "lucide-react";
import LeaveDurationBanner from "./LeaveDurationBanner";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/ui/Toast";

interface LeaveApplicationFormProps {
  onSubmit: (data: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl: string | null;
  }) => void;
  submitting?: boolean;
  privilegeEnabled?: boolean;
}

export default function LeaveApplicationForm({ onSubmit, submitting, privilegeEnabled }: LeaveApplicationFormProps) {
  const [type, setType] = useState("casual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split("T")[0];

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    // Reset end date if it's now before the new start date
    if (endDate && val && endDate < val) {
      setEndDate("");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large. Maximum size is 5MB.", "error");
      return;
    }

    setUploading(true);
    setUploadedFile(file);

    const ext = file.name.split(".").pop() ?? "bin";
    const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("leave-attachments")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error.message);
      showToast("Failed to upload file. Please try again.", "error");
      setUploadedFile(null);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("leave-attachments")
      .getPublicUrl(filePath);

    setAttachmentUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setAttachmentUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      showToast("Please select both start and end dates.", "error");
      return;
    }
    if (endDate < startDate) {
      showToast("End date cannot be before start date.", "error");
      return;
    }
    onSubmit({ type, startDate, endDate, reason, attachmentUrl });
  };

  return (
    <section className="px-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">
        New Application
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Leave Type
          </label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-4 pr-10 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              {privilegeEnabled && <option value="privilege">Privilege Leave</option>}
              <option value="compoff">Comp-Off</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm dark:[color-scheme:dark]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm dark:[color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Duration Banner */}
        <LeaveDurationBanner startDate={startDate} endDate={endDate} />

        {/* Reason */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason
            </label>
            <span className="text-xs text-gray-400">{reason.length}/200</span>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 200))}
            rows={4}
            placeholder="Briefly describe the reason for leave..."
            className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none text-sm"
          />
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Attachments
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploadedFile ? (
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#253646] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                {uploadedFile.name}
              </span>
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-[#253646] transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Upload Document
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Medical Certificate, etc. (Max 5MB)
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2 pb-4">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>{submitting ? "Submitting..." : "Submit Request"}</span>
            {!submitting && <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </section>
  );
}
