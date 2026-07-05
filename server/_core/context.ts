import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { validateSession } from "./sessionService";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const token = opts.req.cookies[COOKIE_NAME];
    if (token) {
      const session = await validateSession(token);
      if (session) {
        const users = await db.getUserById(session.userId);
        if (users && users.length > 0) {
          user = users[0];
        }
      }
    }
  } catch {
    user = null;
  }
  return { req: opts.req, res: opts.res, user };
}
