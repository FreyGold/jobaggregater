import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Resume } from './Resume.js';

@Entity('tailored_resumes')
export class TailoredResume {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  resumeId!: string;

  @Index()
  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  jobTitle!: string;

  @Column({ type: 'varchar' })
  companyName!: string;

  @Column({ type: 'text' })
  jobDescription!: string;

  @Column({ type: 'varchar', nullable: true })
  jobUrl!: string | null;

  @Column({ type: 'integer' })
  score!: number;

  @Column({ type: 'text' })
  tailoredContent!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Resume, (r) => r.tailoredVersions)
  @JoinColumn({ name: 'resumeId' })
  resume!: Relation<Resume>;
}
