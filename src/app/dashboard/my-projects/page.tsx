"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, FolderKanban, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface Project {
  id: string;
  name: string;
  external_url: string | null;
}

export default function MyProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const isUniversal =
    profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  const fetchProjects = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    let query = supabase
      .from("hr_master_data")
      .select("id, name, external_url")
      .eq("type", "project")
      .eq("is_active", true)
      .order("name");

    if (!isUniversal && profile.project_id) {
      query = query.eq("name", profile.project_id);
    }

    const { data } = await query;
    setProjects((data as Project[]) || []);
    setLoading(false);
  }, [profile, isUniversal]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/profile"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">My Projects</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No projects available</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{project.name}</p>
                </div>
                {project.external_url && (
                  <button
                    onClick={() => window.open(project.external_url!, "_blank", "noopener,noreferrer")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open App
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
