import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicProgramDto } from './dto/create-program.dto';

@Injectable()
export class AcademicProgramsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAcademicProgramDto) {
    return this.prisma.academicProgram.create({
      data: dto
    });
  }

  update(id: string, dto: Partial<CreateAcademicProgramDto> & { state?: 'ACTIVE' | 'INACTIVE' }) {
    return this.prisma.academicProgram.update({
      where: { id },
      data: dto
    });
  }

  findAll() {
    return this.prisma.academicProgram.findMany({
      include: { 
        institution: true,
        rotationAreas: true
      },
      orderBy: { name: 'asc' }
    });
  }

  findOne(id: string) {
    return this.prisma.academicProgram.findUnique({
      where: { id },
      include: { 
        institution: true,
        rotationAreas: true
      }
    });
  }


  /* 
   * Rotation Areas are now 1:N with Program.
   * Operations like add/remove area are handled directly via RotationAreasService (create/delete).
   */

}
