# WebSocket Real-time Updates Guide

## Overview

The Booking Service includes a **WebSocket gateway** for real-time notifications. Users receive instant updates about:
- Booking creation
- Booking confirmation
- Booking cancellation
- Flight status changes
- Payment completion

## WebSocket Connection

**URL**: `ws://localhost:3004` (or your booking service URL)

**Authentication**: JWT token required in handshake

## Connection Methods

### Method 1: Using Socket.IO Client (JavaScript)

```javascript
import { io } from 'socket.io-client';

// Get JWT token from login
const token = 'your-jwt-token-here';

// Connect to WebSocket
const socket = io('http://localhost:3004', {
  auth: {
    token: token
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to booking service');
});

socket.on('connected', (data) => {
  console.log('Server confirmation:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from booking service');
});

// Booking events
socket.on('booking:created', (message) => {
  console.log('New booking created:', message);
  // Update UI, show notification, etc.
});

socket.on('booking:confirmed', (message) => {
  console.log('Booking confirmed:', message);
  // Update booking status in UI
});

socket.on('booking:cancelled', (message) => {
  console.log('Booking cancelled:', message);
  // Update UI to show cancellation
});

socket.on('booking:updated', (message) => {
  console.log('Booking updated:', message);
});

socket.on('flight:status-changed', (message) => {
  console.log('Flight status changed:', message);
  // Alert user if their flight is delayed/cancelled
});

socket.on('payment:completed', (message) => {
  console.log('Payment completed:', message);
  // Show success message
});
```

### Method 2: React Hook Example

```jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function useBookingNotifications(token) {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io('http://localhost:3004', {
      auth: { token }
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to booking notifications');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('booking:created', (message) => {
      setNotifications(prev => [...prev, {
        type: 'booking_created',
        ...message,
        id: Date.now()
      }]);
    });

    socket.on('booking:confirmed', (message) => {
      setNotifications(prev => [...prev, {
        type: 'booking_confirmed',
        ...message,
        id: Date.now()
      }]);
    });

    socket.on('booking:cancelled', (message) => {
      setNotifications(prev => [...prev, {
        type: 'booking_cancelled',
        ...message,
        id: Date.now()
      }]);
    });

    socket.on('flight:status-changed', (message) => {
      setNotifications(prev => [...prev, {
        type: 'flight_status_changed',
        ...message,
        id: Date.now()
      }]);
    });

    socket.on('payment:completed', (message) => {
      setNotifications(prev => [...prev, {
        type: 'payment_completed',
        ...message,
        id: Date.now()
      }]);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return { notifications, isConnected };
}

// Usage in component
function BookingDashboard() {
  const token = localStorage.getItem('accessToken');
  const { notifications, isConnected } = useBookingNotifications(token);

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>

      <h2>Real-time Notifications</h2>
      {notifications.map(notif => (
        <div key={notif.id} className="notification">
          {notif.type}: {JSON.stringify(notif.data)}
        </div>
      ))}
    </div>
  );
}
```

### Method 3: Node.js Test Client

```javascript
const io = require('socket.io-client');

// Get token from login first
const token = 'your-jwt-token';

const socket = io('http://localhost:3004', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
});

socket.on('connected', (data) => {
  console.log('✅ Server confirmation:', data);
});

socket.on('booking:created', (message) => {
  console.log('📚 New booking:', message.data);
});

socket.on('booking:confirmed', (message) => {
  console.log('✅ Booking confirmed:', message.data);
});

socket.on('booking:cancelled', (message) => {
  console.log('❌ Booking cancelled:', message.data);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});

// Keep connection alive
process.on('SIGINT', () => {
  socket.disconnect();
  process.exit();
});
```

## Event Data Structures

### booking:created
```json
{
  "event": "BOOKING_CREATED",
  "data": {
    "bookingId": "uuid",
    "pnr": "ABC123",
    "status": "PENDING",
    "flightNumber": "AA123",
    "origin": "JFK",
    "destination": "LAX",
    "totalPrice": 450.00,
    "currency": "USD",
    "passengerCount": 1
  },
  "timestamp": "2025-11-10T12:00:00.000Z"
}
```

### booking:confirmed
```json
{
  "event": "BOOKING_UPDATED",
  "data": {
    "bookingId": "uuid",
    "pnr": "ABC123",
    "status": "CONFIRMED",
    "confirmedAt": "2025-11-10T12:05:00.000Z"
  },
  "timestamp": "2025-11-10T12:05:00.000Z"
}
```

### booking:cancelled
```json
{
  "event": "BOOKING_CANCELLED",
  "data": {
    "bookingId": "uuid",
    "pnr": "ABC123",
    "status": "CANCELLED",
    "cancelledAt": "2025-11-10T12:10:00.000Z"
  },
  "timestamp": "2025-11-10T12:10:00.000Z"
}
```

### flight:status-changed
```json
{
  "event": "FLIGHT_STATUS_CHANGED",
  "data": {
    "flightId": "uuid",
    "flightNumber": "AA123",
    "oldStatus": "SCHEDULED",
    "newStatus": "DELAYED",
    "affectedBookings": ["booking-uuid-1", "booking-uuid-2"]
  },
  "timestamp": "2025-11-10T12:15:00.000Z"
}
```

