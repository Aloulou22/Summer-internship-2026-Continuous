import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Subtask } from './subtask.entity';
import { Comment } from './comment.entity';
import { TaskHistory } from './task-history.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// projectId, columnId, assigneeId and reporterId are plain columns that
// reference ids owned by Project/User/Auth service — no FK, same
// cross-service-reference pattern used across the platform (Database per
// Service).
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  // Kanban column this task currently sits in (Project Service's BoardColumn.id).
  @Column({ nullable: true })
  columnId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column()
  reporterId: string;

  @Column({ nullable: true })
  assigneeId: string;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date;

  // Set once a deadline reminder has been published, so the cron sweep never
  // emits the same reminder twice.
  @Column({ type: 'boolean', default: false })
  reminderSent: boolean;

  @OneToMany(() => Subtask, (subtask) => subtask.task)
  subtasks: Subtask[];

  @OneToMany(() => Comment, (comment) => comment.task)
  comments: Comment[];

  @OneToMany(() => TaskHistory, (entry) => entry.task)
  history: TaskHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
