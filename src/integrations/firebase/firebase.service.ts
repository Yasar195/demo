import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';

export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private firebaseApp: admin.app.App;

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        try {
            const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
            const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');

            if (!serviceAccountPath && !projectId) {
                this.logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
                return;
            }

            if (serviceAccountPath) {
                try {
                    const absolutePath = path.isAbsolute(serviceAccountPath)
                        ? serviceAccountPath
                        : path.join(process.cwd(), serviceAccountPath);

                    const serviceAccount = require(absolutePath);
                    this.firebaseApp = admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                    });
                    this.logger.log(`Loaded Firebase credentials from: ${absolutePath}`);
                } catch (error) {
                    this.logger.error('Failed to load Firebase service account file', error);
                    this.logger.error(`Ensure the file exists at: ${serviceAccountPath}`);
                    return;
                }
            } else {
                this.firebaseApp = admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                });
                this.logger.log('Using Firebase default application credentials');
            }

            this.logger.log('Firebase Admin SDK initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Firebase Admin SDK', error);
        }
    }

    /**
     * Send push notification to a single device
     */
    async sendToDevice(token: string, payload: PushNotificationPayload): Promise<boolean> {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized. Skipping push notification.');
            return false;
        }

        try {
            const message: admin.messaging.Message = {
                token,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'default',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            };

            const response = await admin.messaging().send(message);
            this.logger.log(`Push notification sent successfully: ${response}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send push notification to token: ${token}`, error);

            // Check if token is invalid and should be removed
            if (this.isTokenInvalid(error)) {
                this.logger.warn(`Invalid token detected: ${token}`);
                return false;
            }

            throw error;
        }
    }

    /**
     * Send push notification to multiple devices
     */
    async sendToMultipleDevices(
        tokens: string[],
        payload: PushNotificationPayload,
    ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized. Skipping push notifications.');
            return { successCount: 0, failureCount: 0, invalidTokens: [] };
        }

        if (tokens.length === 0) {
            return { successCount: 0, failureCount: 0, invalidTokens: [] };
        }

        try {
            const message: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'default',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            // Collect invalid tokens
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success && this.isTokenInvalid(resp.error)) {
                    invalidTokens.push(tokens[idx]);
                }
            });

            this.logger.log(
                `Multicast notification sent: ${response.successCount} successful, ${response.failureCount} failed`,
            );

            return {
                successCount: response.successCount,
                failureCount: response.failureCount,
                invalidTokens,
            };
        } catch (error) {
            this.logger.error('Failed to send multicast push notifications', error);
            throw error;
        }
    }

    /**
     * Send notification to a topic
     */
    async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<boolean> {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized. Skipping push notification.');
            return false;
        }

        try {
            const message: admin.messaging.Message = {
                topic,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
            };

            const response = await admin.messaging().send(message);
            this.logger.log(`Push notification sent to topic "${topic}": ${response}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send push notification to topic: ${topic}`, error);
            throw error;
        }
    }

    /**
     * Subscribe tokens to a topic
     */
    async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized. Cannot subscribe to topic.');
            return;
        }

        try {
            const response = await admin.messaging().subscribeToTopic(tokens, topic);
            this.logger.log(
                `Subscribed to topic "${topic}": ${response.successCount} successful, ${response.failureCount} failed`,
            );
        } catch (error) {
            this.logger.error(`Failed to subscribe to topic: ${topic}`, error);
            throw error;
        }
    }

    /**
     * Unsubscribe tokens from a topic
     */
    async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized. Cannot unsubscribe from topic.');
            return;
        }

        try {
            const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
            this.logger.log(
                `Unsubscribed from topic "${topic}": ${response.successCount} successful, ${response.failureCount} failed`,
            );
        } catch (error) {
            this.logger.error(`Failed to unsubscribe from topic: ${topic}`, error);
            throw error;
        }
    }

    /**
     * Check if error indicates invalid token
     */
    private isTokenInvalid(error: any): boolean {
        if (!error) return false;

        const invalidErrorCodes = [
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered',
            'messaging/invalid-argument',
        ];

        return invalidErrorCodes.includes(error?.code);
    }
}
