import { Test, TestingModule } from '@nestjs/testing';
import { StudentTypesService } from './student-types.service';

describe('StudentTypesService', () => {
  let service: StudentTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentTypesService],
    }).compile();

    service = module.get<StudentTypesService>(StudentTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
