import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UserRole } from '@prisma/client';
import { SSEEvent, SSEEventType, SSEClient } from './types/sse-event.types';
import { v4 as uuidv4 } from 'uuid';

interface MessageEvent {
    data: string | object;
    id?: string;
    type?: string;
    retry?: number;
}

@Injectable()
export class SseService {
    private readonly logger = new Logger(SseService.name);
    private readonly eventSubject = new Subject<SSEEvent>();
    private readonly clients = new Map<string, SSEClient>();
    private readonly heartbeatInterval = 30000; // 30 seconds

    constructor() {
        // Start heartbeat
        this.startHeartbeat();
    }

    /**
     * Create a new SSE stream for a user
     */
    createStream(userId: string, role: UserRole): Observable<MessageEvent> {
        this.logger.log(`Creating SSE stream for user ${userId} with role ${role}`);

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
        this.logger.log(`Client disconnected: ${userId}. Active clients: ${this.clients.size}`);
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
        };

        this.logger.debug(`Sending ${type} event to user ${userId}`);
        this.eventSubject.next(event);
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
        };

        this.logger.debug(`Sending ${type} event to role ${role}`);
        this.eventSubject.next(event);
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
        };

        this.logger.debug(`Broadcasting ${type} event to all clients`);
        this.eventSubject.next(event);
    }

    /**
     * Get count of active connections
     */
    getActiveConnectionsCount(): number {
        return this.clients.size;
    }

    /**
     * Get active connections by role
     */
    getActiveConnectionsByRole(role: UserRole): number {
        return Array.from(this.clients.values()).filter(client => client.role === role).length;
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
                this.logger.debug(`Sending heartbeat to ${activeCount} clients`);
                this.broadcast('heartbeat', { timestamp: Date.now() });
            }
        });
    }
}
