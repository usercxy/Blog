import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { MEDIA_MAX_FILE_SIZE_BYTES, MEDIA_MAX_FILE_SIZE_MB } from './media.constants';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaService } from './media.service';

@ApiTags('admin')
@UseGuards(AdminAuthGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.mediaService.list(query);
  }

  @ApiOperation({
    summary: '上传媒体文件到腾讯云 COS',
  })
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MEDIA_MAX_FILE_SIZE_BYTES,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UploadMediaDto,
  })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('请通过 multipart/form-data 上传 file 字段');
    }

    if (!user?.id) {
      throw new BadRequestException('当前登录用户信息缺失，无法确定上传目录');
    }

    if (!file.buffer || file.size <= 0) {
      throw new BadRequestException('上传文件不能为空');
    }

    if (file.size > MEDIA_MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`上传文件大小不能超过 ${MEDIA_MAX_FILE_SIZE_MB}MB`);
    }

    return this.mediaService.upload(file, dto, user.id);
  }
}
