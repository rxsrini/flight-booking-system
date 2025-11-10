import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { FlightStatus } from '@shared/types';
import { Airline } from './airline.entity';
import { Airport } from './airport.entity';
import { FlightPrice } from './flight-price.entity';

@Entity('flights')
export class Flight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'flight_number' })
  flightNumber: string;

  @Column({ name: 'airline_id' })
  airlineId: string;

  @ManyToOne(() => Airline)
  @JoinColumn({ name: 'airline_id' })
  airline: Airline;

  @Column({ name: 'origin_airport_id' })
  originAirportId: string;

  @ManyToOne(() => Airport)
  @JoinColumn({ name: 'origin_airport_id' })
  originAirport: Airport;

  @Column({ name: 'destination_airport_id' })
  destinationAirportId: string;

  @ManyToOne(() => Airport)
  @JoinColumn({ name: 'destination_airport_id' })
  destinationAirport: Airport;

  @Column({ name: 'departure_time', type: 'timestamp' })
  departureTime: Date;

  @Column({ name: 'arrival_time', type: 'timestamp' })
  arrivalTime: Date;

  @Column({ type: 'integer' })
  duration: number;

  @Column({ nullable: true })
  aircraft?: string;

  @Column({
    type: 'enum',
    enum: FlightStatus,
    default: FlightStatus.SCHEDULED,
  })
  status: FlightStatus;

  @Column({ name: 'total_seats', type: 'integer' })
  totalSeats: number;

  @Column({ name: 'available_seats', type: 'integer' })
  availableSeats: number;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ default: 'USD', length: 3 })
  currency: string;

  @Column({ name: 'gds_source', nullable: true })
  gdsSource?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => FlightPrice, (price) => price.flight)
  prices: FlightPrice[];
}
