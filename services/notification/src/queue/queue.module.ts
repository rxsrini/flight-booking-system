import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailModule } from '../email/email.module';
import { NotificationQueueService } from './queue.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationController } from './notification.controller';

export const NOTIFICATION_QUEUE = 'notifications';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    EmailModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationQueueService, NotificationProcessor],
  exports: [NotificationQueueService],
})
export class QueueModule {}
