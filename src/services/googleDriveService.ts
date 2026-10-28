import { YearlyStore, DEFAULT_YEARLY_DATA } from '../data/bbmData';

export const DATABASE_FILENAME = 'SiBensin_Database_BBM_Sekretariat.json';

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

export interface DriveDatabasePayload {
  app: string;
  version: string;
  lastSaved: string;
  savedByEmail?: string;
  yearlyStore: YearlyStore;
}

/**
 * Searches user's Google Drive for existing database file named SiBensin_Database_BBM_Sekretariat.json
 */
export async function findDatabaseInDrive(accessToken: string): Promise<DriveFileInfo | null> {
  const query = encodeURIComponent(`name = '${DATABASE_FILENAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,size)&spaces=drive`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to search Drive files:', errorText);
    throw new Error(`Google Drive API error: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.files && result.files.length > 0) {
    return result.files[0] as DriveFileInfo;
  }
  return null;
}

/**
 * Downloads and parses database JSON from Google Drive
 */
export async function downloadDatabaseFromDrive(
  accessToken: string,
  fileId: string
): Promise<DriveDatabasePayload> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Failed to download Drive file:', errText);
    throw new Error(`Gagal mengunduh file dari Google Drive (${response.status})`);
  }

  const data = await response.json();
  if (!data) {
    throw new Error('File database di Google Drive kosong atau tidak dapat dibaca.');
  }

  let resolvedYearlyStore: YearlyStore;

  if (data.yearlyStore && typeof data.yearlyStore === 'object') {
    resolvedYearlyStore = { ...DEFAULT_YEARLY_DATA, ...data.yearlyStore };
  } else if (data[2026] || data['2026']) {
    resolvedYearlyStore = { ...DEFAULT_YEARLY_DATA, ...data };
  } else if (Array.isArray(data)) {
    resolvedYearlyStore = {
      ...DEFAULT_YEARLY_DATA,
      2026: { budget: 350000000, data },
    };
  } else if (data.data && Array.isArray(data.data)) {
    resolvedYearlyStore = {
      ...DEFAULT_YEARLY_DATA,
      2026: { budget: data.budget || 350000000, data: data.data },
    };
  } else {
    throw new Error('Format file database pada Google Drive tidak sesuai standar SiBensin.');
  }

  return {
    app: data.app || 'SiBensin',
    version: data.version || '2.0.0',
    lastSaved: data.lastSaved || new Date().toISOString(),
    savedByEmail: data.savedByEmail,
    yearlyStore: resolvedYearlyStore,
  };
}

/**
 * Uploads (create or update) database file to Google Drive
 */
export async function uploadDatabaseToDrive(
  accessToken: string,
  yearlyStore: YearlyStore,
  userEmail?: string,
  existingFileId?: string | null
): Promise<{ fileId: string; modifiedTime: string }> {
  const timestamp = new Date().toISOString();
  const payload: DriveDatabasePayload = {
    app: 'SiBensin - Rekapitulasi Penggunaan BBM Sekretariat',
    version: '2.0.0',
    lastSaved: timestamp,
    savedByEmail: userEmail,
    yearlyStore,
  };

  const jsonString = JSON.stringify(payload, null, 2);

  // If file already exists, update content via media patch
  if (existingFileId) {
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: jsonString,
    });

    if (!updateRes.ok) {
      if (updateRes.status !== 404) {
        const err = await updateRes.text();
        console.error('Failed to update Drive file:', err);
        throw new Error('Gagal memperbarui file database di Google Drive.');
      }
    } else {
      const updatedData = await updateRes.json();
      return {
        fileId: updatedData.id || existingFileId,
        modifiedTime: updatedData.modifiedTime || timestamp,
      };
    }
  }

  // Otherwise, create new file using multipart upload
  const metadata = {
    name: DATABASE_FILENAME,
    description: 'Database Cadangan SiBensin - Rekapitulasi Penggunaan BBM Sekretariat',
    mimeType: 'application/json',
  };

  const boundary = '-------SiBensinDriveBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonString +
    closeDelimiter;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error('Failed to create file on Drive:', err);
    throw new Error('Gagal membuat file database baru di Google Drive.');
  }

  const createdData = await createRes.json();
  return {
    fileId: createdData.id,
    modifiedTime: createdData.modifiedTime || timestamp,
  };
}
