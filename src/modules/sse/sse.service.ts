import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UserRole } from '@prisma/client';
import { SSEEvent, SSEEventType, SSEClient, MessageEvent } from './types/sse-event.types';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../integrations/redis';

@Injectable()
export class SseService implements OnModuleInit {
    private readonly logger = new Logger(SseService.name);
    private readonly eventSubject = new Subject<SSEEvent>();
    private readonly clients = new Map<string, SSEClient>();
    private readonly heartbeatInterval = 30000; // 30 seconds
    private readonly REDIS_CHANNEL = 'sse:events';
    private readonly instanceId = uuidv4(); // Unique ID for this instance

    constructor(private readonly redisService: RedisService) { }

    async onModuleInit() {
        // Start heartbeat
        this.startHeartbeat();

        // Subscribe to Redis channel for events from other instances
        if (this.redisService.isRedisConnected()) {
            await this.redisService.subscribe(this.REDIS_CHANNEL, (message) => {
                try {
                    const event = JSON.parse(message);

                    // Ignore events from this instance (already handled locally)
                    if (event.instanceId === this.instanceId) {
                        return;
                    }

                    this.logger.debug(`Received event from another instance: ${event.type}`);
                    // Broadcast to local clients only
                    this.eventSubject.next(event);
                } catch (error) {
                    this.logger.error('Failed to parse Redis message:', error);
                }
            });

            this.logger.log(`SSE service subscribed to Redis channel: ${this.REDIS_CHANNEL}`);
        } else {
            this.logger.warn('Redis not available - SSE will work in single-instance mode only');
        }
    }

    /**
     * Create a new SSE stream for a user
     */
    createStream(userId: string, role: UserRole): Observable<MessageEvent> {
        this.logger.log(`Creating SSE stream for user ${userId} with role ${role} on instance ${this.instanceId}`);

        // Track the client
        this.clients.set(userId, {
            userId,
            role,
            lastActivity: Date.now(),
        });

        // Return filtered observable
        return this.eventSubject.pipe(
            filter(event => this.shouldSendToUser(event, userId, role)),
            map(event => this.formatEvent(event))
        );
    }

    /**
     * Remove client on disconnect
     */
    removeClient(userId: string): void {
        this.clients.delete(userId);
        this.logger.log(`Client disconnected: ${userId}. Active clients on this instance: ${this.clients.size}`);
    }

    /**
     * Send event to a specific user
     */
    sendToUser(userId: string, type: SSEEventType, data: any): void {
        const event: SSEEvent = {
            id: uuidv4(),
            type,
            timestamp: Date.now(),
            data,
            userId,
            instanceId: this.instanceId,
        };

        this.logger.debug(`Sending ${type} event to user ${userId}`);

        // Send to local clients
        this.eventSubject.next(event);

        // Publish to Redis for other instances
        this.publishToRedis(event);
    }

    /**
     * Send event to all users with a specific role
     */
    sendToRole(role: UserRole, type: SSEEventType, data: any): void {
        const event: SSEEvent = {
            id: uuidv4(),
            type,
            timestamp: Date.now(),
            data,
            role,
            instanceId: this.instanceId,
        };

        this.logger.debug(`Sending ${type} event to role ${role}`);

        // Send to local clients
        this.eventSubject.next(event);

        // Publish to Redis for other instances
        this.publishToRedis(event);
    }

    /**
     * Broadcast event to all connected clients
     */
    broadcast(type: SSEEventType, data: any): void {
        const event: SSEEvent = {
            id: uuidv4(),
            type,
            timestamp: Date.now(),
            data,
            instanceId: this.instanceId,
        };

        this.logger.debug(`Broadcasting ${type} event to all clients`);

        // Send to local clients
        this.eventSubject.next(event);

        // Publish to Redis for other instances (except heartbeat to reduce traffic)
        if (type !== 'heartbeat') {
            this.publishToRedis(event);
        }
    }

    /**
     * Get count of active connections on this instance
     */
    getActiveConnectionsCount(): number {
        return this.clients.size;
    }

    /**
     * Get active connections by role on this instance
     */
    getActiveConnectionsByRole(role: UserRole): number {
        return Array.from(this.clients.values()).filter(client => client.role === role).length;
    }

    /**
     * Publish event to Redis for distribution to other instances
     */
    private publishToRedis(event: SSEEvent): void {
        if (!this.redisService.isRedisConnected()) {
            return; // Silently skip if Redis is not available
        }

        try {
            const message = JSON.stringify(event);
            this.redisService.publish(this.REDIS_CHANNEL, message);
        } catch (error) {
            this.logger.error('Failed to publish event to Redis:', error);
        }
    }

    /**
     * Determine if event should be sent to a specific user
     */
    private shouldSendToUser(event: SSEEvent, userId: string, userRole: UserRole): boolean {
        // Heartbeat events go to everyone
        if (event.type === 'heartbeat') {
            return true;
        }

        // User-specific events
        if (event.userId && event.userId === userId) {
            return true;
        }

        // Role-specific events
        if (event.role && event.role === userRole) {
            return true;
        }

        // Broadcast events (no userId or role specified)
        if (!event.userId && !event.role) {
            return true;
        }

        return false;
    }

    /**
     * Format event for SSE
     */
    private formatEvent(event: SSEEvent): MessageEvent {
        return {
            id: event.id,
            type: event.type,
            data: JSON.stringify({
                type: event.type,
                timestamp: event.timestamp,
                data: event.data,
            }),
            retry: 10000, // Retry after 10 seconds on disconnect
        };
    }

    /**
     * Send periodic heartbeat to keep connections alive
     */
    private startHeartbeat(): void {
        interval(this.heartbeatInterval).subscribe(() => {
            const activeCount = this.clients.size;
            if (activeCount > 0) {
                this.logger.debug(`Sending heartbeat to ${activeCount} clients on instance ${this.instanceId}`);
                this.broadcast('heartbeat', { timestamp: Date.now(), instanceId: this.instanceId });
            }
        });
    }
}
