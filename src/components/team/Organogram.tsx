"use client";

import OrgNode, { type OrgNodeData } from "./OrgNode";

interface OrganogramProps {
  roots: OrgNodeData[];
  onSelectEmployee?: (id: string) => void;
}

export default function Organogram({ roots, onSelectEmployee }: OrganogramProps) {
  return (
    <div className="overflow-x-auto no-scrollbar py-8 px-4">
      <div className="min-w-max flex flex-col items-center gap-4">
        {roots.map((root, i) => (
          <OrgNode key={root.id} node={root} isRoot={i === 0} onSelect={onSelectEmployee} />
        ))}
      </div>
    </div>
  );
}
