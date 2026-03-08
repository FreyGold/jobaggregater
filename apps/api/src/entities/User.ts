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

export enum UserSubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum UserSubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar' })
  passwordHash!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({
    type: 'varchar',
    default: UserSubscriptionPlan.FREE,
  })
  subscriptionPlan!: UserSubscriptionPlan;

  @Column({
    type: 'varchar',
    default: UserSubscriptionStatus.ACTIVE,
  })
  subscriptionStatus!: UserSubscriptionStatus;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  stripeCustomerId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripeSubscriptionId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => SavedJob, (savedJob) => savedJob.user)
  savedJobs!: Relation<SavedJob[]>;
}
