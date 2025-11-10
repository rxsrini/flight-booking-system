import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WebSocketEvent } from '@shared/types';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      // Store userId in socket data
      client.data.userId = userId;

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);
      this.logger.log(`Active connections: ${this.server.sockets.sockets.size}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Successfully connected to booking service',
        userId,
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      sockets.delete(client.id);

      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} disconnected`);
    this.logger.log(`Active connections: ${this.server.sockets.sockets.size}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: { rooms: string[] }, @ConnectedSocket() client: Socket) {
    data.rooms.forEach(room => {
      client.join(room);
      this.logger.log(`Client ${client.id} subscribed to room: ${room}`);
    });

    return { event: 'subscribed', data: { rooms: data.rooms } };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@MessageBody() data: { rooms: string[] }, @ConnectedSocket() client: Socket) {
    data.rooms.forEach(room => {
      client.leave(room);
      this.logger.log(`Client ${client.id} unsubscribed from room: ${room}`);
    });

    return { event: 'unsubscribed', data: { rooms: data.rooms } };
  }

  // Event Handlers for Booking Events

  @OnEvent('booking.created')
  handleBookingCreated(data: any) {
    this.logger.log(`Broadcasting booking created: ${data.booking.pnr}`);

    const message = {
      event: WebSocketEvent.BOOKING_CREATED,
      data: {
        bookingId: data.booking.id,
        pnr: data.booking.pnr,
        status: data.booking.status,
        flightNumber: data.flight.flightNumber,
        origin: data.flight.originAirport.code,
        destination: data.flight.destinationAirport.code,
        totalPrice: data.booking.totalPrice,
        currency: data.booking.currency,
        passengerCount: data.passengers.length,
      },
      timestamp: new Date(),
    };

    // Send to specific user
    this.server.to(`user:${data.userId}`).emit('booking:created', message);

    // Also send to admin room
    this.server.to('admin').emit('booking:created', message);
  }

  @OnEvent('booking.confirmed')
  handleBookingConfirmed(data: any) {
    this.logger.log(`Broadcasting booking confirmed: ${data.booking.pnr}`);

    const message = {
      event: WebSocketEvent.BOOKING_UPDATED,
      data: {
        bookingId: data.booking.id,
        pnr: data.booking.pnr,
        status: data.booking.status,
        confirmedAt: data.booking.confirmedAt,
      },
      timestamp: new Date(),
    };

    this.server.to(`user:${data.userId}`).emit('booking:confirmed', message);
    this.server.to('admin').emit('booking:confirmed', message);
  }

  @OnEvent('booking.cancelled')
  handleBookingCancelled(data: any) {
    this.logger.log(`Broadcasting booking cancelled: ${data.booking.pnr}`);

    const message = {
      event: WebSocketEvent.BOOKING_CANCELLED,
      data: {
        bookingId: data.booking.id,
        pnr: data.booking.pnr,
        status: data.booking.status,
        cancelledAt: data.booking.cancelledAt,
      },
      timestamp: new Date(),
    };

    this.server.to(`user:${data.userId}`).emit('booking:cancelled', message);
    this.server.to('admin').emit('booking:cancelled', message);
  }

  @OnEvent('booking.updated')
  handleBookingUpdated(data: any) {
    this.logger.log(`Broadcasting booking updated: ${data.booking.pnr}`);

    const message = {
      event: WebSocketEvent.BOOKING_UPDATED,
      data: {
        bookingId: data.booking.id,
        pnr: data.booking.pnr,
        status: data.booking.status,
        updatedAt: data.booking.updatedAt,
      },
      timestamp: new Date(),
    };

    this.server.to(`user:${data.userId}`).emit('booking:updated', message);
  }

  @OnEvent('flight.status.changed')
  handleFlightStatusChanged(data: any) {
    this.logger.log(`Broadcasting flight status changed: ${data.flightNumber}`);

    const message = {
      event: WebSocketEvent.FLIGHT_STATUS_CHANGED,
      data: {
        flightId: data.flightId,
        flightNumber: data.flightNumber,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        affectedBookings: data.affectedBookings || [],
      },
      timestamp: new Date(),
    };

    // Broadcast to all affected users
    if (data.affectedUsers && Array.isArray(data.affectedUsers)) {
      data.affectedUsers.forEach((userId: string) => {
        this.server.to(`user:${userId}`).emit('flight:status-changed', message);
      });
    }

    // Broadcast to admin room
    this.server.to('admin').emit('flight:status-changed', message);
  }

  @OnEvent('payment.completed')
  handlePaymentCompleted(data: any) {
    this.logger.log(`Broadcasting payment completed for booking: ${data.bookingId}`);

    const message = {
      event: WebSocketEvent.PAYMENT_COMPLETED,
      data: {
        bookingId: data.bookingId,
        paymentId: data.paymentId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
      },
      timestamp: new Date(),
    };

    this.server.to(`user:${data.userId}`).emit('payment:completed', message);
  }

  // Utility method to send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      data,
      timestamp: new Date(),
    });
  }

  // Utility method to broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.server.emit(event, {
      data,
      timestamp: new Date(),
    });
  }

  // Get active connections count
  getActiveConnections(): number {
    return this.server.sockets.sockets.size;
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }
}
