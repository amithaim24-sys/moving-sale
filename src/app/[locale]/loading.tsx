import Spinner from "@/components/Spinner";

export default function Loading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-brand"
      role="status"
      aria-busy="true"
    >
      <Spinner className="h-8 w-8" />
    </div>
  );
}
