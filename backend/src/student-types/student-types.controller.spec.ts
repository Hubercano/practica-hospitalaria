import { Test, TestingModule } from '@nestjs/testing';
import { StudentTypesController } from './student-types.controller';

describe('StudentTypesController', () => {
  let controller: StudentTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentTypesController],
    }).compile();

    controller = module.get<StudentTypesController>(StudentTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
