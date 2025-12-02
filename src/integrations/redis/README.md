# Redis Configuration

## Required Environment Variables

Add the following to your `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# For Redis with password
# REDIS_URL=redis://:password@localhost:6379

# For Redis Cluster/Cloud (e.g., AWS ElastiCache, Redis Cloud)
# REDIS_URL=redis://username:password@host:port
```

## Local Development

### Using Docker

```bash
# Start Redis using Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Stop Redis
docker stop redis

# Remove Redis container
docker rm redis
```

### Using Docker Compose

Add to your `docker-compose.yml`:

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

Then run:
```bash
docker-compose up -d redis
```

## Production Deployment

### Managed Redis Services

1. **AWS ElastiCache**
   ```env
   REDIS_URL=redis://your-elasticache-endpoint:6379
   ```

2. **Redis Cloud**
   ```env
   REDIS_URL=redis://default:password@redis-endpoint.cloud.redislabs.com:port
   ```

3. **Google Cloud Memorystore**
   ```env
   REDIS_URL=redis://10.x.x.x:6379
   ```

4. **Azure Cache for Redis**
   ```env
   REDIS_URL=redis://:password@your-cache.redis.cache.windows.net:6380
   ```

## How It Works

### SSE Multi-Instance Architecture

```
┌─────────────┐
│   Client 1  │─────┐
└─────────────┘     │
                    ├──► Instance A ──┐
┌─────────────┐     │                 │
│   Client 2  │─────┘                 │
└─────────────┘                       │
                                      ▼
┌─────────────┐                  ┌─────────┐
│   Client 3  │─────┐            │  Redis  │
└─────────────┘     │            │ Pub/Sub │
                    ├──► Instance B ──┤
┌─────────────┐     │                 │
│   Client 4  │─────┘                 │
└─────────────┘                       │
                                      ▲
┌─────────────┐                       │
│   Client 5  │────► Instance C ──────┘
└─────────────┘
```

**Event Flow:**
1. User action triggers notification on Instance B
2. Instance B sends event to local Client 3
3. Instance B publishes event to Redis
4. Redis broadcasts to all instances (A, B, C)
5. Each instance forwards to its connected clients
6. Result: All clients receive the event regardless of which instance they're connected to

## Graceful Degradation

The system gracefully handles Redis unavailability:
- If Redis is not configured, SSE works in **single-instance mode**
- No crashes or errors
- Warning logged: `"Redis not available - SSE will work in single-instance mode only"`
- Perfect for development without Redis

## Monitoring

Check Redis connection status:
```typescript
// In any service
constructor(private readonly redisService: RedisService) {}

checkRedis() {
  const isConnected = this.redisService.isRedisConnected();
  console.log('Redis connected:', isConnected);
}
```

## Testing Multi-Instance Setup

1. Start Redis:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. Start multiple instances:
   ```bash
   # Terminal 1
   PORT=3000 npm run start:dev

   # Terminal 2
   PORT=3001 npm run start:dev

   # Terminal 3
   PORT=3002 npm run start:dev
   ```

3. Connect clients to different instances and test cross-instance messaging!
