import type { KindleNotesDatabase } from './database';
import type { Upload, UploadStatus } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';
import { validateUpload } from '../utils/validation';

export class UploadsStorage {
    constructor(private db: KindleNotesDatabase) { }

    async create(data: Omit<Upload, 'id' | 'createdAt' | 'updatedAt'>): Promise<Upload> {
        // Validate input data
        const validation = validateUpload(data);
        if (!validation.isValid) {
            throw new ValidationError('Invalid upload data', validation.errors);
        }

        const now = new Date();
        const upload: Upload = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: now,
            updatedAt: now
        };

        try {
            await this.db.uploads.add(upload);
            return upload;
        } catch (error) {
            throw new Error(`Failed to create upload record: ${error}`);
        }
    }

    async findById(id: string): Promise<Upload | undefined> {
        try {
            return await this.db.uploads.get(id);
        } catch (error) {
            throw new Error(`Failed to find upload: ${error}`);
        }
    }

    async findAll(): Promise<Upload[]> {
        try {
            return await this.db.uploads.orderBy('createdAt').reverse().toArray();
        } catch (error) {
            throw new Error(`Failed to fetch uploads: ${error}`);
        }
    }

    async findByStatus(status: Upload['status']): Promise<Upload[]> {
        try {
            return await this.db.uploads
                .where('status')
                .equals(status)
                .sortBy('createdAt');
        } catch (error) {
            throw new Error(`Failed to find uploads by status: ${error}`);
        }
    }

    async findRecent(limit: number = 10): Promise<Upload[]> {
        try {
            return await this.db.uploads
                .orderBy('createdAt')
                .reverse()
                .limit(limit)
                .toArray();
        } catch (error) {
            throw new Error(`Failed to get recent uploads: ${error}`);
        }
    }

    async updateProgress(id: string, processedEntries: number): Promise<Upload> {
        const upload = await this.findById(id);
        if (!upload) {
            throw new NotFoundError('Upload not found');
        }

        const updatedUpload: Upload = {
            ...upload,
            processedEntries,
            updatedAt: new Date()
        };

        try {
            await this.db.uploads.put(updatedUpload);
            return updatedUpload;
        } catch (error) {
            throw new Error(`Failed to update upload progress: ${error}`);
        }
    }

    async markComplete(id: string, result: UploadResult): Promise<Upload> {
        const upload = await this.findById(id);
        if (!upload) {
            throw new NotFoundError('Upload not found');
        }

        const updatedUpload: Upload = {
            ...upload,
            status: 'completed',
            processedEntries: upload.totalEntries,
            result,
            updatedAt: new Date()
        };

        try {
            await this.db.uploads.put(updatedUpload);
            return updatedUpload;
        } catch (error) {
            throw new Error(`Failed to mark upload as complete: ${error}`);
        }
    }

    async markFailed(id: string, errorMessage: string): Promise<Upload> {
        const upload = await this.findById(id);
        if (!upload) {
            throw new NotFoundError('Upload not found');
        }

        const updatedUpload: Upload = {
            ...upload,
            status: 'failed',
            errorMessage,
            updatedAt: new Date()
        };

        try {
            await this.db.uploads.put(updatedUpload);
            return updatedUpload;
        } catch (error) {
            throw new Error(`Failed to mark upload as failed: ${error}`);
        }
    }

    async delete(id: string): Promise<void> {
        const upload = await this.findById(id);
        if (!upload) {
            throw new NotFoundError('Upload not found');
        }

        try {
            await this.db.uploads.delete(id);
        } catch (error) {
            throw new Error(`Failed to delete upload: ${error}`);
        }
    }

    async getStatistics(): Promise<{
        totalUploads: number;
        successfulUploads: number;
        failedUploads: number;
        totalFilesProcessed: number;
        totalBooksCreated: number;
        totalNotesCreated: number;
        averageProcessingTime: number;
    }> {
        try {
            const allUploads = await this.findAll();
            const totalUploads = allUploads.length;

            const successful = allUploads.filter(upload => upload.status === 'completed');
            const failed = allUploads.filter(upload => upload.status === 'failed');

            const successfulUploads = successful.length;
            const failedUploads = failed.length;

            const totalFilesProcessed = successful.length;
            const totalBooksCreated = successful.reduce((sum, upload) => sum + (upload.result?.booksCreated || 0), 0);
            const totalNotesCreated = successful.reduce((sum, upload) => sum + (upload.result?.notesCreated || 0), 0);

            // Calculate average processing time for completed uploads
            const processingTimes = successful
                .map(upload => upload.updatedAt.getTime() - upload.createdAt.getTime())
                .filter(time => time > 0);

            const averageProcessingTime = processingTimes.length > 0
                ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
                : 0;

            return {
                totalUploads,
                successfulUploads,
                failedUploads,
                totalFilesProcessed,
                totalBooksCreated,
                totalNotesCreated,
                averageProcessingTime: Math.round(averageProcessingTime / 1000) // Convert to seconds
            };
        } catch (error) {
            throw new Error(`Failed to get upload statistics: ${error}`);
        }
    }

    async cleanupOldUploads(daysOld: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const oldUploads = await this.db.uploads
                .where('createdAt')
                .below(cutoffDate)
                .and(upload => upload.status !== 'processing') // Don't delete active uploads
                .toArray();

            if (oldUploads.length > 0) {
                await this.db.uploads.bulkDelete(oldUploads.map(upload => upload.id));
            }

            return oldUploads.length;
        } catch (error) {
            throw new Error(`Failed to cleanup old uploads: ${error}`);
        }
    }

    async findByDateRange(startDate: Date, endDate: Date): Promise<Upload[]> {
        try {
            return await this.db.uploads
                .where('createdAt')
                .between(startDate, endDate, true, true)
                .sortBy('createdAt');
        } catch (error) {
            throw new Error(`Failed to find uploads by date range: ${error}`);
        }
    }

    async getTotalFileSize(): Promise<number> {
        try {
            const allUploads = await this.findAll();
            return allUploads.reduce((total, upload) => total + upload.fileSize, 0);
        } catch (error) {
            throw new Error(`Failed to calculate total file size: ${error}`);
        }
    }

    async getProcessingQueue(): Promise<Upload[]> {
        try {
            return await this.db.uploads
                .where('status')
                .equals('processing')
                .sortBy('createdAt');
        } catch (error) {
            throw new Error(`Failed to get processing queue: ${error}`);
        }
    }

    async retryFailedUpload(id: string): Promise<Upload> {
        const upload = await this.findById(id);
        if (!upload) {
            throw new NotFoundError('Upload not found');
        }

        if (upload.status !== 'failed') {
            throw new ValidationError('Only failed uploads can be retried');
        }

        const retryUpload: Upload = {
            ...upload,
            status: 'processing',
            processedEntries: 0,
            errorMessage: undefined,
            result: undefined,
            updatedAt: new Date()
        };

        try {
            await this.db.uploads.put(retryUpload);
            return retryUpload;
        } catch (error) {
            throw new Error(`Failed to retry upload: ${error}`);
        }
    }
}