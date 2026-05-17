"use client";

import { signIn } from "next-auth/react";

export default function SignInGoogleButton({ label }: { label: string }) {
  return (
    <button onClick={() => signIn("google", { callbackUrl: "/" })} className="btn-primary w-full">
      {label}
    </button>
  );
}
