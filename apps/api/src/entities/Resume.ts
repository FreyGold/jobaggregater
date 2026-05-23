import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  type Relation,
} from 'typeorm';
import { TailoredResume } from './TailoredResume.js';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  fileName!: string;

  @Column({ type: 'varchar' })
  fileType!: string;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => TailoredResume, (t) => t.resume)
  tailoredVersions!: Relation<TailoredResume[]>;
}
