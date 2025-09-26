import { ConnectButton, darkTheme } from "thirdweb/react";
import { client } from "../client";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-2 sticky top-0 bg-background h-16 z-10">
      <div className="flex items-center space-x-4">
        <h1 className="text-3xl font-bold text-primary tracking-tight font-outfit">
          HedgX<span className="text-foreground">.</span>
        </h1>
      </div>
      <div>
        <ConnectButton
          theme={darkTheme({
            colors: {
              primaryButtonBg: "hsl(var(--primary))",
              connectedButtonBgHover: "hsl(var(--primary))",
            },
          })}
          connectButton={{
            label: "Connect",
            style: {
              height: "2.25rem",
              borderRadius: "0.5rem",
              fontSize: "16px",
              fontWeight: "500",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              paddingBottom: "0.5rem",
              paddingTop: "0.5rem",
            },
          }}
          client={client}
          appMetadata={{
            name: "HedgX Protocol",
            url: "https://hedgx-protocol.vercel.app",
          }}
        />
      </div>
    </header>
  );
}
