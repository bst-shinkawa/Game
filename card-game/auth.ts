import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

if (!googleClientId || !googleClientSecret || !nextAuthSecret) {
  // Helps identify missing Vercel environment variables quickly in runtime logs.
  throw new Error("NextAuth environment variables are missing. Set AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET and NEXTAUTH_SECRET.");
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

