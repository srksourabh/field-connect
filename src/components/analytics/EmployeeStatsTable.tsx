"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface EmployeeStat {
  id: string;
  name: string;
  designation: string | null;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  avgHours: number;
}

interface EmployeeStatsTableProps {
  stats: EmployeeStat[];
}

type SortKey = "name" | "presentDays" | "lateDays" | "avgHours";

export default function EmployeeStatsTable({ stats }: EmployeeStatsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...stats].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
    return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <h3 className="text-sm font-semibold p-4 pb-2 text-gray-700 dark:text-gray-200">
        Employee Performance
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/50 text-xs text-gray-500">
              <th className="text-left px-4 py-2 font-medium cursor-pointer" onClick={() => toggleSort("name")}>
                Name <SortIcon col="name" />
              </th>
              <th className="text-center px-3 py-2 font-medium cursor-pointer" onClick={() => toggleSort("presentDays")}>
                Present <SortIcon col="presentDays" />
              </th>
              <th className="text-center px-3 py-2 font-medium">Absent</th>
              <th className="text-center px-3 py-2 font-medium cursor-pointer" onClick={() => toggleSort("lateDays")}>
                Late <SortIcon col="lateDays" />
              </th>
              <th className="text-center px-3 py-2 font-medium cursor-pointer" onClick={() => toggleSort("avgHours")}>
                Avg Hrs <SortIcon col="avgHours" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((emp) => (
              <tr key={emp.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{emp.name}</p>
                  <p className="text-xs text-gray-500">{emp.designation || "--"}</p>
                </td>
                <td className="text-center px-3 py-3">
                  <span className="text-green-600 font-medium">{emp.presentDays}</span>
                </td>
                <td className="text-center px-3 py-3">
                  <span className="text-red-500 font-medium">{emp.absentDays}</span>
                </td>
                <td className="text-center px-3 py-3">
                  <span className={emp.lateDays > 3 ? "text-amber-600 font-medium" : ""}>{emp.lateDays}</span>
                </td>
                <td className="text-center px-3 py-3">
                  <span className={emp.avgHours < 6 ? "text-red-500" : emp.avgHours >= 8 ? "text-green-600" : ""}>
                    {emp.avgHours}h
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
