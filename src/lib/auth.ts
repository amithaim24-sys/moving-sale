import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Role } from "./types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
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
    async createUser({ user }) {
      // Auto-promote users whose email is in BOOTSTRAP_ADMIN_EMAILS (comma-separated).
      const allowlist = (process.env.BOOTSTRAP_ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (user.id && user.email && allowlist.includes(user.email.toLowerCase())) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
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
