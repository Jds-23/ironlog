import { expo } from "@better-auth/expo";
import { db } from "@ironlog/db";
import * as schema from "@ironlog/db/schema/auth";
import { env } from "@ironlog/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema: schema,
  }),
  trustedOrigins: [
    env.CORS_ORIGIN,
    "ironlog://",
    ...(env.NODE_ENV === "development"
      ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "http://localhost:8081"]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
    // uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
    // https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
    // crossSubDomainCookies: {
    //   enabled: true,
    //   domain: "<your-workers-subdomain>",
    // },
  },
  plugins: [expo()],
});
