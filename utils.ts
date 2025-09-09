import type { AppFile } from './types';

// Interface for the payload used by file upload components
export interface UploadPayload {
  file: File;
  path: string;
}

// Reads a file and returns an AppFile object with its content and path.
export const readFile = (payload: UploadPayload): Promise<AppFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: payload.path.split('/').pop() || payload.file.name,
        path: payload.path,
        content: reader.result as string,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(payload.file);
  });
};

/**
 * Zips an array of AppFile objects and initiates a download.
 * @param files The files to zip.
 * @param zipName The name of the zip file to be downloaded.
 */
export const zipAndDownloadFiles = async (files: AppFile[], zipName: string): Promise<void> => {
    if (!window.JSZip) {
        console.error("JSZip library is not loaded.");
        alert("無法建立 ZIP 檔案，所需函式庫未載入。");
        return;
    }
    try {
        const zip = new window.JSZip();
        files.forEach(file => {
            zip.file(file.path, file.content);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to create or download zip file:", error);
        alert(`建立 ZIP 檔案時發生錯誤: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Unzips a .zip file and returns an array of UploadPayload objects.
 * @param zipFile The .zip file to unzip.
 * @returns A promise that resolves to an array of UploadPayloads.
 */
export const unzipFile = async (zipFile: File): Promise<UploadPayload[]> => {
    if (!window.JSZip) {
        throw new Error("JSZip library is not loaded.");
    }

    const zip = await window.JSZip.loadAsync(zipFile);
    const payloads: Promise<UploadPayload>[] = [];

    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
            const promise = zipEntry.async('blob').then(content => {
                // Recreate the File object from the blob
                const file = new File([content], zipEntry.name.split('/').pop() || zipEntry.name, { type: content.type });
                return { file, path: relativePath };
            });
            payloads.push(promise);
        }
    });

    return Promise.all(payloads);
};
