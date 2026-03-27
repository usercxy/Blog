import { Injectable } from '@nestjs/common';
import { MediaStorage, type MediaFile } from '@prisma/client';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CosStorageService } from './cos-storage.service';
import { UploadMediaDto } from './dto/upload-media.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cosStorageService: CosStorageService,
  ) {}

  async list(query: PaginationQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prismaService.mediaFile.findMany({
        skip,
        take: query.pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prismaService.mediaFile.count(),
    ]);

    return {
      items: items.map((item) => this.toMediaResponse(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async upload(file: Express.Multer.File, dto: UploadMediaDto, userId: string) {
    const uploadedFile = await this.cosStorageService.uploadFile(file, dto, userId);
    const mediaFile = await this.prismaService.mediaFile.create({
      data: {
        filename: uploadedFile.filename,
        originalName: file.originalname,
        mimeType: uploadedFile.mimeType,
        storage: MediaStorage.COS,
        path: uploadedFile.key,
        size: file.size,
      },
    });

    return this.toMediaResponse(mediaFile);
  }

  private toMediaResponse(mediaFile: MediaFile) {
    return {
      ...mediaFile,
      url: this.resolveMediaUrl(mediaFile),
    };
  }

  private resolveMediaUrl(mediaFile: MediaFile) {
    if (/^https?:\/\//i.test(mediaFile.path)) {
      return mediaFile.path;
    }

    if (mediaFile.storage === MediaStorage.COS) {
      return this.cosStorageService.getPublicUrl(mediaFile.path);
    }

    return mediaFile.path;
  }
}
