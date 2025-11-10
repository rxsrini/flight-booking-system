import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Booking } from './booking.entity';

@Entity('passengers')
export class Passenger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, (booking) => booking.passengers)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'enum', enum: ['ADULT', 'CHILD', 'INFANT'] })
  type: 'ADULT' | 'CHILD' | 'INFANT';

  @Column({ nullable: true, length: 10 })
  title?: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({ name: 'passport_number', nullable: true })
  passportNumber?: string;

  @Column({ name: 'passport_expiry', type: 'date', nullable: true })
  passportExpiry?: Date;

  @Column({ nullable: true, length: 3 })
  nationality?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
