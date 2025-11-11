const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'mp4', 'webm', 'mov', 'avi']);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi']);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]);

function extractExtension(fileName?: string | null) {
  if (!fileName) {
    return null;
  }
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return null;
  }
  return fileName.slice(lastDot + 1).toLowerCase();
}

export function isAllowedFileType(fileName?: string | null, mimeType?: string | null) {
  const ext = extractExtension(fileName);
  if (ext && ALLOWED_EXTENSIONS.has(ext)) {
    return true;
  }
  if (mimeType && ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return true;
  }
  return false;
}

export function isImageFile(fileName?: string | null, mimeType?: string | null) {
  const ext = extractExtension(fileName);
  if (ext && IMAGE_EXTENSIONS.has(ext)) {
    return true;
  }
  if (mimeType && IMAGE_MIME_TYPES.has(mimeType.toLowerCase())) {
    return true;
  }
  return false;
}

export function isVideoFile(fileName?: string | null, mimeType?: string | null) {
  const ext = extractExtension(fileName);
  if (ext && VIDEO_EXTENSIONS.has(ext)) {
    return true;
  }
  if (mimeType && VIDEO_MIME_TYPES.has(mimeType.toLowerCase())) {
    return true;
  }
  return false;
}

export function isPdfFile(fileName?: string | null, mimeType?: string | null) {
  const ext = extractExtension(fileName);
  if (ext === 'pdf') {
    return true;
  }
  if (mimeType && mimeType.toLowerCase() === 'application/pdf') {
    return true;
  }
  return false;
}

export function describeAllowedFileTypes() {
  return 'PDF, JPG, JPEG, PNG, MP4, WEBM, MOV, AVI';
}

