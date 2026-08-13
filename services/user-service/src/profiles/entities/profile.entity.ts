import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';

// A profile is the "business identity" of a user. It references the user id
// that the Auth service owns (userId), but stores no password/credentials.
// This is the Database-per-Service boundary: Auth owns auth data, User owns
// profile data. They share only the user id, not tables.
@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The id issued by the Auth service. Links the two services without a FK.
  @Column({ unique: true })
  userId: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  jobTitle: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @ManyToOne(() => Team, (team) => team.members, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ nullable: true })
  teamId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
