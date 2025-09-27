import PixelBlast from "@/components/PixelBlast";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <div
        style={{
          width: "100%",
          height: "100vh",
          position: "relative",
        }}
      >
        <PixelBlast
          style={{
            opacity: 0.5,
          }}
          variant="circle"
          pixelSize={8}
          color="#bdee63"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          speed={0.6}
          edgeFade={0.25}
        />
        <section className="absolute inset-0 flex items-center justify-center px-4 pb-40 pointer-events-none text-center">
          <div className="text-center space-y-4 max-w-4xl mx-auto text-pretty pointer-events-auto">
            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-foreground font-outfit relative overflow-hidden">
              <span className="relative inline-block animate-shine bg-gradient-to-r from-foreground via-primary to-foreground bg-[length:200%] bg-clip-text text-transparent pb-2">
                HedgX
              </span>
              <span className="text-foreground">.</span>
            </h1>
            <p className="text-xl text-center text-foreground max-w-2xl mx-auto leading-relaxed font-outfit mr-4">
              Hedge. Fix. Relax.
            </p>
            <div className="mt-8 flex justify-center items-center">
              <Link
                href="/markets"
                className="group relative inline-flex items-center justify-center w-[240px] h-[48px] bg-gradient-to-r from-primary via-primary to-primary bg-[length:200%] text-black font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 font-outfit overflow-hidden text-sm"
              >
                <span className="relative z-10">Launch App</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine-button opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
