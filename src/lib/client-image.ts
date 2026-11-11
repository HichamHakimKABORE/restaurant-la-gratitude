'use client';

const DEFAULT_MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 Mo avant compression côté navigateur

/**
 * Redimensionne et compresse une image sélectionnée par l'utilisateur en Data URL JPEG,
 * après vérification du type MIME et de la taille brute du fichier.
 */
export function compressImageFileToBase64(
  file: File,
  maxDim = 760,
  maxFileBytes = DEFAULT_MAX_FILE_BYTES
): Promise<string> {
  if (!file.type || !file.type.startsWith('image/')) {
    return Promise.reject(new Error('Format non supporté. Sélectionnez une image (JPG, PNG, WEBP).'));
  }
  if (file.size <= 0 || file.size > maxFileBytes) {
    return Promise.reject(new Error('Fichier trop lourd (maximum 15 Mo avant compression).'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        } else {
          reject(new Error('Erreur de traitement canvas.'));
        }
      };
      img.onerror = () => reject(new Error('Impossible de lire cette image.'));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Impossible de charger ce fichier.'));
    reader.readAsDataURL(file);
  });
}
