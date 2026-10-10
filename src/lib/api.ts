const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function checkApiHealth(): Promise<{
  status: string;
  service: string;
  version: string;
}> {
  const response = await fetch(`${API_URL}/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API health check failed: ${response.status}`);
  }

  return response.json();
}

export type RegionResult = {
  name: string;
  bbox: { x: number; y: number; width: number; height: number };
  skin_pixel_count: number;
  skin_coverage_percent: number;
  preview: string;
  mask_preview: string;
};

export type RegionColorMetrics = {
  name: string;
  mean_l: number;
  mean_a: number;
  mean_b: number;
  dark_pixel_percent: number;
  redness_score: number;
  pigmentation_score: number;
  redness_level: string;
  pigmentation_level: string;
};

export type ColorMetrics = {
  overall_redness: number;
  overall_pigmentation: number;
  overall_redness_level: string;
  overall_pigmentation_level: string;
  baseline_forehead_a?: number | null;
  baseline_forehead_l?: number | null;
  mean_skin_l?: number | null;
  mean_skin_a?: number | null;
  mean_skin_b?: number | null;
  regions: RegionColorMetrics[];
};

export type RegionAcneMetrics = {
  name: string;
  lesion_count: number;
  severity_score: number;
  severity_level: string;
};

export type AcneMetrics = {
  overall_lesion_count: number;
  overall_severity_score: number;
  overall_severity_level: string;
  model_name: string;
  regions: RegionAcneMetrics[];
  overlay?: string | null;
};

export type RegionTextureMetrics = {
  name: string;
  laplacian_variance: number;
  highpass_extreme_percent: number;
  edge_density_percent: number;
  pore_score: number;
  wrinkle_score: number;
  pore_level: string;
  wrinkle_level: string;
};

export type TextureMetrics = {
  overall_pores: number;
  overall_wrinkles: number;
  overall_pores_level: string;
  overall_wrinkles_level: string;
  method: string;
  regions: RegionTextureMetrics[];
};

export type SkinTone = {
  median_l: number;
  median_a: number;
  median_b: number;
  median_r: number;
  median_g: number;
  median_b_rgb: number;
  ita_degrees: number;
  depth: string;
  undertone: string;
  fitzpatrick_estimate: string;
  hex_color: string;
  sample_pixel_count: number;
  method: string;
};

export type InitialAnalysisResult = {
  status: string;
  stage: string;
  message: string;
  image_width: number;
  image_height: number;
  num_landmarks: number;
  face_bbox: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
    width: number;
    height: number;
  };
  skin_coverage_percent: number;
  class_coverage: Record<string, number>;
  regions: RegionResult[];
  color_metrics?: ColorMetrics | null;
  acne_metrics?: AcneMetrics | null;
  texture_metrics?: TextureMetrics | null;
  skin_tone?: SkinTone | null;
  landmark_preview: string;
  skin_mask_preview: string;
  regions_overlay?: string | null;
};

export async function analyzeInitial(
  file: File,
  includeLandmarks = false,
): Promise<InitialAnalysisResult> {
  const form = new FormData();
  form.append("file", file);

  const url = new URL(`${API_URL}/analyze/initial`);
  if (includeLandmarks) {
    url.searchParams.set("include_landmarks", "true");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(
      detail?.detail ?? `Analysis failed with status ${response.status}`,
    );
  }

  return response.json();
}

export { API_URL };
