import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Role } from "./types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    // Sessions last a few hours, not the NextAuth default of 30 days.
    maxAge: 4 * 60 * 60, // 4 hours
    // Roll the expiry forward at most once an hour while the user is active, so an
    // engaged user isn't logged out mid-session but an idle one expires within ~4h.
    updateAge: 60 * 60, // 1 hour
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Let a Google sign-in attach to a user row that already exists for the same
      // email but has no linked OAuth account yet. This powers admin-provisioned
      // store owners: the admin can create a store for an email before that person
      // has ever signed in (a placeholder user is created), and their first Google
      // sign-in links to it instead of erroring with OAuthAccountNotLinked. Safe
      // here because Google is the only provider and it returns verified emails.
      allowDangerousEmailAccountLinking: true,
      // Normalize the email to lowercase before the adapter creates/links the user.
      // Account-linking and admin store provisioning both key off email, and the DB
      // unique key is case-sensitive — without this a differently-cased address would
      // create a second user row and orphan a provisioned store. Mirrors the lowercase
      // we already apply when creating placeholder owners.
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: typeof profile.email === "string" ? profile.email.toLowerCase() : profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  pages: { signIn: "/signin" },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as { id?: string }).id = user.id;
        (session.user as { role?: Role }).role = (user as { role?: Role }).role ?? "USER";
        (session.user as { banned?: boolean }).banned = (user as { banned?: boolean }).banned ?? false;
        (session.user as { whatsappPhone?: string | null }).whatsappPhone =
          (user as { whatsappPhone?: string | null }).whatsappPhone ?? null;
      }
      return session;
    },
  },
  events: {
    // Auto-promote allowlisted emails to OWNER (the main owner / super-admin) on every
    // sign-in, so adding an email to BOOTSTRAP_ADMIN_EMAILS works even for existing
    // accounts. Delegated ADMINs are granted from the admin UI, not via this allowlist.
    async signIn({ user }) {
      const allowlist = (process.env.BOOTSTRAP_ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (user.id && user.email && allowlist.includes(user.email.toLowerCase())) {
        await prisma.user.updateMany({
          where: { id: user.id, role: { not: "OWNER" } },
          data: { role: "OWNER" },
        });
      }
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      banned: boolean;
      whatsappPhone?: string | null;
    };
  }
}
