import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('airlines')
export class Airline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 3 })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
