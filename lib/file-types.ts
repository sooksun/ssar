// PRD: image (jpeg, png, gif, webp), PDF, Word, Excel, PowerPoint
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'mp4', 'webm', 'mov', 'avi',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi']);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]);

/** ขนาดไฟล์สูงสุด 10 MB (สำหรับไฟล์ทั่วไป ไม่รวมวิดีโอ) - ตาม PRD */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** ขนาดวิดีโอสูงสุด (MB) */
export const VIDEO_MAX_SIZE_MB = 1000;

/** mapping นามสกุล -> MIME ที่อนุญาต (สำหรับตรวจ extension ตรง MIME) */
const EXTENSION_TO_MIMES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  mp4: ['video/mp4'],
  webm: ['video/webm'],
  mov: ['video/quicktime'],
  avi: ['video/x-msvideo'],
};

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

/**
 * ตรวจสอบว่านามสกุลไฟล์ตรงกับ MIME type ที่อนุญาต (PRD: ตรวจนามสกุลให้ตรงกับ MIME)
 */
export function extensionMatchesMime(fileName?: string | null, mimeType?: string | null): boolean {
  const ext = extractExtension(fileName);
  const mime = mimeType?.toLowerCase().trim();
  if (!ext || !mime) return true; // ไม่มีข้อมูลให้ผ่าน
  const allowedMimes = EXTENSION_TO_MIMES[ext];
  if (!allowedMimes) return false;
  return allowedMimes.some((m) => m === mime);
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
  return 'PDF, JPG, JPEG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX, PPT, PPTX, MP4, WEBM, MOV, AVI';
}

