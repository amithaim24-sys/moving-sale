import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold">404</h1>
          <Link href="/" className="text-brand underline">Home</Link>
        </div>
      </body>
    </html>
  );
}
