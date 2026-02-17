"use client";

import OrgNode, { type OrgNodeData } from "./OrgNode";

interface OrganogramProps {
  data: OrgNodeData;
  onSelectEmployee?: (id: string) => void;
}

export default function Organogram({ data, onSelectEmployee }: OrganogramProps) {
  return (
    <div className="overflow-x-auto no-scrollbar py-8 px-4">
      <div className="min-w-max flex justify-center">
        <OrgNode node={data} isRoot onSelect={onSelectEmployee} />
      </div>
    </div>
  );
}
