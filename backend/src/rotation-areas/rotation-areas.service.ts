import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRotationAreaDto } from './dto/create-rotation-area.dto';

@Injectable()
export class RotationAreasService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRotationAreaDto) {
    const data: any = {
      name: dto.name,
      description: dto.description,
      durationWeeks: dto.durationWeeks || 0,
      maxStudents: dto.maxStudents || 0,
      programId: dto.programId,
      serviceIds: dto.serviceIds || []
    };

    return this.prisma.rotationArea.create({ data });
  }

  findAll() {
    return this.prisma.rotationArea.findMany({
      include: {
        program: true
      }
    });
  }

  findOne(id: string) {
    return this.prisma.rotationArea.findUnique({
      where: { id },
      include: { program: true }
    });
  }

  update(id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.serviceIds) data.serviceIds = dto.serviceIds;
    return this.prisma.rotationArea.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.rotationArea.delete({
      where: { id }
    });
  }
}
