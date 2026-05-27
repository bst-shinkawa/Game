import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

if (!googleClientId || !googleClientSecret || !nextAuthSecret) {
  throw new Error("NextAuth environment variables are missing. Set AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET and NEXTAUTH_SECRET.");
}

// Vercel 本番では VERCEL_URL（自動設定）を NEXTAUTH_URL のフォールバックとして使用する。
// NEXTAUTH_URL が明示的に設定されていればそちらを優先する。
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile && "sub" in profile && profile.sub) {
        token.userId = String(profile.sub);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = String(token.userId);
      }
      return session;
    },
  },
};

