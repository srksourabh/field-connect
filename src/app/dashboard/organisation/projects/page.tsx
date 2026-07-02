"use client";

import { FolderKanban } from "lucide-react";
import MasterDataPage from "@/components/organisation/MasterDataPage";

export default function ProjectsPage() {
  return <MasterDataPage type="project" title="Companies" icon={FolderKanban} showExternalUrl />;
}
