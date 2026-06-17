// src/modules/depenses/dto/update-depense.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateDepenseDto } from './create-depense.dto';

export class UpdateDepenseDto extends PartialType(CreateDepenseDto) {}
