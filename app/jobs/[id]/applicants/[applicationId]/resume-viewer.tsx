"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "error";

/** Render one PDF page onto a canvas, sized to `cssWidth` (crisp via DPR). */
async function renderPage(
  pdf: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  cssWidth: number,
) {
  const page = await pdf.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio, 2);
  const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  await page.render({ canvas, canvasContext: context, viewport }).promise;
}

/**
 * Renders the resume with PDF.js (bytes -> canvas) instead of an iframe, so the
 * browser's native PDF viewer (and its "download PDFs" behavior) is never
 * involved. The inline first-page thumbnail expands into a full-screen modal.
 */
export function ResumeViewer({
  src,
  isPdf,
  name,
}: {
  src: string | null;
  isPdf: boolean;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [pages, setPages] = useState(0);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load the PDF (same-origin fetch) and draw the first-page thumbnail.
  useEffect(() => {
    if (!src || !isPdf) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        setStatus("loading");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const res = await fetch(src, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setPages(pdf.numPages);
        if (thumbRef.current) {
          const w = thumbRef.current.parentElement?.clientWidth || 360;
          await renderPage(pdf, 1, thumbRef.current, w);
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src, isPdf]);

  // When the modal opens: render every page, lock scroll, wire Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    let cancelled = false;
    (async () => {
      const pdf = pdfRef.current;
      const container = modalRef.current;
      if (!pdf || !container) return;
      container.innerHTML = "";
      const w = Math.min(container.clientWidth - 32 || 800, 850);
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) break;
        const canvas = document.createElement("canvas");
        canvas.className = "mx-auto mb-3 block max-w-full rounded shadow-sm";
        container.appendChild(canvas);
        await renderPage(pdf, i, canvas, w);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!src) {
    return <p className="text-muted mt-4 text-sm">No resume on file.</p>;
  }

  if (!isPdf) {
    return (
      <div className="mt-4">
        <p className="text-muted text-sm">This resume is not a PDF.</p>
        <a href={src} download className="btn-primary mt-3 inline-block">
          Download resume
        </a>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted">
          {pages > 0
            ? `${pages} page${pages > 1 ? "s" : ""}`
            : status === "loading"
              ? "Loading..."
              : ""}
        </span>
        <a
          href={src}
          download
          className="text-primary font-semibold hover:underline"
        >
          Download
        </a>
      </div>

      <button
        type="button"
        onClick={() => status === "ready" && setOpen(true)}
        className="group border-border relative block w-full overflow-hidden rounded-xl border-2 bg-white"
        aria-label="Expand resume to full screen"
      >
        {status === "error" ? (
          <div className="text-muted p-8 text-center text-sm">
            Could not render a preview.{" "}
            <a href={src} download className="text-primary underline">
              Download the resume
            </a>{" "}
            instead.
          </div>
        ) : (
          <div className="max-h-[460px] overflow-hidden">
            <canvas ref={thumbRef} className="w-full" />
          </div>
        )}
        {status === "loading" && (
          <div className="text-muted absolute inset-0 flex items-center justify-center text-sm">
            Loading preview...
          </div>
        )}
        {status === "ready" && (
          <span className="bg-foreground/0 group-hover:bg-foreground/10 absolute inset-0 flex items-center justify-center transition-colors">
            <span className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-bold opacity-0 shadow group-hover:opacity-100">
              Click to expand
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center bg-black/70"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Resume - ${name}`}
        >
          <div
            className="flex w-full max-w-4xl flex-1 flex-col overflow-hidden py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-2 text-white">
              <h3 className="font-semibold">{name} - resume</h3>
              <div className="flex items-center gap-4 text-sm">
                <a href={src} download className="font-semibold hover:underline">
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-semibold hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
            <div
              ref={modalRef}
              className="bg-background flex-1 overflow-auto rounded-xl p-4"
            />
          </div>
        </div>
      )}
    </div>
  );
}
