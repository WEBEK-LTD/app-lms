"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cancelMediaUploadAction, completeMediaUploadAction, resumeMediaUploadAction, startMediaUploadAction } from "@/app/actions/media";
import { Icon } from "@/components/icon";
import { btn, ProgressBar } from "@/components/ui";

/**
 * 51 The Media library's uploader. Each file goes to the media gate in 5 MB
 * chunks (PUT with Upload-Offset), straight from the browser; the platform
 * only signs the way and checks the result. An upload survives a broken
 * connection (it retries), a reload or closing the tab: picking the same file
 * again carries on from the last chunk the server has.
 */

type Status = "waiting" | "uploading" | "paused" | "checking" | "done" | "failed";

interface Job {
  key: string;
  file: File;
  id: string | null;
  url: string | null;
  chunkBytes: number;
  offset: number;
  status: Status;
  message: string | null;
  storageFull: boolean;
}

const RETRIES = 5;

function savedKey(appId: string, file: File): string {
  return `yallapp-media:${appId}:${file.name}:${file.size}:${file.lastModified}`;
}

function readSaved(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSaved(key: string, id: string | null): void {
  try {
    if (id) window.localStorage.setItem(key, id);
    else window.localStorage.removeItem(key);
  } catch {
    // Private windows: an upload can't be resumed after a reload there, that's all.
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sends one chunk; resolves with the server's offset after it (or the offset it expects, on 409). */
function sendChunk(url: string, offset: number, chunk: Blob, onProgress: (sent: number) => void, xhrRef: { current: XMLHttpRequest | null }): Promise<{ status: number; offset: number | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", url);
    xhr.setRequestHeader("Upload-Offset", String(offset));
    xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      const header = xhr.getResponseHeader("Upload-Offset");
      resolve({ status: xhr.status, offset: header && /^\d+$/.test(header) ? Number(header) : null });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new Error("aborted"));
    xhr.send(chunk);
  });
}

async function serverOffset(url: string): Promise<{ status: number; offset: number | null }> {
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  const header = response.headers.get("Upload-Offset");
  return { status: response.status, offset: header && /^\d+$/.test(header) ? Number(header) : null };
}

const noSubscribe = () => () => {};

