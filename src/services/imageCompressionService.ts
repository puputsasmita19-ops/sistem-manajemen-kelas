/**
 * Layanan Kompresi Foto Sisi Klien (Browser HP Siswa)
 * Mengoptimalkan foto selfie/kamera di canvas perangkat sebelum dikirim ke jaringan.
 * Menghemat kuota internet hingga 90%+ dan mempercepat transfer data pada jaringan seluler.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 s.d 1.0 (rekomendasi: 0.7 - 0.8)
  mimeType?: 'image/jpeg' | 'image/webp';
  targetMaxKB?: number;
}

export interface CompressedImageResult {
  blob: Blob;
  file: File;
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  savedPercentage: number;
  width: number;
  height: number;
  compressionTimeMs: number;
}

export class ImageCompressionService {
  private static instance: ImageCompressionService;

  private constructor() {}

  public static getInstance(): ImageCompressionService {
    if (!ImageCompressionService.instance) {
      ImageCompressionService.instance = new ImageCompressionService();
    }
    return ImageCompressionService.instance;
  }

  /**
   * Mengompresi elemen video atau canvas kamera langsung menjadi Blob / File teroptimasi
   */
  public async compressCanvas(
    canvas: HTMLCanvasElement,
    options: ImageCompressionOptions = {}
  ): Promise<CompressedImageResult> {
    const startTime = performance.now();
    const maxWidth = options.maxWidth || 720;
    const maxHeight = options.maxHeight || 720;
    const quality = options.quality !== undefined ? options.quality : 0.75;
    const mimeType = options.mimeType || 'image/jpeg';

    // 1. Hitung dimensi proporsional
    let srcWidth = canvas.width;
    let srcHeight = canvas.height;
    let targetWidth = srcWidth;
    let targetHeight = srcHeight;

    if (srcWidth > maxWidth || srcHeight > maxHeight) {
      const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
      targetWidth = Math.round(srcWidth * ratio);
      targetHeight = Math.round(srcHeight * ratio);
    }

    // 2. Buat target canvas untuk resize & kompresi
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;

    const ctx = targetCanvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Gagal menginisialisasi konteks render canvas untuk kompresi');
    }

    // Rendering dengan smoothing berkualitas tinggi
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

    // 3. Konversi ke Blob terkompresi
    const blob = await new Promise<Blob>((resolve, reject) => {
      targetCanvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Gagal menghasilkan blob foto terkompresi'));
        },
        mimeType,
        quality
      );
    });

    const dataUrl = targetCanvas.toDataURL(mimeType, quality);
    const compressedSizeKB = Math.round((blob.size / 1024) * 10) / 10;

    // Estimasi ukuran mentah uncompressed RGBA di memori
    const estimatedRawBytes = srcWidth * srcHeight * 4;
    const originalSizeKB = Math.round((estimatedRawBytes / 1024) * 10) / 10;
    const savedPercentage = Math.max(
      0,
      Math.min(99.5, Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 1000) / 10)
    );

    const fileName = `selfie_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
    const file = new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
    const endTime = performance.now();

    return {
      blob,
      file,
      dataUrl,
      originalSizeKB,
      compressedSizeKB,
      savedPercentage,
      width: targetWidth,
      height: targetHeight,
      compressionTimeMs: Math.round(endTime - startTime)
    };
  }

  /**
   * Mengompresi file foto atau dataUrl dari perangkat
   */
  public async compressImageSource(
    source: File | Blob | string,
    options: ImageCompressionOptions = {}
  ): Promise<CompressedImageResult> {
    const startTime = performance.now();
    const maxWidth = options.maxWidth || 720;
    const maxHeight = options.maxHeight || 720;
    const quality = options.quality !== undefined ? options.quality : 0.75;
    const mimeType = options.mimeType || 'image/jpeg';

    let originalSizeKB = 0;
    if (source instanceof File || source instanceof Blob) {
      originalSizeKB = Math.round((source.size / 1024) * 10) / 10;
    }

    const img = await this.loadImage(source);
    let targetWidth = img.naturalWidth || img.width;
    let targetHeight = img.naturalHeight || img.height;

    if (originalSizeKB === 0) {
      originalSizeKB = Math.round(((targetWidth * targetHeight * 4) / 1024) * 10) / 10;
    }

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Gagal menginisialisasi 2D canvas');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Gagal mengompresi gambar'));
        },
        mimeType,
        quality
      );
    });

    const dataUrl = canvas.toDataURL(mimeType, quality);
    const compressedSizeKB = Math.round((blob.size / 1024) * 10) / 10;
    const savedPercentage = Math.max(
      0,
      Math.min(99.5, Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 1000) / 10)
    );

    const fileName =
      source instanceof File ? source.name : `compressed_${Date.now()}.jpg`;
    const file = new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
    const endTime = performance.now();

    return {
      blob,
      file,
      dataUrl,
      originalSizeKB,
      compressedSizeKB,
      savedPercentage,
      width: targetWidth,
      height: targetHeight,
      compressionTimeMs: Math.round(endTime - startTime)
    };
  }

  private loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Gagal memuat format gambar untuk dikompresi'));

      if (typeof source === 'string') {
        img.src = source;
      } else {
        const objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      }
    });
  }
}

export const imageCompressionService = ImageCompressionService.getInstance();
