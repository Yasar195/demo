import { Controller, Sse, UseGuards, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

interface MessageEvent {
    data: string | object;
    id?: string;
    type?: string;
    retry?: number;
}

@Controller('sse')
export class SseController {
    constructor(private readonly sseService: SseService) { }

    /**
     * SSE stream endpoint
     * GET /sse/stream
     * 
     * Returns a Server-Sent Events stream for real-time updates.
     * Requires JWT authentication.
     * 
     * @example
     * const eventSource = new EventSource('http://localhost:3000/api/sse/stream', {
     *   withCredentials: true
     * });
     * 
     * eventSource.onmessage = (event) => {
     *   const data = JSON.parse(event.data);
     *   console.log('Received:', data);
     * };
     */
    @Sse('stream')
    @UseGuards(JwtAuthGuard)
    stream(@CurrentUser() user: User, @Req() request: any): Observable<MessageEvent> {
        // Create stream for this user
        const stream = this.sseService.createStream(user.id, user.role);

        // Clean up on connection close
        request.on('close', () => {
            this.sseService.removeClient(user.id);
        });

        return stream;
    }
}
