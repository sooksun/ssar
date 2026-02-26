import Image from 'next/image';
import { isImageFile, isVideoFile } from '@/lib/file-types';

type FileThumbnailProps = {
  file: {
    fileName: string;
    storageType: string;
    mimeType?: string | null;
    thumbnailUrl?: string | null;
    externalUrl?: string | null;
    storagePath?: string | null;
    driveFileId?: string | null;
  };
  size?: number;
  className?: string;
};

/**
 * สร้าง thumbnail content สำหรับไฟล์
 */
export function FileThumbnail({ file, size = 64, className = '' }: FileThumbnailProps) {
  const isImage = isImageFile(file.fileName, file.mimeType);
  const isVideo = isVideoFile(file.fileName, file.mimeType);
  const isPdf =
    (file.mimeType && file.mimeType.toLowerCase().includes('pdf')) ||
    (file.storageType === 'URL' &&
      ((file.externalUrl || file.storagePath || '').toLowerCase().includes('.pdf')));

  // สำหรับรูปภาพ: ใช้ thumbnailUrl หรือ externalUrl
  // สำหรับวิดีโอ: ใช้ thumbnailUrl ถ้ามี หรือแสดง icon วิดีโอ
  const previewSrc =
    file.storageType === 'URL' && isImage
      ? file.thumbnailUrl || file.externalUrl || file.storagePath
      : file.storageType === 'URL' && isVideo && file.thumbnailUrl
        ? file.thumbnailUrl
        : undefined;

  if (previewSrc) {
    return (
      <Image
        src={previewSrc}
        alt={`ไฟล์ ${file.fileName}`}
        width={size}
        height={size}
        className={`h-full w-full object-cover ${className}`}
        unoptimized
      />
    );
  }

  if (file.storageType === 'YOUTUBE') {
    return (
      <Image
        src="/youtube.png"
        alt="YouTube"
        width={size}
        height={size}
        className={`h-full w-full object-cover ${className}`}
        unoptimized
      />
    );
  }

  if (file.storageType === 'GDRIVE') {
    return (
      <Image
        src="/gdrive.png"
        alt="Google Drive"
        width={size}
        height={size}
        className={`h-full w-full object-cover ${className}`}
        unoptimized
      />
    );
  }

  if (file.storageType === 'CANVA') {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#00C4CC] to-[#7B61FF] text-white text-xs font-bold ${className}`}>
        CANVA
      </div>
    );
  }

  if (file.storageType === 'LINK') {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-blue-500 text-white text-xs font-bold ${className}`}>
        LINK
      </div>
    );
  }

  if (isVideo && previewSrc) {
    return (
      <Image
        src={previewSrc}
        alt={`Thumbnail ${file.fileName}`}
        width={size}
        height={size}
        className={`h-full w-full object-cover ${className}`}
        unoptimized
      />
    );
  }

  if (isVideo) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-red-500 text-white text-xs font-bold ${className}`}>
        VIDEO
      </div>
    );
  }

  if (isPdf) {
    return (
      <Image
        src="/file_pdf.png"
        alt="ไฟล์ PDF"
        width={size}
        height={size}
        className={`h-full w-full object-cover ${className}`}
        unoptimized
      />
    );
  }

  return (
    <div className={`flex h-full w-full items-center justify-center text-[10px] text-muted-foreground ${className}`}>
      ไม่มีพรีวิว
    </div>
  );
}

