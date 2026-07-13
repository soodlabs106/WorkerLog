import { supabase, supabaseAnonKey, supabaseUrl } from "./supabaseClient";
import { safeImageSrc } from "./security";

export const ISSUE_PHOTO_BUCKET = "issue-photos";
export const ALLOWED_RASTER_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ISSUE_PHOTO_SIGN_ENDPOINT = `${supabaseUrl}/functions/v1/issue-photo-sign`;

export function photoThumbSrc(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return safeImageSrc(photo);
  return safeImageSrc(photo.thumb || photo.full || "");
}

export function photoFullSrc(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return safeImageSrc(photo);
  return safeImageSrc(photo.full || photo.thumb || "");
}

export function photoKey(photo, index) {
  const src = photoThumbSrc(photo) || photoFullSrc(photo);
  return `${src.slice(0, 32)}-${index}`;
}

export function dataUrlToBlob(dataUrl) {
  const [header, content] = String(dataUrl || "").split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const binary = atob(content || "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

export function collectIssuePhotoPaths(issues) {
  const paths = new Set();

  (issues || []).forEach((issue) => {
    (issue.issue_photos || []).forEach((row) => {
      if (!row.full_deleted_at && row.full_path) paths.add(row.full_path);
      if (!row.thumb_deleted_at && (row.thumb_path || row.full_path)) {
        paths.add(row.thumb_path || row.full_path);
      }
    });
  });

  return [...paths];
}

export function assertAllowedImageFile(file, maxBytes, label = "Image") {
  if (!file) {
    throw new Error(`${label} is missing.`);
  }

  if (!ALLOWED_RASTER_IMAGE_TYPES.has(file.type)) {
    throw new Error(`${label} must be a JPG, PNG, or WebP image.`);
  }

  if (file.size > maxBytes) {
    throw new Error(`${file.name} is larger than ${Math.round(maxBytes / (1024 * 1024))} MB. Please choose a smaller image.`);
  }
}

export async function fetchSignedIssuePhotoUrls(paths) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))];
  if (!uniquePaths.length) return {};

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Your session expired before photos could be loaded.");
  }

  const response = await fetch(ISSUE_PHOTO_SIGN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paths: uniquePaths }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || `Secure photo signing failed (${response.status})`);
  }

  return payload.urls || {};
}

export function normalizeIssuePhotoRow(row, signedUrls = {}) {
  const full = row.full_deleted_at ? "" : (signedUrls[row.full_path] || "");
  const thumbPath = row.thumb_path || row.full_path;
  const thumb = row.thumb_deleted_at ? "" : (signedUrls[thumbPath] || signedUrls[row.full_path] || "");

  if (!full && !thumb) return null;

  return {
    id: row.id,
    full,
    thumb,
    fullDeletedAt: row.full_deleted_at,
    thumbDeletedAt: row.thumb_deleted_at,
  };
}

export function mergeIssuePhotoSources(issue, signedUrls = {}) {
  const storagePhotos = (issue.issue_photos || [])
    .map((row) => normalizeIssuePhotoRow(row, signedUrls))
    .filter(Boolean);

  return {
    ...issue,
    display_photos: storagePhotos,
  };
}

function randomToken() {
  return Math.random().toString(36).slice(2, 10);
}

export function issuePhotoStoragePath(issueId, index, kind) {
  return `${issueId}/${Date.now()}-${index + 1}-${randomToken()}-${kind}.jpg`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not load ${file.name}.`));
    };
    image.src = objectUrl;
  });
}

function resizeToDataUrl(image, maxDimension, quality) {
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare image upload.");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function buildOptimizedImageDataUrl(file, { maxDimension = 640, quality = 0.78 } = {}) {
  const image = await loadImage(file);
  return resizeToDataUrl(image, maxDimension, quality);
}

export async function buildIssuePhotoPayload(file) {
  assertAllowedImageFile(file, 3 * 1024 * 1024, "Issue photo");
  const image = await loadImage(file);
  return {
    full: resizeToDataUrl(image, 1400, 0.82),
    thumb: resizeToDataUrl(image, 320, 0.72),
  };
}
