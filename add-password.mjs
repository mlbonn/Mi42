import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "./drizzle/schema.ts";
import bcrypt from "bcryptjs";

const db = drizzle(process.env.DATABASE_URL);

const email = "ml@bl2020.com";
const password = "Rheinrhein##11";

// Hash password
const passwordHash = await bcrypt.hash(password, 10);

// Update user
await db.update(users)
  .set({ passwordHash })
  .where(eq(users.email, email));

console.log(`Password hash added for ${email}`);
process.exit(0);
