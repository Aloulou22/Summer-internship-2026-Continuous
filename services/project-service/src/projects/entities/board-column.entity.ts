import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

// One row per Kanban column (e.g. "To Do", "In Progress", "Done") for a
// project. Task Service stores this id as a plain columnId on its Task
// entity, the same cross-service reference pattern used everywhere else.
@Entity('board_columns')
export class BoardColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.columns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  position: number;

  @CreateDateColumn()
  createdAt: Date;
}
