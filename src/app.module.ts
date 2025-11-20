import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonsModule } from './commons/commons.module';
import { IamModule } from './iam/iam.module';
import { ValidatorsModule } from './validators/validators.module';

@Module({
  imports: [CommonsModule, IamModule, ValidatorsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
