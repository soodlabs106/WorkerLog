import { supabase } from "./supabaseClient";

export const ISSUE_PHOTO_BUCKET = "issue-photos";

export function photoThumbSrc(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return photo;
  return photo.thumb || photo.full || "";
}

export function photoFullSrc(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return photo;
  return photo.full || photo.thumb || "";
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

function storagePublicUrl(path) {
  if (!path) return "";
  return supabase.storage.from(ISSUE_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function normalizeIssuePhotoRow(row) {
  const full = row.full_deleted_at ? "" : storagePublicUrl(row.full_path);
  const thumb = row.thumb_deleted_at ? "" : storagePublicUrl(row.thumb_path || row.full_path);

  if (!full && !thumb) return null;

  return {
    id: row.id,
    full,
    thumb,
    fullDeletedAt: row.full_deleted_at,
    thumbDeletedAt: row.thumb_deleted_at,
  };
}

export function mergeIssuePhotoSources(issue) {
  const storagePhotos = (issue.issue_photos || [])
    .map(normalizeIssuePhotoRow)
    .filter(Boolean);
  const legacyPhotos = Array.isArray(issue.issue_photo_urls) ? issue.issue_photo_urls : [];

  return {
    ...issue,
    display_photos: [...storagePhotos, ...legacyPhotos],
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

export async function buildIssuePhotoPayload(file) {
  const image = await loadImage(file);
  return {
    full: resizeToDataUrl(image, 1400, 0.82),
    thumb: resizeToDataUrl(image, 320, 0.72),
  };
}
