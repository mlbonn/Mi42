// server/services/fileStorageService.ts
// File Storage Service für E-Mail-Anhänge

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export class FileStorageService {
  private baseDir: string;

  constructor(baseDir: string = '/home/manus02/friday-crm/storage/attachments') {
    this.baseDir = baseDir;
  }

  /**
   * Generiert einen Speicherpfad basierend auf Datum und E-Mail-ID
   * Format: /storage/attachments/YYYY/MM/DD/{archivedEmailId}/{filename}
   */
  generatePath(archivedEmailId: number, filename: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const relativePath = path.join(
      String(year),
      month,
      day,
      String(archivedEmailId),
      filename
    );

    return relativePath;
  }

  /**
   * Gibt den vollständigen absoluten Pfad zurück
   */
  getAbsolutePath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }

  /**
   * Erstellt das Verzeichnis für eine archivierte E-Mail
   */
  async ensureDirectory(archivedEmailId: number): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const dirPath = path.join(this.baseDir, String(year), month, day, String(archivedEmailId));

    await fs.mkdir(dirPath, { recursive: true });

    return dirPath;
  }

  /**
   * Prüft ob eine Datei existiert
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const absolutePath = this.getAbsolutePath(relativePath);
    return existsSync(absolutePath);
  }

  /**
   * Löscht eine Datei
   */
  async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);
    await fs.unlink(absolutePath);
  }

  /**
   * Löscht alle Dateien einer archivierten E-Mail
   */
  async deleteEmailAttachments(archivedEmailId: number): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const dirPath = path.join(this.baseDir, String(year), month, day, String(archivedEmailId));

    if (existsSync(dirPath)) {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * Gibt die Dateigröße zurück
   */
  async getFileSize(relativePath: string): Promise<number> {
    const absolutePath = this.getAbsolutePath(relativePath);
    const stats = await fs.stat(absolutePath);
    return stats.size;
  }

  /**
   * Bereinigt alte Dateien (älter als X Tage)
   */
  async cleanupOldFiles(daysOld: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    // Durchsuche alle Jahre
    const years = await fs.readdir(this.baseDir);

    for (const year of years) {
      const yearPath = path.join(this.baseDir, year);
      const yearStat = await fs.stat(yearPath);

      if (!yearStat.isDirectory()) continue;

      // Durchsuche alle Monate
      const months = await fs.readdir(yearPath);

      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const monthStat = await fs.stat(monthPath);

        if (!monthStat.isDirectory()) continue;

        // Durchsuche alle Tage
        const days = await fs.readdir(monthPath);

        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          const dayStat = await fs.stat(dayPath);

          if (!dayStat.isDirectory()) continue;

          // Prüfe Datum
          const folderDate = new Date(`${year}-${month}-${day}`);

          if (folderDate < cutoffDate) {
            await fs.rm(dayPath, { recursive: true, force: true });
            deletedCount++;
          }
        }
      }
    }

    return deletedCount;
  }

  /**
   * Gibt die Gesamtgröße aller Attachments zurück
   */
  async getTotalSize(): Promise<number> {
    let totalSize = 0;

    const calculateSize = async (dirPath: string): Promise<number> => {
      let size = 0;
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          size += await calculateSize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        }
      }

      return size;
    };

    if (existsSync(this.baseDir)) {
      totalSize = await calculateSize(this.baseDir);
    }

    return totalSize;
  }

  /**
   * Formatiert Bytes in lesbare Größe
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
