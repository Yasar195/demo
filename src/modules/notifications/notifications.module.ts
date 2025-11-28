import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./repositories/notifications.repository";
import { DeviceTokenRepository } from "./repositories/device-token.repository";
import { FirebaseModule } from "src/integrations/firebase";
import { SseModule } from "../sse/sse.module";

@Module({
    imports: [FirebaseModule, SseModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsRepository, DeviceTokenRepository],
    exports: [NotificationsService]
})

export class NotificationsModule { }