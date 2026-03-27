import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadMediaDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '待上传的文件，大小限制 15MB。',
  })
  @IsOptional()
  @Allow()
  file!: unknown;

  @ApiPropertyOptional({
    description: '自定义文件名，不需要包含路径，扩展名可选。',
    example: 'my-post-cover',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  filename?: string;
}
