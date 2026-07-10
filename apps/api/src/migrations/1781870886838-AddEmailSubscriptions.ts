import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailSubscriptions1781870886838 implements MigrationInterface {
    name = 'AddEmailSubscriptions1781870886838'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "settings" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "settings"`);
    }

}
