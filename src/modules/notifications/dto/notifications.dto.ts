export interface NotificationDto {
    title: string;
    message: string;
    userIds: string[];
}

export interface NotificationRecipientDto {
    notificationId: string;
    userId: string;
}

export interface MarkAsReadDto {
    notificationIds: string | string[];
}

export interface RegisterDeviceTokenDto {
    token: string;
    platform: 'IOS' | 'ANDROID' | 'WEB';
    deviceId?: string;
}