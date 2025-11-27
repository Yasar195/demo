import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./repositories/notifications.repository";
import { DeviceTokenRepository } from "./repositories/device-token.repository";
import { FirebaseModule } from "src/integrations/firebase";

@Module({
    imports: [FirebaseModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsRepository, DeviceTokenRepository],
    exports: [NotificationsService]
})

export class NotificationsModule { }