import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import COS = require('cos-nodejs-sdk-v5');
import { basename, extname, posix } from 'path';

import { DEFAULT_COS_PATH_PREFIX } from './media.constants';
import { UploadMediaDto } from './dto/upload-media.dto';

@Injectable()
export class CosStorageService {
  private readonly client: COS;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl: string;
  private readonly pathPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('COS_BUCKET');
    this.region = this.configService.getOrThrow<string>('COS_REGION');
    this.publicBaseUrl = this.normalizeBaseUrl(
      this.configService.getOrThrow<string>('COS_PUBLIC_BASE_URL'),
    );
    this.pathPrefix = this.normalizePrefix(
      this.configService.get<string>('COS_PATH_PREFIX') ?? DEFAULT_COS_PATH_PREFIX,
    );

    this.client = new COS({
      SecretId: this.configService.getOrThrow<string>('COS_SECRET_ID'),
      SecretKey: this.configService.getOrThrow<string>('COS_SECRET_KEY'),
    });
  }

  async uploadFile(file: Express.Multer.File, dto: UploadMediaDto, userId: string) {
    const key = this.buildObjectKey(file, dto, userId);
    const mimeType = file.mimetype || 'application/octet-stream';

    await this.client.putObject({
      Bucket: this.bucket,
      Region: this.region,
      Key: key,
      Body: file.buffer,
      ContentLength: file.size,
      ContentType: mimeType,
    });

    return {
      key,
      url: this.getPublicUrl(key),
      filename: posix.basename(key),
      mimeType,
    };
  }

  getPublicUrl(path: string) {
    if (this.isAbsoluteUrl(path)) {
      return path;
    }

    const normalizedPath = path.replace(/^\/+/, '');
    return `${this.publicBaseUrl}/${normalizedPath}`;
  }

  private buildObjectKey(file: Express.Multer.File, dto: UploadMediaDto, userId: string) {
    const directory = this.normalizePrefix(userId);
    const requestedName = dto.filename?.trim();
    const originalExtension = extname(file.originalname || '').toLowerCase();
    const requestedExtension = extname(requestedName ?? '').toLowerCase();
    const extension = requestedExtension || originalExtension;
    const nameSource =
      basename(requestedName ?? file.originalname ?? 'file', requestedExtension || originalExtension) ||
      'file';
    const safeName = this.sanitizeSegment(nameSource);

    return [this.pathPrefix, directory, `${safeName}-${randomUUID()}${extension}`]
      .filter(Boolean)
      .join('/');
  }

  private normalizeBaseUrl(value: string) {
    return value.replace(/\/+$/, '');
  }

  private normalizePrefix(value: string) {
    return value
      .replace(/\\/g, '/')
      .split('/')
      .map((segment) => this.sanitizeSegment(segment))
      .filter(Boolean)
      .join('/');
  }

  private sanitizeSegment(value: string) {
    return value
      .trim()
      .replace(/\.+/g, '-')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private isAbsoluteUrl(value: string) {
    return /^https?:\/\//i.test(value);
  }
}
