// User Types and Roles
export enum UserRole {
  AIRLINE_AGENT = 'AIRLINE_AGENT',
  TRAVEL_AGENT = 'TRAVEL_AGENT',
  CUSTOMER = 'CUSTOMER',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Flight Types
export enum CabinClass {
  ECONOMY = 'ECONOMY',
  PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
  BUSINESS = 'BUSINESS',
  FIRST_CLASS = 'FIRST_CLASS',
}

export enum FlightStatus {
  SCHEDULED = 'SCHEDULED',
  DELAYED = 'DELAYED',
  DEPARTED = 'DEPARTED',
  IN_FLIGHT = 'IN_FLIGHT',
  LANDED = 'LANDED',
  CANCELLED = 'CANCELLED',
}

export interface Airport {
  code: string; // IATA code
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface Airline {
  code: string; // IATA code
  name: string;
  logo?: string;
}

export interface FlightSegment {
  id: string;
  flightNumber: string;
  airline: Airline;
  departureAirport: Airport;
  arrivalAirport: Airport;
  departureTime: Date;
  arrivalTime: Date;
  duration: number; // minutes
  aircraft: string;
  cabinClass: CabinClass;
  availableSeats: number;
  status: FlightStatus;
}

export interface Flight {
  id: string;
  segments: FlightSegment[];
  totalDuration: number;
  totalPrice: number;
  currency: string;
  stops: number;
  baggage?: BaggageAllowance;
  fareRules?: FareRules;
  gdsSource: string; // Amadeus, Sabre, etc.
}

export interface BaggageAllowance {
  checkIn: {
    pieces: number;
    weight: number;
    unit: 'kg' | 'lb';
  };
  carryOn: {
    pieces: number;
    weight: number;
    unit: 'kg' | 'lb';
  };
}

export interface FareRules {
  refundable: boolean;
  changeable: boolean;
  changeFee?: number;
  cancellationFee?: number;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: PassengerCount;
  cabinClass: CabinClass;
  directFlightsOnly?: boolean;
}

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

// Booking Types
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Passenger {
  id?: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
  email?: string;
  phone?: string;
}

export interface Booking {
  id: string;
  userId: string;
  pnr: string; // Passenger Name Record
  flight: Flight;
  passengers: Passenger[];
  contactInfo: ContactInfo;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  paymentId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

// Payment Types
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PAYPAL = 'PAYPAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
}

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  gatewayResponse?: any;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

// Analytics Types
export interface BookingAnalytics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  topRoutes: RouteAnalytics[];
  topAirlines: AirlineAnalytics[];
  bookingsByDay: DailyBooking[];
}

export interface RouteAnalytics {
  origin: string;
  destination: string;
  bookingCount: number;
  revenue: number;
}

export interface AirlineAnalytics {
  airlineCode: string;
  airlineName: string;
  bookingCount: number;
  revenue: number;
}

export interface DailyBooking {
  date: string;
  count: number;
  revenue: number;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  usersByRole: Record<UserRole, number>;
}

// Audit Types
export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PAYMENT = 'PAYMENT',
  BOOKING = 'BOOKING',
}

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Notification Types
export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  subject: string;
  message: string;
  data?: any;
  status: NotificationStatus;
  sentAt?: Date;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  meta?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Permission Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}

// WebSocket Event Types
export enum WebSocketEvent {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_UPDATED = 'BOOKING_UPDATED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  FLIGHT_STATUS_CHANGED = 'FLIGHT_STATUS_CHANGED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  NOTIFICATION_RECEIVED = 'NOTIFICATION_RECEIVED',
}

export interface WebSocketMessage<T = any> {
  event: WebSocketEvent;
  data: T;
  timestamp: Date;
}
