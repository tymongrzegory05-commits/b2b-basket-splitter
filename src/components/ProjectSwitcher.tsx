"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Copy, FolderPlus, Trash2 } from "lucide-react";
import type { ProjectStatus, ProjectSummary } from "@/core/projects/types";
import { formatDatePl, formatGrosze } from "@/utils/format";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  szkic: "Szkic",
  "w trakcie": "W trakcie",
  "do weryfikacji": "Do weryfikacji",
  gotowy: "Gotowy",
};

export function ProjectSwitcher({
  activeName,
  summaries,
  activeId,
  onSelect,
  onCreate,
  onDuplicate,
  onDelete,
  onRename,
}: {
  activeName: string;
  summaries: ProjectSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => string | null;
  onRename: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(activeName);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(activeName);
  }, [activeName, activeId]);

  function commitRename(raw: string) {
    const cleaned = raw.trim() || "Bez nazwy";
    setDraftName(cleaned);
    if (cleaned !== activeName) {
      onRename(cleaned);
    }
  }

  function handleCreateSubmit() {
    onCreate(newName.trim() || "Nowy projekt");
    setNewName("");
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex max-w-xs items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left hover:bg-white/5"
      >
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-zinc-100">
            {activeName}
          </span>
          <span className="block text-[10px] text-zinc-500">Projekt</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Zamknij listę projektów"
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              commitRename(draftName);
              setOpen(false);
            }}
          />
          <div className="relative z-10 flex max-h-[80vh] w-full max-w-xl flex-col rounded-2xl border border-white/10 bg-[#14181f] p-5">
            <p className="text-sm font-medium text-zinc-100">Projekty</p>
            <p className="mt-1 text-xs text-zinc-500">
              Stan zapisuje się automatycznie w przeglądarce.
            </p>

            <label className="mt-4 block space-y-1.5">
              <span className="text-xs text-zinc-500">Nazwa aktywnego projektu</span>
              <input
                value={draftName}
                onChange={(event) => {
                  const val = event.target.value;
                  setDraftName(val);
                  if (val.trim().length > 0) {
                    onRename(val);
                  }
                }}
                onBlur={() => commitRename(draftName)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="w-full rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-400/50"
              />
            </label>

            <div className="mt-4 flex gap-2">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateSubmit();
                  }
                }}
                placeholder="Kotłownia – ul. Piotrkowska"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0c0e12] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-400/50"
              />
              <button
                type="button"
                onClick={handleCreateSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Nowy
              </button>
            </div>

            <ul className="mt-4 space-y-2 overflow-y-auto pr-1">
              {summaries.map((item) => (
                <li
                  key={item.id}
                  className={
                    item.id === activeId
                      ? "rounded-xl border border-sky-400/30 bg-sky-400/8 px-3 py-3"
                      : "rounded-xl border border-white/8 bg-black/20 px-3 py-3"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        commitRename(draftName);
                        onSelect(item.id);
                        setError(null);
                        setOpen(false);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm text-zinc-100">{item.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDatePl(item.updatedAt)} · {item.lineCount} poz. ·{" "}
                        {formatGrosze(item.estimatedValueGrosze)}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-white/8 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                        {STATUS_LABEL[item.status]}
                      </span>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        title="Zduplikuj projekt"
                        onClick={() => {
                          commitRename(draftName);
                          onDuplicate(item.id);
                          setError(null);
                        }}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Usuń projekt"
                        onClick={() => {
                          const message = onDelete(item.id);
                          setError(message);
                        }}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}