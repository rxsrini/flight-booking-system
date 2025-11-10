import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CabinClass } from '@shared/types';
import { Flight } from './flight.entity';

@Entity('flight_prices')
@Unique(['flightId', 'cabinClass'])
export class FlightPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'flight_id' })
  flightId: string;

  @ManyToOne(() => Flight, (flight) => flight.prices)
  @JoinColumn({ name: 'flight_id' })
  flight: Flight;

  @Column({
    name: 'cabin_class',
    type: 'enum',
    enum: CabinClass,
  })
  cabinClass: CabinClass;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'available_seats', type: 'integer' })
  availableSeats: number;
}
