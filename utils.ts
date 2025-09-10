import type { AppFile } from './types';
import { readFile as readSingleFile } from './utils'; // Renamed to avoid conflict

// Interface for the payload used by file upload components
export interface UploadPayload {
  file: File;
  path: string;
}

// Helper function to get a File object and its path from a FileSystemFileEntry
export function getUploadPayloadFromFileEntry(fileEntry: FileSystemFileEntry): Promise<UploadPayload> {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file) => {
        // The fullPath property gives the relative path including parent directories.
        // It often starts with a '/', which we remove to be consistent with webkitRelativePath.
        const path = fileEntry.fullPath.startsWith('/') ? fileEntry.fullPath.substring(1) : fileEntry.fullPath;
        resolve({ file, path });
      },
      reject
    );
  });
}

// Helper function to read all entries from a directory reader, handling pagination.
function readAllEntries(dirReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => {
        const allEntries: FileSystemEntry[] = [];
        
        const readEntriesBatch = () => {
            dirReader.readEntries(entries => {
                if (entries.length === 0) {
                    resolve(allEntries);
                    return;
                }
                allEntries.push(...entries);
                readEntriesBatch(); // read the next batch
            }, reject);
        };

        readEntriesBatch();
    });
}

// Helper function to recursively get all files from a directory entry
export async function getFilesFromDirectoryEntry(entry: FileSystemDirectoryEntry): Promise<UploadPayload[]> {
    const reader = entry.createReader();
    const entries = await readAllEntries(reader);

    const payloads: UploadPayload[] = [];
    for (const subEntry of entries) {
        if (subEntry.isFile) {
            payloads.push(await getUploadPayloadFromFileEntry(subEntry as FileSystemFileEntry));
        } else if (subEntry.isDirectory) {
            payloads.push(...await getFilesFromDirectoryEntry(subEntry as FileSystemDirectoryEntry));
        }
    }
    return payloads;
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

/**
 * Handles paste events to extract images from the clipboard.
 * @param e The clipboard event.
 * @param onImagesPasted A callback function to handle the extracted base64 image strings.
 */
export const handleImagePaste = (
    e: React.ClipboardEvent,
    onImagesPasted: (images: string[]) => void
): void => {
    const imageBlobs: File[] = [];
    for (const item of e.clipboardData.items) {
        if (item.type.includes('image')) {
            const blob = item.getAsFile();
            if (blob) imageBlobs.push(blob);
        }
    }

    if (imageBlobs.length > 0) {
        e.preventDefault();
        const newImagesPromises = imageBlobs.map(blob => 
            new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.readAsDataURL(blob);
            })
        );

        Promise.all(newImagesPromises).then(onImagesPasted);
    }
};

/**
 * Processes an array of UploadPayload objects, handling zips, filtering types, and reading files.
 * This is the standardized way to handle file uploads in the application.
 * @param payloads The raw upload payloads from a file input or drag-drop event.
 * @param acceptedTypes An array of accepted file extensions (e.g., ['.js', '.ts']).
 * @param onError A callback to handle errors during processing.
 * @returns A promise that resolves to an array of AppFile objects.
 */
export const processUploadedFiles = async (
    payloads: UploadPayload[],
    acceptedTypes: string[],
    onError: (message: string) => void
): Promise<AppFile[]> => {
    const processedPayloads: UploadPayload[] = [];

    for (const payload of payloads) {
        if (payload.file.name.toLowerCase().endsWith('.zip')) {
            try {
                const unzippedPayloads = await unzipFile(payload.file);
                processedPayloads.push(...unzippedPayloads);
            } catch (e) {
                console.error(`Failed to unzip file ${payload.file.name}:`, e);
                onError(`解壓縮檔案 ${payload.file.name} 失敗。`);
            }
        } else {
            processedPayloads.push(payload);
        }
    }

    const filteredPayloads = processedPayloads.filter(p =>
        acceptedTypes.some(type => p.path.toLowerCase().endsWith(type)) && !p.path.toLowerCase().endsWith('.zip')
    );

    return Promise.all(filteredPayloads.map(readFile));
};

/**
 * A generic utility to handle Server-Sent Events (SSE) streams from a fetch Response.
 * @param response The fetch Response object.
 * @param parser A function to parse a JSON string from the stream and extract the text content.
 * @returns An async generator that yields string chunks.
 */
export async function* handleSseStream(
    response: Response,
    parser: (jsonStr: string) => string | null | undefined
): AsyncGenerator<string> {
    if (!response.body) {
        throw new Error("Response body is null.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6).trim();
                
                // Handle OpenAI's [DONE] marker
                if (jsonStr === '[DONE]') {
                    return;
                }

                try {
                    const text = parser(jsonStr);
                    if (text) {
                        yield text;
                    }
                } catch (e) {
                    console.error("Failed to parse SSE chunk:", e, "Chunk:", jsonStr);
                }
            }
        }
    }
}