"use client";

import { Briefcase } from "lucide-react";
import MasterDataPage from "@/components/organisation/MasterDataPage";

export default function DesignationsPage() {
  return <MasterDataPage type="designation" title="Designations" icon={Briefcase} />;
}
