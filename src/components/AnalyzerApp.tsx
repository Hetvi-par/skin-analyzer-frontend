"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  analyzeInitial,
  checkApiHealth,
  type InitialAnalysisResult,
} from "@/lib/api";

type ApiStatus = "ok" | "offline" | "checking";

const REGION_LABELS: Record<string, string> = {
  forehead: "Forehead",
  left_cheek: "Left cheek",
  right_cheek: "Right cheek",
  nose: "Nose",
  chin: "Chin",
};

export function AnalyzerApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<InitialAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [apiVersion, setApiVersion] = useState("—");

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const health = await checkApiHealth();
        if (cancelled) return;
        setApiStatus(health.status === "ok" ? "ok" : "offline");
        setApiVersion(health.version);
      } catch {
        if (!cancelled) setApiStatus("offline");
      }
    }

    loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetAnalysis() {
    setResult(null);
    setError(null);
  }

  function onFileChange(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    resetAnalysis();
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) {
      onFileChange(dropped);
    }
  }

  async function runAnalysis() {
    if (!file) return;
    setError(null);
    setIsPending(true);
    setResult(null);

    try {
      const data = await analyzeInitial(file);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-[0.18em] text-teal-800 uppercase">
            Skin Analysis
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Full face skin profile
          </h1>
          <p className="max-w-xl text-base text-zinc-600">
            Upload a clear face photo. We map regions, score color and texture,
            detect acne, and estimate skin depth / undertone from Lab medians.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${
              apiStatus === "ok"
                ? "bg-emerald-500"
                : apiStatus === "checking"
                  ? "bg-zinc-300"
                  : "bg-amber-500"
            }`}
          />
          <span className="text-zinc-700">
            {apiStatus === "ok"
              ? "API connected"
              : apiStatus === "checking"
                ? "Checking API…"
                : "API offline"}
          </span>
          <span className="text-zinc-400">v{apiVersion}</span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center transition hover:border-teal-600 hover:bg-teal-50/40"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Selected upload"
                className="max-h-72 w-auto rounded-2xl object-contain"
              />
            ) : (
              <>
                <span className="text-lg font-medium text-zinc-900">
                  Drop a face photo here
                </span>
                <span className="text-sm text-zinc-500">
                  or click to browse · JPG, PNG, WEBP
                </span>
              </>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={!file || isPending || apiStatus !== "ok"}
              className="rounded-full bg-teal-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isPending ? "Analyzing…" : "Run analysis"}
            </button>
            <button
              type="button"
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={!file && !result}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {apiStatus === "offline" && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Start the backend with{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5">
                uvicorn app.main:app --reload --port 8000
              </code>
            </p>
          )}
        </div>

        <div className="space-y-4">
          {!result && !isPending && (
            <div className="flex min-h-80 items-center justify-center rounded-3xl border border-zinc-200 bg-white px-6 text-center text-zinc-500">
              Results will appear here after analysis.
            </div>
          )}

          {isPending && (
            <div className="flex min-h-80 items-center justify-center rounded-3xl border border-zinc-200 bg-white px-6 text-zinc-600">
              Detecting landmarks, regions, and color metrics…
            </div>
          )}

          {result && !isPending && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
                <Stat
                  label="Landmarks"
                  value={String(result.num_landmarks)}
                />
                <Stat
                  label="Acne"
                  value={
                    result.acne_metrics
                      ? `${result.acne_metrics.overall_severity_score.toFixed(1)}/4`
                      : "—"
                  }
                />
                <Stat
                  label="Depth"
                  value={
                    result.skin_tone
                      ? result.skin_tone.depth.replaceAll("_", " ")
                      : "—"
                  }
                />
                <Stat
                  label="Undertone"
                  value={result.skin_tone?.undertone ?? "—"}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <PreviewCard
                  title="Face landmarks"
                  src={result.landmark_preview}
                />
                <PreviewCard
                  title="Skin mask"
                  src={result.skin_mask_preview}
                />
              </div>

              {result.regions_overlay && (
                <PreviewCard
                  title="Region overlay"
                  src={result.regions_overlay}
                />
              )}

              {result.skin_tone && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="text-sm font-medium text-zinc-500">
                      Skin tone & undertone
                    </h2>
                    <p className="text-xs text-zinc-400">
                      {result.skin_tone.method} · not medical
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div
                      className="h-24 w-full shrink-0 rounded-2xl border border-zinc-200 sm:w-24"
                      style={{ backgroundColor: result.skin_tone.hex_color }}
                      title={result.skin_tone.hex_color}
                    />
                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="text-xs text-zinc-500 uppercase">Depth</p>
                        <p className="mt-1 text-lg font-semibold capitalize text-zinc-900">
                          {result.skin_tone.depth.replaceAll("_", " ")}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="text-xs text-zinc-500 uppercase">
                          Undertone
                        </p>
                        <p className="mt-1 text-lg font-semibold capitalize text-zinc-900">
                          {result.skin_tone.undertone}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="text-xs text-zinc-500 uppercase">
                          Fitzpatrick (est.)
                        </p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900">
                          Type {result.skin_tone.fitzpatrick_estimate}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-zinc-500">
                    {result.skin_tone.hex_color} · ITA{" "}
                    {result.skin_tone.ita_degrees.toFixed(1)}° · L*{" "}
                    {result.skin_tone.median_l} · a* {result.skin_tone.median_a}{" "}
                    · b* {result.skin_tone.median_b} ·{" "}
                    {result.skin_tone.sample_pixel_count.toLocaleString()} skin
                    px
                  </p>
                </div>
              )}

              {result.acne_metrics && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="text-sm font-medium text-zinc-500">
                      Acne detection (0–4)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      YOLOv8 · {result.acne_metrics.model_name} · not medical
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ScoreCard
                      title="Overall acne severity"
                      score={result.acne_metrics.overall_severity_score}
                      level={result.acne_metrics.overall_severity_level}
                    />
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                      <p className="text-sm text-zinc-700">Lesion count</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900">
                        {result.acne_metrics.overall_lesion_count}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Sum across forehead, cheeks, nose, chin
                      </p>
                    </div>
                  </div>

                  {result.acne_metrics.overlay && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.acne_metrics.overlay}
                        alt="Acne detections"
                        className="w-full bg-zinc-50 object-contain"
                      />
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {result.acne_metrics.regions.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                      >
                        <p className="text-sm font-medium text-zinc-800">
                          {REGION_LABELS[item.name] ?? item.name}
                        </p>
                        <p className="text-sm text-zinc-600">
                          {item.lesion_count} lesions ·{" "}
                          {item.severity_score.toFixed(1)} ·{" "}
                          {item.severity_level}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.color_metrics && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="text-sm font-medium text-zinc-500">
                      Color metrics (0–4)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      CIELAB heuristic · not medical
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ScoreCard
                      title="Overall redness"
                      score={result.color_metrics.overall_redness}
                      level={result.color_metrics.overall_redness_level}
                      accent="rose"
                    />
                    <ScoreCard
                      title="Overall pigmentation"
                      score={result.color_metrics.overall_pigmentation}
                      level={result.color_metrics.overall_pigmentation_level}
                      accent="amber"
                    />
                  </div>

                  <div className="mt-5 space-y-3">
                    {result.color_metrics.regions.map((item) => (
                      <div
                        key={item.name}
                        className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                      >
                        <p className="text-sm font-medium text-zinc-800">
                          {REGION_LABELS[item.name] ?? item.name}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <MiniScore
                            label="Redness"
                            score={item.redness_score}
                            level={item.redness_level}
                          />
                          <MiniScore
                            label="Pigmentation"
                            score={item.pigmentation_score}
                            level={item.pigmentation_level}
                          />
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                          L* {item.mean_l} · a* {item.mean_a} · dark{" "}
                          {item.dark_pixel_percent}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.texture_metrics && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="text-sm font-medium text-zinc-500">
                      Texture · pores & wrinkles (0–4)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      {result.texture_metrics.method} · heuristic · not medical
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ScoreCard
                      title="Overall pores"
                      score={result.texture_metrics.overall_pores}
                      level={result.texture_metrics.overall_pores_level}
                    />
                    <ScoreCard
                      title="Overall wrinkles"
                      score={result.texture_metrics.overall_wrinkles}
                      level={result.texture_metrics.overall_wrinkles_level}
                    />
                  </div>

                  <div className="mt-5 space-y-3">
                    {result.texture_metrics.regions.map((item) => (
                      <div
                        key={item.name}
                        className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                      >
                        <p className="text-sm font-medium text-zinc-800">
                          {REGION_LABELS[item.name] ?? item.name}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <MiniScore
                            label="Pores"
                            score={item.pore_score}
                            level={item.pore_level}
                          />
                          <MiniScore
                            label="Wrinkles"
                            score={item.wrinkle_score}
                            level={item.wrinkle_level}
                          />
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                          lap σ² {item.laplacian_variance} · HP{" "}
                          {item.highpass_extreme_percent}% · edges{" "}
                          {item.edge_density_percent}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                <h2 className="text-sm font-medium text-zinc-500">
                  Region crops
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(result.regions ?? []).map((region) => (
                    <div key={region.name} className="space-y-2">
                      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={region.preview}
                          alt={region.name}
                          className="aspect-square w-full object-contain"
                        />
                      </div>
                      <p className="text-sm font-medium text-zinc-800">
                        {REGION_LABELS[region.name] ?? region.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {region.skin_pixel_count.toLocaleString()} skin px ·{" "}
                        {region.skin_coverage_percent}%
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-zinc-500">{result.message}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-4">
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function PreviewCard({ title, src }: { title: string; src: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700">
        {title}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={title} className="w-full bg-zinc-50 object-contain" />
    </div>
  );
}

function levelClass(level: string) {
  if (level === "high" || level === "severe") return "bg-rose-50 text-rose-700";
  if (level === "moderate" || level === "moderately severe")
    return "bg-amber-50 text-amber-700";
  if (level === "mild") return "bg-sky-50 text-sky-700";
  return "bg-emerald-50 text-emerald-700";
}

function barClass(level: string) {
  if (level === "high" || level === "severe") return "bg-rose-500";
  if (level === "moderate" || level === "moderately severe") return "bg-amber-500";
  if (level === "mild") return "bg-sky-500";
  return "bg-emerald-500";
}

function ScoreCard({
  title,
  score,
  level,
}: {
  title: string;
  score: number;
  level: string;
  accent?: string;
}) {
  const width = Math.max(0, Math.min(100, (score / 4) * 100));
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-700">{title}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${levelClass(level)}`}
        >
          {level}
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">
        {score.toFixed(1)}
        <span className="text-sm font-medium text-zinc-400"> /4</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div
          className={`h-full rounded-full ${barClass(level)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MiniScore({
  label,
  score,
  level,
}: {
  label: string;
  score: number;
  level: string;
}) {
  const width = Math.max(0, Math.min(100, (score / 4) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-xs font-semibold text-zinc-800">
          {score.toFixed(1)} · {level}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-200">
        <div
          className={`h-full rounded-full ${barClass(level)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
