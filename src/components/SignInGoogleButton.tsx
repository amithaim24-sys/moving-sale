"use client";

import { signIn } from "next-auth/react";

export default function SignInGoogleButton({
  label,
  callbackUrl = "/",
}: {
  label: string;
  callbackUrl?: string;
}) {
  return (
    <button onClick={() => signIn("google", { callbackUrl })} className="btn-primary w-full">
      {label}
    </button>
  );
}
