/**
 * Licensed-image adapter (one permitted source: Openverse — an index of
 * openly-licensed images that returns licence, creator and attribution).
 *
 * It RECORDS source, licence and attribution and REJECTS anything whose reuse
 * rights are unclear or not on the conservative allowlist. A publicly accessible
 * image is never assumed reusable. Uses an injected HttpFetcher, so it is tested
 * offline and deterministically.
 */
import type { HttpFetcher } from "../live/http";
import { HttpError } from "../live/http";

/**
 * Conservative allowlist for an educational platform: public domain and
 * attribution/share-alike only. NonCommercial and NoDerivatives are excluded
 * because reuse in this context is not clearly permitted.
 */
export const REUSABLE_LICENCES = new Set(["cc0", "pdm", "by", "by-sa"]);

export interface LicensedImage {
  title: string;
  imageUrl: string;
  landingUrl: string;
  creator: string;
  creatorUrl?: string;
  licence: string;
  licenceVersion?: string;
  licenceUrl?: string;
  attribution: string;
  provider: string;
}

export interface ImageValidation {
  ok: boolean;
  reason: string;
  image?: LicensedImage;
}

interface OpenverseResult {
  title?: string;
  url?: string; // the image file
  foreign_landing_url?: string;
  creator?: string;
  creator_url?: string;
  license?: string;
  license_version?: string;
  license_url?: string;
  attribution?: string;
  provider?: string;
}

export function validateLicensedImage(raw: OpenverseResult): ImageValidation {
  const licence = (raw.license ?? "").toLowerCase();
  if (!licence) return { ok: false, reason: "no licence information — reuse rights unclear" };
  if (!REUSABLE_LICENCES.has(licence)) {
    return { ok: false, reason: `licence "${licence}" is not on the reusable allowlist` };
  }
  if (!raw.url || !/^https:\/\//.test(raw.url)) return { ok: false, reason: "no https image URL" };
  if (!raw.creator || raw.creator.trim().length < 1) return { ok: false, reason: "no creator attribution" };

  return {
    ok: true,
    reason: "licence is reusable and attribution is present",
    image: {
      title: raw.title ?? "(untitled)",
      imageUrl: raw.url,
      landingUrl: raw.foreign_landing_url ?? raw.url,
      creator: raw.creator,
      creatorUrl: raw.creator_url,
      licence,
      licenceVersion: raw.license_version,
      licenceUrl: raw.license_url,
      attribution: raw.attribution ?? `${raw.title ?? "Image"} by ${raw.creator} is licensed under ${licence.toUpperCase()}`,
      provider: raw.provider ?? "openverse",
    },
  };
}

export interface ImageSearchResult {
  status: "ok" | "http_error" | "timeout" | "network_error";
  accepted: LicensedImage[];
  rejected: { title: string; reason: string }[];
  error?: string;
}

const OPENVERSE = "https://api.openverse.org/v1/images/";

export async function searchLicensedImages(
  fetcher: HttpFetcher,
  query: string,
  options: { limit?: number } = {},
): Promise<ImageSearchResult> {
  const params = new URLSearchParams({
    q: query,
    license: [...REUSABLE_LICENCES].join(","),
    page_size: String(options.limit ?? 5),
  });
  let res;
  try {
    res = await fetcher(`${OPENVERSE}?${params.toString()}`, { timeoutMs: 15000, accept: "application/json" });
  } catch (err) {
    const status = err instanceof HttpError && err.kind === "timeout" ? "timeout" : "network_error";
    return { status, accepted: [], rejected: [], error: (err as Error).message };
  }
  if (res.status >= 400) {
    return { status: "http_error", accepted: [], rejected: [], error: `http ${res.status}` };
  }

  // A JSON endpoint that answers 200 with HTML is a throttle/interstitial page
  // (Openverse's anonymous tier does this). Report it honestly, never parse it.
  const contentType = (res.headers["content-type"] ?? "").toLowerCase();
  if (contentType.includes("html") || /^\s*</.test(res.text)) {
    return {
      status: "http_error",
      accepted: [],
      rejected: [],
      error: "non-JSON (HTML) response — source throttled or unavailable (anonymous rate limit)",
    };
  }

  let data: { results?: OpenverseResult[] };
  try {
    data = JSON.parse(res.text);
  } catch {
    return { status: "http_error", accepted: [], rejected: [], error: "invalid JSON" };
  }

  const accepted: LicensedImage[] = [];
  const rejected: { title: string; reason: string }[] = [];
  for (const r of data.results ?? []) {
    const v = validateLicensedImage(r);
    if (v.ok && v.image) accepted.push(v.image);
    else rejected.push({ title: r.title ?? "(untitled)", reason: v.reason });
  }
  return { status: "ok", accepted, rejected };
}
