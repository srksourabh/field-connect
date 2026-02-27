"use client";

import { Building2 } from "lucide-react";
import MasterDataPage from "@/components/organisation/MasterDataPage";

export default function DepartmentsPage() {
  return <MasterDataPage type="department" title="Departments" icon={Building2} />;
}
