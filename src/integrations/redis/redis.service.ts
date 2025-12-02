import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private publisher: Redis;
    private subscriber: Redis;
    private isConnected = false;

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        try {
            const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

            this.logger.log(`Connecting to Redis at ${redisUrl}`);

            // Create separate connections for pub and sub
            this.publisher = new Redis(redisUrl, {
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
            });

            this.subscriber = new Redis(redisUrl, {
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
            });

            // Handle connection events
            this.publisher.on('connect', () => {
                this.logger.log('Redis publisher connected');
                this.isConnected = true;
            });

            this.publisher.on('error', (error) => {
                this.logger.error('Redis publisher error:', error);
            });

            this.subscriber.on('connect', () => {
                this.logger.log('Redis subscriber connected');
            });

            this.subscriber.on('error', (error) => {
                this.logger.error('Redis subscriber error:', error);
            });

            // Wait for connections
            await Promise.all([
                this.waitForConnection(this.publisher),
                this.waitForConnection(this.subscriber),
            ]);

            this.logger.log('Redis service initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Redis service:', error);
            // Don't throw - allow app to start even if Redis is unavailable
        }
    }

    async onModuleDestroy() {
        this.logger.log('Disconnecting from Redis...');
        await Promise.all([
            this.publisher?.quit(),
            this.subscriber?.quit(),
        ]);
    }

    private waitForConnection(client: Redis): Promise<void> {
        return new Promise((resolve, reject) => {
            if (client.status === 'ready') {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Redis connection timeout'));
            }, 5000);

            client.once('ready', () => {
                clearTimeout(timeout);
                resolve();
            });

            client.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    /**
     * Get publisher client for publishing messages
     */
    getPublisher(): Redis {
        return this.publisher;
    }

    /**
     * Get subscriber client for subscribing to channels
     */
    getSubscriber(): Redis {
        return this.subscriber;
    }

    /**
     * Check if Redis is connected
     */
    isRedisConnected(): boolean {
        return this.isConnected && this.publisher?.status === 'ready';
    }

    /**
     * Publish a message to a channel
     */
    async publish(channel: string, message: string): Promise<number> {
        if (!this.isRedisConnected()) {
            this.logger.warn('Redis not connected, message not published');
            return 0;
        }

        try {
            return await this.publisher.publish(channel, message);
        } catch (error) {
            this.logger.error(`Failed to publish to channel ${channel}:`, error);
            return 0;
        }
    }

    /**
     * Subscribe to a channel
     */
    async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
        if (!this.isRedisConnected()) {
            this.logger.warn('Redis not connected, cannot subscribe');
            return;
        }

        try {
            await this.subscriber.subscribe(channel);

            this.subscriber.on('message', (ch, message) => {
                if (ch === channel) {
                    callback(message);
                }
            });

            this.logger.log(`Subscribed to Redis channel: ${channel}`);
        } catch (error) {
            this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
        }
    }

    /**
     * Unsubscribe from a channel
     */
    async unsubscribe(channel: string): Promise<void> {
        try {
            await this.subscriber.unsubscribe(channel);
            this.logger.log(`Unsubscribed from Redis channel: ${channel}`);
        } catch (error) {
            this.logger.error(`Failed to unsubscribe from channel ${channel}:`, error);
        }
    }

    /**
     * Get value from cache
     */
    async get(key: string): Promise<string | null> {
        if (!this.isRedisConnected()) {
            return null;
        }
        try {
            return await this.publisher.get(key);
        } catch (error) {
            this.logger.error(`Failed to get key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set value in cache with optional TTL
     */
    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (!this.isRedisConnected()) {
            return;
        }
        try {
            if (ttl) {
                await this.publisher.set(key, value, 'EX', ttl);
            } else {
                await this.publisher.set(key, value);
            }
        } catch (error) {
            this.logger.error(`Failed to set key ${key}:`, error);
        }
    }

    /**
     * Delete value from cache
     */
    async del(key: string): Promise<void> {
        if (!this.isRedisConnected()) {
            return;
        }
        try {
            await this.publisher.del(key);
        } catch (error) {
            this.logger.error(`Failed to delete key ${key}:`, error);
        }
    }

    /**
     * Reset keys matching a pattern
     */
    async reset(pattern: string): Promise<void> {
        if (!this.isRedisConnected()) {
            return;
        }
        try {
            const stream = this.publisher.scanStream({
                match: pattern,
                count: 100
            });

            stream.on('data', async (keys: string[]) => {
                if (keys.length) {
                    const pipeline = this.publisher.pipeline();
                    keys.forEach((key) => {
                        pipeline.del(key);
                    });
                    await pipeline.exec();
                }
            });

            stream.on('end', () => {
                this.logger.log(`Reset keys matching pattern: ${pattern}`);
            });
        } catch (error) {
            this.logger.error(`Failed to reset keys with pattern ${pattern}:`, error);
        }
    }
}
