"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Plus, Pencil, X, Save, Loader2, Check, Power, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/Dialog";

interface MasterDataItem {
  id: string;
  type: string;
  name: string;
  external_url?: string | null;
  is_active: boolean;
  employee_count: number;
}

interface MasterDataPageProps {
  type: "project" | "department" | "designation";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  showExternalUrl?: boolean;
}

export default function MasterDataPage({ type, title, icon: Icon, showExternalUrl = false }: MasterDataPageProps) {
  const { session, profile } = useAuth();
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [addingName, setAddingName] = useState("");
  const [addingUrl, setAddingUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
  }), [session]);

  const fetchItems = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    const url = `/api/admin/master-data?type=${type}${showInactive ? "&all=true" : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
    setLoading(false);
  }, [session, type, showInactive]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Role guard: only admin/super_admin can access organisation pages
  const hasAccess = profile?.role === "admin" || profile?.role === "super_admin";
  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-gray-500">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!addingName.trim()) return;
    setActionLoading("add");
    const payload: Record<string, string> = { type, name: addingName.trim() };
    if (showExternalUrl && addingUrl.trim()) payload.external_url = addingUrl.trim();
    const res = await fetch("/api/admin/master-data", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setAddingName("");
      setAddingUrl("");
      setShowAddForm(false);
      await fetchItems();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to add", "error");
    }
    setActionLoading(null);
  };

  const handleSave = async (id: string) => {
    if (!editName.trim()) return;
    setActionLoading(id);
    const payload: Record<string, unknown> = { id, name: editName.trim() };
    if (showExternalUrl) payload.external_url = editUrl.trim() || null;
    const res = await fetch("/api/admin/master-data", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditingId(null);
      await fetchItems();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to update", "error");
    }
    setActionLoading(null);
  };

  const handleToggleActive = async (item: MasterDataItem) => {
    const action = item.is_active ? "deactivate" : "reactivate";
    const confirmed = await showConfirm(
      `${item.is_active ? "Deactivate" : "Reactivate"} ${title.slice(0, -1)}`,
      `${action === "deactivate" ? "Deactivate" : "Reactivate"} "${item.name}"? ${item.employee_count > 0 ? `${item.employee_count} employees are currently assigned.` : ""}`
    );
    if (!confirmed) return;

    setActionLoading(item.id);
    const res = await fetch("/api/admin/master-data", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    });
    if (res.ok) {
      await fetchItems();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to update", "error");
    }
    setActionLoading(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/organisation"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">{title}</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5 text-primary" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-3">
        {/* Toggle inactive */}
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Show inactive items
        </label>

        {/* Add form */}
        {showAddForm && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={addingName}
                onChange={(e) => setAddingName(e.target.value)}
                placeholder={`New ${title.slice(0, -1).toLowerCase()} name`}
                className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => e.key === "Enter" && !showExternalUrl && handleAdd()}
                autoFocus
              />
              <button
                onClick={handleAdd}
                disabled={actionLoading === "add" || !addingName.trim()}
                className="px-4 py-3 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {actionLoading === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddingName(""); setAddingUrl(""); }}
                className="px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {showExternalUrl && (
              <input
                type="url"
                value={addingUrl}
                onChange={(e) => setAddingUrl(e.target.value)}
                placeholder="App URL (optional)"
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Icon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {title.toLowerCase()} found</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 ${!item.is_active ? "opacity-60" : ""}`}
            >
              {editingId === item.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && !showExternalUrl && handleSave(item.id)}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave(item.id)}
                      disabled={actionLoading === item.id}
                      className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                    >
                      {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {showExternalUrl && (
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="App URL (optional)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleSave(item.id)}
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{item.name}</p>
                      {showExternalUrl && item.external_url && (
                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.employee_count} employee{item.employee_count !== 1 ? "s" : ""}
                      {!item.is_active && <span className="ml-2 text-red-500">(Inactive)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingId(item.id); setEditName(item.name); setEditUrl(item.external_url || ""); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(item)}
                      disabled={actionLoading === item.id}
                      className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 ${item.is_active ? "text-gray-400 hover:text-red-500" : "text-green-500 hover:text-green-600"}`}
                    >
                      {actionLoading === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
