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
        (session.user as { whatsappPhone?: string | null }).whatsappPhone =
          (user as { whatsappPhone?: string | null }).whatsappPhone ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Promote the very first registered user to ADMIN.
      const count = await prisma.user.count();
      if (count === 1 && user.id) {
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
      whatsappPhone?: string | null;
    };
  }
}
