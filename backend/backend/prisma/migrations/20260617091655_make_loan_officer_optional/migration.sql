-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_loan_officer_id_fkey";

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "loan_officer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_loan_officer_id_fkey" FOREIGN KEY ("loan_officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
