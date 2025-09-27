"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-[hsl(var(--primary))]">Something went wrong!</h2>
        <p className="text-[hsl(var(--foreground))] opacity-80">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[hsl(var(--primary))] text-black rounded-lg hover:bg-[hsl(var(--primary))]/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
