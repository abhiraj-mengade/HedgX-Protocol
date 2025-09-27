import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-[hsl(var(--primary))]">Page Not Found</h2>
        <p className="text-[hsl(var(--foreground))] opacity-80">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-[hsl(var(--primary))] text-black rounded-lg hover:bg-[hsl(var(--primary))]/90 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
