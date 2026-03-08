import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  type Relation,
} from 'typeorm';
import { SavedJob } from './SavedJob.js';

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  FREELANCE = 'FREELANCE',
  INTERNSHIP = 'INTERNSHIP',
}

export enum ExperienceLevel {
  ENTRY = 'ENTRY',
  MID = 'MID',
  SENIOR = 'SENIOR',
  EXECUTIVE = 'EXECUTIVE',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  title!: string;

  @Index()
  @Column({ type: 'varchar' })
  company!: string;

  @Index()
  @Column({ type: 'varchar' })
  location!: string;

  @Column({ type: 'varchar', nullable: true })
  salary!: string;

  @Column({ type: 'varchar', unique: true })
  url!: string;

  @Index()
  @Column({ type: 'varchar' })
  source!: string;

  @Column({ type: 'text' })
  description!: string;

  @Index()
  @Column({ type: 'timestamp with time zone', nullable: true })
  postedAt!: Date;

  @Column('text', { array: true, default: [] })
  tags!: string[];

  @Index()
  @Column({
    type: 'varchar',
    nullable: true,
  })
  employmentType!: EmploymentType;

  @Index()
  @Column({
    type: 'varchar',
    nullable: true,
  })
  experienceLevel!: ExperienceLevel;

  @Index()
  @Column({ type: 'boolean', default: false })
  isRemote!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => SavedJob, (savedJob) => savedJob.job)
  savedByUsers!: Relation<SavedJob[]>;
}
