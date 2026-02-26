'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { EvidenceFile } from '@prisma/client';
import { isVideoFile } from '@/lib/file-types';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

type FileViewerProps = {
  file: Partial<EvidenceFile> & {
    id: bigint;
    fileName: string;
    storageType: string;
    evidence: {
      school: {
        sc_id: bigint;
        name: string;
      };
      indicator: {
        standard: {
          level: {
            nameTh: string;
          };
          nameTh: string;
        };
        nameTh: string;
      };
    };
    fileUrls?: unknown; // JsonValue from Prisma
    thumbnailUrl?: string | null;
  };
};

/**
 * แสดง embedded content ตามประเภทไฟล์
 */
export function FileViewer({ file }: FileViewerProps) {
  // State สำหรับ image modal (ใช้สำหรับกลุ่มรูปภาพ)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // State สำหรับ loading
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadedImagesCount, setLoadedImagesCount] = useState(0);

  // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่ (ต้องประกาศก่อนใช้)
  const isImageFile = (fileName?: string | null, mimeType?: string | null): boolean => {
    if (mimeType) {
      return mimeType.toLowerCase().startsWith('image/');
    }
    if (fileName) {
      const ext = fileName.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext || '');
    }
    return false;
  };

  // คำนวณ fileUrls ที่ top level
  const fileUrls =
    file.storageType === 'URL' &&
    isImageFile(file.fileName, file.mimeType) &&
    file.fileUrls &&
    typeof file.fileUrls === 'object' &&
    Array.isArray(file.fileUrls)
      ? (file.fileUrls as Array<{ url: string; fileName: string; mimeType?: string; fileSize?: number }>)
      : null;

  // Functions สำหรับ modal navigation
  const openModal = useCallback((index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const goToPrevious = useCallback(() => {
    if (fileUrls && fileUrls.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? fileUrls.length - 1 : prev - 1));
    }
  }, [fileUrls]);

  const goToNext = useCallback(() => {
    if (fileUrls && fileUrls.length > 0) {
      setCurrentImageIndex((prev) => (prev === fileUrls.length - 1 ? 0 : prev + 1));
    }
  }, [fileUrls]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isModalOpen || !fileUrls || fileUrls.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') closeModal();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, goToPrevious, goToNext, closeModal, fileUrls]);

  // Reset loading state when file changes
  useEffect(() => {
    setIsLoading(true);
    setLoadedImagesCount(0);
  }, [file.id]);

  // ตรวจสอบว่า loadedImagesCount เท่ากับ fileUrls.length หรือไม่
  useEffect(() => {
    if (!fileUrls || fileUrls.length === 0) {
      setIsLoading(false);
      return;
    }

    // ถ้าโหลดครบทุกรูปแล้ว ให้ซ่อน loading
    if (loadedImagesCount >= fileUrls.length) {
      setIsLoading(false);
    }
  }, [loadedImagesCount, fileUrls]);

  // ตรวจสอบอีกครั้งหลังจาก render (กรณีที่รูปภาพถูก cache และ onLoad ไม่ถูกเรียก)
  useEffect(() => {
    if (!fileUrls || fileUrls.length === 0) {
      setIsLoading(false);
      return;
    }

    // ตรวจสอบอีกครั้งหลังจาก render (กรณีที่รูปภาพถูก cache)
    const timeoutId = setTimeout(() => {
      // ตรวจสอบว่ามีรูปภาพที่โหลดเสร็จแล้วหรือไม่
      if (loadedImagesCount >= fileUrls.length) {
        setIsLoading(false);
      } else {
        // ถ้ายังไม่ครบ ให้ตั้งค่า loadedImagesCount เป็นจำนวนทั้งหมดเพื่อซ่อน loading
        // (กรณีที่รูปภาพถูก cache และ onLoad ไม่ถูกเรียก)
        setLoadedImagesCount(fileUrls.length);
        setIsLoading(false);
      }
    }, 500);

    // Fallback: ซ่อน loading หลังจาก 2 วินาที (กรณีที่ onLoad ไม่ถูกเรียกเลย)
    const fallbackTimeout = setTimeout(() => {
      setIsLoading(false);
      setLoadedImagesCount(fileUrls.length);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimeout);
    };
  }, [fileUrls, file.id, loadedImagesCount]);

  // สร้าง YouTube embed URL
  const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      // รองรับรูปแบบ:
      // - https://www.youtube.com/watch?v=VIDEO_ID
      // - https://youtu.be/VIDEO_ID
      // - https://www.youtube.com/embed/VIDEO_ID
      if (parsed.hostname.includes('youtu.be')) {
        const videoId = parsed.pathname.slice(1);
        if (videoId && videoId.length >= 11) {
          return `https://www.youtube.com/embed/${videoId.substring(0, 11)}`;
        }
      }
      if (parsed.hostname.includes('youtube.com')) {
        const videoId = parsed.searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
        const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
        if (embedMatch && embedMatch[1]) {
          return `https://www.youtube.com/embed/${embedMatch[1]}`;
        }
      }
    } catch {
      // ถ้า parse URL ไม่ได้ ลองใช้ regex
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return `https://www.youtube.com/embed/${match[1]}`;
        }
      }
    }

    return null;
  };

  // สร้าง Google Drive embed URL
  const getGoogleDriveEmbedUrl = (url: string, fileId?: string | null): string | null => {
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('drive.google.com')) {
        // รองรับรูปแบบ:
        // - https://drive.google.com/file/d/FILE_ID/view
        // - https://drive.google.com/file/d/FILE_ID
        const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
        // รองรับรูปแบบ: https://drive.google.com/open?id=FILE_ID
        const idParam = parsed.searchParams.get('id');
        if (idParam) {
          return `https://drive.google.com/file/d/${idParam}/preview`;
        }
      }
    } catch {
      // ถ้า parse URL ไม่ได้ ลองใช้ regex
      const patterns = [
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
        /[?&]id=([a-zA-Z0-9_-]+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
      }
    }

    return null;
  };

  // ตรวจสอบว่าเป็นไฟล์ PDF หรือไม่
  const isPdfFile = (fileName?: string | null, mimeType?: string | null): boolean => {
    if (mimeType) {
      return mimeType.toLowerCase() === 'application/pdf';
    }
    if (fileName) {
      return fileName.toLowerCase().endsWith('.pdf');
    }
    return false;
  };

  // สร้าง Canva embed URL
  const getCanvaEmbedUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('canva.com')) {
        // Canva embed URL format: https://www.canva.com/design/DESIGN_ID/view?embed
        const designMatch = parsed.pathname.match(/\/design\/([^/]+)/);
        if (designMatch && designMatch[1]) {
          return `https://www.canva.com/design/${designMatch[1]}/view?embed`;
        }
        // ถ้ามี embed parameter อยู่แล้ว
        if (parsed.searchParams.has('embed')) {
          return url;
        }
        // ลองใช้ URL เดิม
        return url;
      }
    } catch {
      // ถ้า parse URL ไม่ได้
      if (url.includes('canva.com')) {
        return url;
      }
    }
    return null;
  };

  // สร้าง URL สำหรับแสดงไฟล์
  const getFileUrl = (): string | null => {
    if (file.storageType === 'URL') {
      return file.externalUrl || file.storagePath || null;
    }
    if (file.storageType === 'YOUTUBE') {
      return file.storagePath || file.externalUrl || null;
    }
    if (file.storageType === 'GDRIVE') {
      return file.storagePath || file.externalUrl || null;
    }
    if (file.storageType === 'CANVA') {
      return file.storagePath || file.externalUrl || null;
    }
    if (file.storageType === 'LINK') {
      return file.externalUrl || file.storagePath || null;
    }
    return null;
  };

  const fileUrl = getFileUrl();

  // Loading Component
  const LoadingSpinner = () => (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">กำลังโหลดไฟล์...</p>
      </div>
    </div>
  );

  // แสดงตามประเภทไฟล์
  if (file.storageType === 'YOUTUBE' && fileUrl) {
    const embedUrl = getYouTubeEmbedUrl(fileUrl);
    if (embedUrl) {
      return (
        <div className="w-full">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            {isLoading && <LoadingSpinner />}
            <iframe
              src={embedUrl}
              title={file.fileName}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              onLoad={() => setIsLoading(false)}
            />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>ประเภท:</strong> YouTube Video
            </p>
            <p>
              <strong>ลิงก์:</strong>{' '}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fileUrl}
              </a>
            </p>
          </div>
        </div>
      );
    }
    // ถ้าไม่สามารถสร้าง embed URL ได้ ให้แสดงลิงก์
    return (
      <div className="w-full text-center">
        <p className="mb-4 text-muted-foreground">ไม่สามารถแสดง YouTube video ได้</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
        >
          เปิดลิงก์ YouTube
        </a>
      </div>
    );
  }

  if (file.storageType === 'GDRIVE' && fileUrl) {
    const embedUrl = getGoogleDriveEmbedUrl(fileUrl, file.driveFileId);
    if (embedUrl) {
      return (
        <div className="w-full">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
            {isLoading && <LoadingSpinner />}
            <iframe
              src={embedUrl}
              title={file.fileName}
              allow="autoplay"
              className="absolute inset-0 h-full w-full"
              onLoad={() => setIsLoading(false)}
            />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>ประเภท:</strong> Google Drive
            </p>
            <p>
              <strong>ลิงก์:</strong>{' '}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fileUrl}
              </a>
            </p>
          </div>
        </div>
      );
    }
    // ถ้าไม่สามารถสร้าง embed URL ได้ ให้แสดงลิงก์
    return (
      <div className="w-full text-center">
        <p className="mb-4 text-muted-foreground">ไม่สามารถแสดง Google Drive file ได้</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
        >
          เปิดลิงก์ Google Drive
        </a>
      </div>
    );
  }

  if (file.storageType === 'CANVA' && fileUrl) {
    const embedUrl = getCanvaEmbedUrl(fileUrl);
    if (embedUrl) {
      return (
        <div className="w-full">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
            {isLoading && <LoadingSpinner />}
            <iframe
              src={embedUrl}
              title={file.fileName}
              allow="fullscreen"
              className="absolute inset-0 h-full w-full"
              onLoad={() => setIsLoading(false)}
            />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>ประเภท:</strong> Canva
            </p>
            <p>
              <strong>ลิงก์:</strong>{' '}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fileUrl}
              </a>
            </p>
          </div>
        </div>
      );
    }
    // ถ้าไม่สามารถสร้าง embed URL ได้ ให้แสดงลิงก์
    return (
      <div className="w-full text-center">
        <p className="mb-4 text-muted-foreground">ไม่สามารถแสดง Canva ได้</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
        >
          เปิดลิงก์ Canva
        </a>
      </div>
    );
  }

  if (file.storageType === 'LINK' && fileUrl) {
    // LINK type จะเปิดในแท็บใหม่ ไม่แสดงใน embedded page
    return (
      <div className="w-full text-center py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white">
              LINK
            </div>
          </div>
          <h2 className="mb-4 text-2xl font-bold">ลิงก์เว็บไซต์</h2>
          <p className="mb-6 text-muted-foreground">
            ไฟล์นี้เป็นลิงก์เว็บไซต์ กรุณาคลิกปุ่มด้านล่างเพื่อเปิดในแท็บใหม่
          </p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
          >
            เปิดลิงก์เว็บไซต์
          </a>
          <div className="mt-6 text-sm text-muted-foreground">
            <p>
              <strong>ชื่อไฟล์:</strong> {file.fileName}
            </p>
            <p className="mt-2 break-all">
              <strong>ลิงก์:</strong>{' '}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fileUrl}
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (file.storageType === 'URL' && fileUrl) {
    // ตรวจสอบว่าเป็นวิดีโอ
    if (isVideoFile(file.fileName, file.mimeType)) {
      return (
        <div className="w-full">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            {isLoading && <LoadingSpinner />}
            <video
              src={fileUrl}
              controls
              className="h-full w-full"
              preload="metadata"
              onLoadedData={() => setIsLoading(false)}
              onCanPlay={() => setIsLoading(false)}
            >
              <source src={fileUrl} type={file.mimeType || 'video/mp4'} />
              เบราว์เซอร์ของคุณไม่รองรับการแสดงวิดีโอ
            </video>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>ประเภท:</strong> วิดีโอ
            </p>
            <p>
              <strong>ลิงก์:</strong>{' '}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fileUrl}
              </a>
            </p>
            {file.fileSize && (
              <p>
                <strong>ขนาด:</strong> {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>
      );
    }

    // ตรวจสอบว่าเป็นรูปภาพ
    if (isImageFile(file.fileName, file.mimeType)) {
      if (fileUrls && fileUrls.length > 0) {
        return (
          <>
            <div className="w-full">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold mb-2">Responsive Image Gallery</h2>
                <p className="text-sm text-muted-foreground">
                  กลุ่มรูปภาพ ({fileUrls.length} ไฟล์)
                </p>
              </div>
              {isLoading && (
                <div className="mb-8 flex justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">กำลังโหลดรูปภาพ...</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {fileUrls.map((img, index) => (
                  <div key={index} className="group flex flex-col">
                    <div
                      className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer"
                      onClick={() => openModal(index)}
                    >
                      <Image
                        src={img.url}
                        alt={img.fileName || `รูปภาพ ${index + 1}`}
                        width={400}
                        height={400}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        unoptimized
                        onLoad={() => {
                          setLoadedImagesCount((prev) => {
                            const newCount = prev + 1;
                            if (newCount >= fileUrls.length) {
                              setIsLoading(false);
                            }
                            return newCount;
                          });
                        }}
                        onError={() => {
                          setLoadedImagesCount((prev) => {
                            const newCount = prev + 1;
                            if (newCount >= fileUrls.length) {
                              setIsLoading(false);
                            }
                            return newCount;
                          });
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">
                        {img.fileName || `รูปภาพ ${index + 1}`}
                      </p>
                      {img.fileSize && (
                        <p className="text-xs text-muted-foreground">
                          ขนาด: {(img.fileSize / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Modal/Popup */}
            {isModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                onClick={closeModal}
              >
                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="ปิด"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Previous Button */}
                {fileUrls.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevious();
                    }}
                    className="absolute left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    aria-label="รูปก่อนหน้า"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                )}

                {/* Next Button */}
                {fileUrls.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNext();
                    }}
                    className="absolute right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    aria-label="รูปถัดไป"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                )}

                {/* Image Container */}
                <div
                  className="relative max-h-[90vh] max-w-[90vw]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={fileUrls[currentImageIndex].url}
                    alt={fileUrls[currentImageIndex].fileName || `รูปภาพ ${currentImageIndex + 1}`}
                    width={1200}
                    height={1200}
                    className="max-h-[90vh] max-w-[90vw] object-contain"
                    unoptimized
                    priority
                  />

                  {/* Image Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <p className="text-sm font-semibold">
                      {fileUrls[currentImageIndex].fileName || `รูปภาพ ${currentImageIndex + 1}`}
                    </p>
                    {fileUrls[currentImageIndex].fileSize && (
                      <p className="text-xs text-white/80">
                        ขนาด: {(fileUrls[currentImageIndex].fileSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                    {fileUrls.length > 1 && (
                      <p className="text-xs text-white/80 mt-1">
                        {currentImageIndex + 1} / {fileUrls.length}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        );
      }
      
      // แสดงรูปภาพเดียว
      return (
        <div className="w-full">
          <div className="relative aspect-auto w-full overflow-hidden rounded-lg bg-muted">
            {isLoading && <LoadingSpinner />}
            <Image
              src={fileUrl}
              alt={file.fileName}
              width={1200}
              height={800}
              className="h-auto w-full object-contain"
              unoptimized
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>ประเภท:</strong> รูปภาพ
            </p>
            <p>
              <strong>ลิงก์:</strong>{' '}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fileUrl}
              </a>
            </p>
          </div>
        </div>
      );
    }

    // ตรวจสอบว่าเป็น PDF
    if (isPdfFile(file.fileName, file.mimeType)) {
      return (
        <div className="w-full">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
            {isLoading && <LoadingSpinner />}
            <iframe
              src={fileUrl}
              title={file.fileName}
              className="absolute inset-0 h-full w-full"
              onLoad={() => setIsLoading(false)}
            />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>ประเภท:</strong> PDF
            </p>
            <p>
              <strong>ลิงก์:</strong>{' '}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fileUrl}
              </a>
            </p>
          </div>
        </div>
      );
    }

    // ไฟล์ประเภทอื่นๆ แสดงลิงก์
    return (
      <div className="w-full text-center">
        <p className="mb-4 text-muted-foreground">
          ไม่สามารถแสดงไฟล์ประเภทนี้ได้ กรุณาเปิดลิงก์เพื่อดูไฟล์
        </p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
        >
          เปิดไฟล์
        </a>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            <strong>ชื่อไฟล์:</strong> {file.fileName}
          </p>
          <p>
            <strong>ประเภท:</strong> {file.mimeType || 'ไม่ระบุ'}
          </p>
        </div>
      </div>
    );
  }

  // กรณีไม่มี URL
  return (
    <div className="w-full text-center">
      <p className="mb-4 text-muted-foreground">ไม่พบลิงก์ไฟล์</p>
      <div className="text-sm text-muted-foreground">
        <p>
          <strong>ชื่อไฟล์:</strong> {file.fileName}
        </p>
        <p>
          <strong>ประเภท:</strong> {file.storageType}
        </p>
      </div>
    </div>
  );
}

