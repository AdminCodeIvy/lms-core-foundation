import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { JwtUtil } from '../utils/jwt';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export class SocketHandler {
  private io: SocketIOServer;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use((socket: Socket, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = JwtUtil.verifyToken(token);
        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user;
      logger.info(`WebSocket client connected: ${user.userId}`);

      // Join user-specific room
      socket.join(`user:${user.userId}`);

      // Join role-specific room
      socket.join(`role:${user.role}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${user.userId}`);
      });

      // Subscribe to specific entities
      socket.on('subscribe:customers', () => {
        socket.join('customers');
        logger.info(`User ${user.userId} subscribed to customers`);
      });

      socket.on('subscribe:properties', () => {
        socket.join('properties');
        logger.info(`User ${user.userId} subscribed to properties`);
      });

      socket.on('subscribe:tax', () => {
        socket.join('tax');
        logger.info(`User ${user.userId} subscribed to tax`);
      });

      socket.on('subscribe:notifications', () => {
        socket.join(`notifications:${user.userId}`);
        logger.info(`User ${user.userId} subscribed to notifications`);
      });

      // Unsubscribe handlers
      socket.on('unsubscribe:customers', () => {
        socket.leave('customers');
      });

      socket.on('unsubscribe:properties', () => {
        socket.leave('properties');
      });

      socket.on('unsubscribe:tax', () => {
        socket.leave('tax');
      });
    });
  }

  // Emit events to specific rooms
  public emitToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  public emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public emitToRole(role: string, event: string, data: any): void {
    this.io.to(`role:${role}`).emit(event, data);
  }

  // Broadcast to all connected clients
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Singleton instance
let socketHandler: SocketHandler | null = null;

export const initializeSocket = (server: HTTPServer): SocketHandler => {
  if (!socketHandler) {
    socketHandler = new SocketHandler(server);
  }
  return socketHandler;
};

export const getSocketHandler = (): SocketHandler => {
  if (!socketHandler) {
    throw new Error('Socket handler not initialized');
  }
  return socketHandler;
};
