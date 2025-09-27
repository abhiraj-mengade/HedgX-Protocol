import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      {/* Hero Section */}
      <section className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <h1
            className="text-6xl font-bold text-[hsl(var(--foreground))]"
            style={{ textShadow: "0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary))" }}
          >
            HedgX
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The next generation of decentralized fixed-rates. Trade, hedge, and earn with innovative
            DeFi solutions.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/markets"
              className="px-8 py-4 bg-[hsl(var(--primary))] text-black font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
            >
              Launch App
            </Link>
            <button className="px-8 py-4 border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-bold rounded-xl hover:bg-[hsl(var(--primary))] hover:text-black transition-all duration-200">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
