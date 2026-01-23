import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "./drizzle/schema.ts";
import "dotenv/config";

const db = drizzle(process.env.DATABASE_URL);

const hash = "60f8840081d95c50db0ae8a23897846c379ca1fb7286aaf52142cb2471519b5f";

await db.update(users)
  .set({ passwordHash: hash })
  .where(eq(users.email, "ml@bl2020.com"));

console.log("Password hash updated for ml@bl2020.com");
process.exit(0);
