import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
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


    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        try {
            const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
            const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');

            if (!serviceAccountPath && !projectId) {
                this.logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
                return;
            }

            if (serviceAccountPath) {
                try {
                    const resolvedPath = this.resolveServiceAccountPath(serviceAccountPath);
                    if (!resolvedPath) {
                        this.logger.error(
                            `Failed to locate Firebase service account file. Tried variants of: ${serviceAccountPath}`,
                        );
                        return;
                    }

                    const serviceAccount = require(resolvedPath);
                    this.firebaseApp = admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                    });
                    this.logger.log(`Loaded Firebase credentials from: ${resolvedPath}`);
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

    private resolveServiceAccountPath(serviceAccountPath: string): string | null {
        const distRoot = path.resolve(__dirname, '..', '..');
        const candidates = path.isAbsolute(serviceAccountPath)
            ? [serviceAccountPath]
            : [
                path.resolve(process.cwd(), serviceAccountPath),
                path.join(distRoot, serviceAccountPath),
            ];

        candidates.push(path.join(distRoot, 'service_account.json'));
        candidates.push(path.join(process.cwd(), 'service_account.json'));

        const found = candidates.find((candidate) => fs.existsSync(candidate));
        if (!found) {
            this.logger.error(`Service account file not found. Checked: ${candidates.join(', ')}`);
            return null;
        }

        return found;
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

    // ==================== Firebase Authentication Methods ====================

    /**
     * Verify Firebase ID token
     * @param idToken - Firebase ID token from client
     * @returns Decoded token payload
     */
    async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
        if (!this.firebaseApp) {
            throw new Error('Firebase not initialized');
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            this.logger.log(`Token verified for user: ${decodedToken.uid}`);
            return decodedToken;
        } catch (error) {
            this.logger.error('Failed to verify Firebase ID token', error);
            throw new Error('Invalid Firebase token');
        }
    }

    /**
     * Get user by email from Firebase
     * @param email - User email
     * @returns Firebase user record or null if not found
     */
    async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
        if (!this.firebaseApp) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            return userRecord;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                return null;
            }
            this.logger.error(`Failed to get user by email: ${email}`, error);
            throw error;
        }
    }

    /**
     * Get user by UID from Firebase
     * @param uid - Firebase user ID
     * @returns Firebase user record or null if not found
     */
    async getUserByUid(uid: string): Promise<admin.auth.UserRecord | null> {
        if (!this.firebaseApp) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userRecord = await admin.auth().getUser(uid);
            return userRecord;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                return null;
            }
            this.logger.error(`Failed to get user by UID: ${uid}`, error);
            throw error;
        }
    }

    /**
     * Create a new Firebase user with email and password
     * @param email - User email
     * @param password - User password
     * @param displayName - Optional display name
     * @returns Created Firebase user record
     */
    async createUser(email: string, password: string, displayName?: string): Promise<admin.auth.UserRecord> {
        if (!this.firebaseApp) {
            throw new Error('Firebase not initialized');
        }

        try {
            const userRecord = await admin.auth().createUser({
                email,
                password,
                displayName,
                emailVerified: false,
            });

            this.logger.log(`Created Firebase user: ${userRecord.uid} (${email})`);
            return userRecord;
        } catch (error: any) {
            this.logger.error(`Failed to create Firebase user: ${email}`, error);

            // Provide more specific error messages
            if (error.code === 'auth/email-already-exists') {
                throw new Error('Email already registered');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Invalid email format');
            } else if (error.code === 'auth/invalid-password') {
                throw new Error('Password must be at least 6 characters');
            }

            throw new Error('Failed to create user');
        }
    }

    /**
     * Validate email format and check if it exists in Firebase
     * @param email - Email to validate
     * @returns Validation result with availability status
     */
    async validateEmail(email: string): Promise<{ valid: boolean; exists: boolean; message: string }> {
        if (!this.firebaseApp) {
            return {
                valid: false,
                exists: false,
                message: 'Firebase not initialized',
            };
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                valid: false,
                exists: false,
                message: 'Invalid email format',
            };
        }

        try {
            const user = await this.getUserByEmail(email);

            if (user) {
                return {
                    valid: true,
                    exists: true,
                    message: 'Email already registered',
                };
            }

            return {
                valid: true,
                exists: false,
                message: 'Email is available',
            };
        } catch (error) {
            this.logger.error(`Error validating email: ${email}`, error);
            return {
                valid: true,
                exists: false,
                message: 'Email validation failed, but format is valid',
            };
        }
    }
}
