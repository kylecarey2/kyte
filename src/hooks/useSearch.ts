import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { File } from "../models/File";
import { useToast } from "../components/toast/ToastProvider";

interface SearchResult {
  id: string;
  title: string;
  path: string;
  modified: number;
}

export function useSearch(debounceMs = 200) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();

  // Refs to prevent race conditions
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const abortController = useRef<AbortController | null>(null);
  const latestQuery = useRef("");

  // Keep latest query ref in sync
  useEffect(() => {
    latestQuery.current = query;
  }, [query]);

  const search = useCallback(async (q: string) => {
    // Cancel any in-flight search
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("Searching for:", q);
      const res = await invoke<SearchResult[]>("search_notes", {
        query: q,
        limit: 20,
      });

      // If query changed while we were fetching, drop this result
      if (controller.signal.aborted || q !== latestQuery.current) {
        return;
      }

      // Deduplicate by id (safety net)
      const seen = new Set<string>();
      const unique = res.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      setResults(unique.map((r) => ({ name: r.title, path: r.path })));
    } catch (err) {
      if (!controller.signal.aborted && q === latestQuery.current) {
        console.error("Search failed:", err);
        setResults([]);
        addToast("Search failed", {
          type: "error",
          closable: true,
        });
      }
    } finally {
      if (!controller.signal.aborted && q === latestQuery.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), debounceMs);

    return () => {
      clearTimeout(timer.current);
      abortController.current?.abort();
    };
  }, [query, search, debounceMs]);

  // Utility: force refresh current query
  const refresh = useCallback(() => {
    if (query.trim()) {
      search(query);
    }
  }, [query, search]);

  return { query, setQuery, results, loading, refresh };
}

// Rebuild search index (will use later)
export function useSearchRebuild() {
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenComplete: (() => void) | undefined;

    listen<[number, number]>("search:rebuild-progress", (event) => {
      const [done, total] = event.payload;
      setProgress({ done, total });
      setIsRebuilding(true);
    }).then((u) => (unlistenProgress = u));

    listen<void>("search:rebuild-complete", () => {
      setIsRebuilding(false);
      setProgress(null);
    }).then((u) => (unlistenComplete = u));

    return () => {
      unlistenProgress?.();
      unlistenComplete?.();
    };
  }, []);

  const rebuild = useCallback(async () => {
    setIsRebuilding(true);
    try {
      await invoke("rebuild_search_index");
      addToast("Successfully rebuilt note index", {
        type: "success",
        duration: 3000,
        closable: true,
      });
    } catch (err) {
      console.error("Rebuild failed:", err);
      addToast("Failed to rebuild search index", {
        type: "error",
        closable: true,
      });
    } finally {
      setIsRebuilding(false);
    }
  }, []);

  return { isRebuilding, progress, rebuild };
}
