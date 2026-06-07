"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({
  label,
  callbackUrl = "/",
}: {
  label: string;
  callbackUrl?: string;
}) {
  return (
    <button onClick={() => signOut({ callbackUrl })} className="btn-secondary text-sm">
      {label}
    </button>
  );
}