### payment:completed
```json
{
  "event": "PAYMENT_COMPLETED",
  "data": {
    "bookingId": "uuid",
    "paymentId": "payment-uuid",
    "amount": 450.00,
    "currency": "USD",
    "status": "SUCCEEDED"
  },
  "timestamp": "2025-11-10T12:20:00.000Z"
}
```

## Room Subscriptions

### User Rooms
Each user is automatically subscribed to their personal room: `user:{userId}`

### Admin Room
Admins can subscribe to the `admin` room to receive all booking notifications:

```javascript
socket.emit('subscribe', { rooms: ['admin'] });
```

### Custom Subscriptions

```javascript
// Subscribe to multiple rooms
socket.emit('subscribe', {
  rooms: ['admin', 'analytics', 'notifications']
});

// Unsubscribe from rooms
socket.emit('unsubscribe', {
  rooms: ['analytics']
});
```

## Testing WebSocket

### Step 1: Install Socket.IO Client

```bash
npm install socket.io-client
```

### Step 2: Create Test Script

Create `test-websocket.js`:

```javascript
const io = require('socket.io-client');
const axios = require('axios');

async function testWebSocket() {
  // 1. Login to get token
  const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'test@example.com',
    password: 'Test123!'
  });

  const token = loginResponse.data.data.accessToken;
  console.log('✅ Got token');

  // 2. Connect to WebSocket
  const socket = io('http://localhost:3004', {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
  });

  socket.on('connected', (data) => {
    console.log('✅ Server confirmation:', data);
  });

  socket.on('booking:created', (message) => {
    console.log('📚 Booking created:', message);
  });

  socket.on('booking:confirmed', (message) => {
    console.log('✅ Booking confirmed:', message);
  });

  socket.on('booking:cancelled', (message) => {
    console.log('❌ Booking cancelled:', message);
  });

  // 3. Wait a bit for connection
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Create a booking (will trigger booking:created event)
  try {
    const bookingResponse = await axios.post(
      'http://localhost:3004/api/v1/bookings',
      {
        flightId: 'your-flight-id',
        cabinClass: 'ECONOMY',
        passengers: [{
          type: 'ADULT',
          title: 'Mr',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01'
        }],
        contactInfo: {
          email: 'test@example.com',
          phone: '+1234567890'
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('📚 Booking created via API:', bookingResponse.data);
  } catch (error) {
    console.error('❌ Booking creation failed:', error.response?.data || error.message);
  }

  // Keep script running
  console.log('\n👂 Listening for events... (Press Ctrl+C to exit)');
}

testWebSocket().catch(console.error);
```

### Step 3: Run Test

```bash
node test-websocket.js
```

## Frontend Integration Example (React)

```jsx
// BookingNotificationProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const BookingNotificationContext = createContext();

export function BookingNotificationProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:3004', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle all booking events
    const eventHandlers = [
      'booking:created',
      'booking:confirmed',
      'booking:cancelled',
      'booking:updated',
      'flight:status-changed',
      'payment:completed'
    ];

    eventHandlers.forEach(event => {
      newSocket.on(event, (message) => {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          event,
          ...message,
          read: false
        }]);

        // Show toast notification
        showToast(event, message);
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <BookingNotificationContext.Provider
      value={{
        notifications,
        isConnected,
        markAsRead,
        clearAll,
        unreadCount: notifications.filter(n => !n.read).length
      }}
    >
      {children}
    </BookingNotificationContext.Provider>
  );
}

export const useBookingNotifications = () => useContext(BookingNotificationContext);

function showToast(event, message) {
  // Implement your toast notification logic
  console.log(`[${event}]`, message);
}
```

## Troubleshooting

### Connection Fails with 401

**Issue**: WebSocket disconnects immediately

**Solution**: Ensure JWT token is valid and not expired
```javascript
// Check token expiration before connecting
const payload = JSON.parse(atob(token.split('.')[1]));
if (payload.exp * 1000 < Date.now()) {
  // Token expired, refresh it first
  console.log('Token expired, refresh needed');
}
```

### Not Receiving Events

**Issue**: Connected but no events received

**Solutions**:
1. Check you're in the correct room (user rooms are automatic)
2. Verify your user ID matches the booking's user ID
3. Check server logs for event emission

### Connection Drops

**Issue**: Frequent disconnections

**Solutions**:
1. Implement reconnection logic:
```javascript
const socket = io('http://localhost:3004', {
  auth: { token },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

2. Handle reconnection events:
```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
});
```

## Security Considerations

1. **Always use JWT authentication** - Never allow anonymous connections
2. **Validate user permissions** - Users can only see their own bookings
3. **Use WSS in production** - Enable SSL/TLS for WebSocket connections
4. **Rate limit connections** - Prevent abuse
5. **Timeout inactive connections** - Clean up stale connections

## Production Deployment

### Using NGINX as Reverse Proxy

```nginx
location /socket.io/ {
    proxy_pass http://booking-service:3004;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### Environment Variables

```env
# Enable WebSocket
WEBSOCKET_ENABLED=true

# CORS for WebSocket
WEBSOCKET_CORS_ORIGIN=https://yourdomain.com

# Connection limits
WEBSOCKET_MAX_CONNECTIONS=1000
WEBSOCKET_TIMEOUT=60000
```

---

**Happy Real-time Coding! 🚀**