export function MediaUploader({ appId, accept, disabled }: { appId: string; accept: string; disabled: string | null }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  // Until the page has loaded its scripts, a chosen file would go nowhere: the input waits for them.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const input = useRef<HTMLInputElement>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const running = useRef(false);
  const paused = useRef(new Set<string>());
  const jobsRef = useRef<Job[]>([]);
  const started = useRef(new Set<string>());
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const update = useCallback((key: string, patch: Partial<Job>) => {
    setJobs((list) => list.map((j) => (j.key === key ? { ...j, ...patch } : j)));
  }, []);

  const freshLink = useCallback(async (job: Job): Promise<Job | null> => {
    const saved = readSaved(job.key);
    if (saved) {
      const resumed = await resumeMediaUploadAction({ appId, id: saved, size: job.file.size });
      if (resumed.ok) return { ...job, id: resumed.id, url: resumed.uploadUrl, chunkBytes: resumed.chunkBytes };
      writeSaved(job.key, null);
    }
    if (job.id) {
      const resumed = await resumeMediaUploadAction({ appId, id: job.id, size: job.file.size });
      if (resumed.ok) return { ...job, url: resumed.uploadUrl, chunkBytes: resumed.chunkBytes };
    }
    const started = await startMediaUploadAction({ appId, name: job.file.name, size: job.file.size, type: job.file.type });
    if (!started.ok) {
      update(job.key, { status: "failed", message: started.message, storageFull: started.storageFull === true });
      return null;
    }
    writeSaved(job.key, started.id);
    return { ...job, id: started.id, url: started.uploadUrl, chunkBytes: started.chunkBytes };
  }, [appId, update]);

  const upload = useCallback(async (initial: Job) => {
    let job = await freshLink(initial);
    if (!job?.url || !job.id) return;
    update(job.key, { id: job.id, url: job.url, status: "uploading", message: null });
    let failures = 0;
    let offset = (await serverOffset(job.url).catch(() => ({ status: 0, offset: null }))).offset ?? 0;
    update(job.key, { offset });
    while (offset < job.file.size) {
      if (paused.current.has(job.key)) {
        update(job.key, { status: "paused", offset });
        return;
      }
      const chunk = job.file.slice(offset, Math.min(job.file.size, offset + job.chunkBytes));
      const at = offset;
      try {
        const result = await sendChunk(job.url!, at, chunk, (sent) => update(job!.key, { offset: at + sent }), xhr);
        if ((result.status === 204 || result.status === 409) && result.offset !== null) {
          offset = result.offset;
          failures = 0;
        } else if (result.status === 403 || result.status === 410) {
          // The link expired (a long pause): a fresh one, then carry on.
          const fresh = await freshLink(job);
          if (!fresh?.url) return;
          job = fresh;
        } else {
          throw new Error(`status ${result.status}`);
        }
      } catch (e) {
        if (e instanceof Error && e.message === "aborted") {
          update(job.key, { status: paused.current.has(job.key) ? "paused" : "failed", offset: at });
          return;
        }
        failures++;
        if (failures > RETRIES) {
          update(job.key, { status: "failed", offset: at, message: "The connection keeps dropping. Resume when you're back online; nothing uploaded so far is lost." });
          return;
        }
        update(job.key, { message: "Connection lost, trying again…", offset: at });
        await wait(1000 * 2 ** (failures - 1));
        offset = (await serverOffset(job.url!).catch(() => ({ status: 0, offset: null }))).offset ?? at;
      }
      update(job.key, { offset, message: null });
    }
    update(job.key, { status: "checking", offset: job.file.size });
    const done = await completeMediaUploadAction({ appId, id: job.id! });
    if (!done.ok) {
      update(job.key, { status: "failed", message: done.message });
      return;
    }
    writeSaved(job.key, null);
    update(job.key, { status: "done", message: null });
    router.refresh();
  }, [appId, freshLink, router, update]);

  // One upload at a time, in the order the files were added.
  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const next = jobsRef.current.find((j) => j.status === "waiting" && !started.current.has(j.key));
        if (!next) break;
        started.current.add(next.key);
        update(next.key, { status: "uploading" });
        try {
          await upload(next);
        } catch {
          update(next.key, { status: "failed", message: "The upload stopped. Resume to carry on." });
        } finally {
          started.current.delete(next.key);
        }
      }
    } finally {
      running.current = false;
    }
  }, [update, upload]);

  useEffect(() => {
    if (jobs.some((j) => j.status === "waiting")) void pump();
  }, [jobs, pump]);

  const add = (files: FileList | null) => {
    if (!files?.length) return;
    const added: Job[] = [...files].map((file) => ({
      key: savedKey(appId, file),
      file,
      id: null,
      url: null,
      chunkBytes: 5 * 1024 * 1024,
      offset: 0,
      status: "waiting",
      message: null,
      storageFull: false,
    }));
    setJobs((list) => {
      // A file already on its way stays as it is; one that failed or was paused starts again (and resumes on the server).
      const busy = (j: Job) => j.status === "uploading" || j.status === "waiting" || j.status === "checking";
      const fresh = added.filter((a) => !list.some((j) => j.key === a.key && busy(j)));
      return [...list.filter((j) => !fresh.some((a) => a.key === j.key)), ...fresh];
    });
    if (input.current) input.current.value = "";
  };

  const pause = (job: Job) => {
    paused.current.add(job.key);
    xhr.current?.abort();
  };
  const resume = (job: Job) => {
    paused.current.delete(job.key);
    update(job.key, { status: "waiting", message: null });
  };
  const cancel = async (job: Job) => {
    paused.current.add(job.key);
    if (job.status === "uploading") xhr.current?.abort();
    if (job.id) await cancelMediaUploadAction({ appId, id: job.id });
    writeSaved(job.key, null);
    setJobs((list) => list.filter((j) => j.key !== job.key));
    paused.current.delete(job.key);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) add(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border border-dashed px-5 py-7 text-center ${dragging ? "border-midnight bg-peach" : "border-line-strong bg-sand"}`}
      >
        <Icon name="upload" size={28} className="text-muted" />
        <p className="m-0 text-[15px] font-semibold">Drop videos, pictures or PDFs here</p>
        <label className={`${btn.primary} h-10 cursor-pointer ${disabled ? "pointer-events-none opacity-60" : ""}`}>
          Choose files
          <input ref={input} type="file" multiple accept={accept} disabled={disabled !== null || !hydrated} className="sr-only" onChange={(e) => add(e.target.files)} />
        </label>
        <span className="text-[13px] text-muted">{disabled ?? "Big videos upload in parts: if the connection drops, choose the same file again to carry on."}</span>
      </div>
      {jobs.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Uploads">
          {jobs.map((job) => {
            const percent = job.file.size ? Math.floor((job.offset / job.file.size) * 100) : 0;
            return (
              <li key={job.key} className="flex flex-col gap-1.5 rounded-xl border border-line px-3.5 py-3" data-upload={job.file.name}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{job.file.name}</span>
                  <span className="text-[13px] text-muted" aria-live="polite">
                    {job.status === "done"
                      ? "Uploaded"
                      : job.status === "checking"
                        ? "Checking…"
                        : job.status === "paused"
                          ? `Paused at ${percent}%`
                          : job.status === "failed"
                            ? "Not uploaded"
                            : job.status === "waiting"
                              ? "Waiting"
                              : `${percent}%`}
                  </span>
                  {job.status === "uploading" ? (
                    <button type="button" onClick={() => pause(job)} className={`${btn.ghost} h-8 px-2 text-sm`}>
                      <Icon name="pause_circle" size={18} />
                      Pause
                    </button>
                  ) : null}
                  {job.status === "paused" || (job.status === "failed" && !job.storageFull && job.id) ? (
                    <button type="button" onClick={() => resume(job)} className={`${btn.ghost} h-8 px-2 text-sm`}>
                      <Icon name="play_circle" size={18} />
                      Resume
                    </button>
                  ) : null}
                  {job.status !== "done" && job.status !== "checking" ? (
                    <button type="button" onClick={() => void cancel(job)} className={`${btn.ghost} h-8 px-2 text-sm`} aria-label={`Cancel ${job.file.name}`}>
                      <Icon name="close" size={18} />
                      Cancel
                    </button>
                  ) : null}
                </div>
                {job.status !== "failed" || job.offset > 0 ? <ProgressBar value={job.offset} max={job.file.size || 1} label={`Uploading ${job.file.name}`} tone={job.status === "done" ? "success" : "accent"} /> : null}
                {job.message ? (
                  <p role={job.status === "failed" ? "alert" : undefined} className={`m-0 text-[13px] ${job.status === "failed" ? "text-danger" : "text-muted"}`}>
                    {job.message}
                    {job.storageFull ? (
                      <>
                        {" "}
                        <a href="#buy-storage">Buy more storage</a>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
