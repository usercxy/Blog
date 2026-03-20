import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ProjectQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
