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
