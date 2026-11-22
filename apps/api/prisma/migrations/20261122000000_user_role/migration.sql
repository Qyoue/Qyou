-- Add role/permission model to users
CREATE TYPE "user_role" AS ENUM ('USER', 'OPERATOR', 'ADMIN');

ALTER TABLE "users"
ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'USER';
