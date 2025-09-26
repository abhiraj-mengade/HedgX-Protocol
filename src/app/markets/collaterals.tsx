import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default function CollateralTable({
  title,
  markets,
}: {
  title: string;
  markets: Array<{
    id: string;
    maturity: string;
    implied_apr: string;
    underlying_apr: string;
    volume: string;
    notional_ol: string;
    long_short_rate_roi: string;
  }>;
}) {
  return (
    <section className="overflow-x-auto mb-12 rounded-md border border-[rgba(189,238,99,0.14)]">
      <Table className="table-auto w-full">
        <TableHeader>
          <TableRow
            className="text-[hsl(var(--muted-foreground))] h-14"
            style={{
              background:
                "linear-gradient(to right, rgba(189, 238, 99, 0.14) 0%, rgba(189, 238, 99, 0) 100%)",
            }}
          >
            <TableHead className="p-4 text-left text-[hsl(var(--foreground))] font-semibold">
              <span
                className="text-[hsl(var(--foreground))] font-semibold"
                style={{
                  textShadow: "0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary))",
                }}
              >
                {title}
              </span>
            </TableHead>
            <TableHead className="p-4 text-left">Maturity</TableHead>
            <TableHead className="p-4 text-left">Implied APR</TableHead>
            <TableHead className="p-4 text-left">Underlying APR</TableHead>
            <TableHead className="p-4 text-left">Volume</TableHead>
            <TableHead className="p-4 text-left">Notional OL</TableHead>
            <TableHead className="p-4 text-left">Long/Short Rate ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {markets.map((market) => (
            <TableRow key={market.id} className="h-14 border-t border-[hsl(var(--border))]">
              <TableCell className="p-4 text-[hsl(var(--foreground))]">
                <Link
                  href={`/markets/${market.id}`}
                  className="text-[hsl(var(--foreground))] hover:underline"
                >
                  {market.id}
                </Link>
              </TableCell>
              <TableCell className="p-4">{market.maturity}</TableCell>
              <TableCell className="p-4">{market.implied_apr}</TableCell>
              <TableCell className="p-4">{market.underlying_apr}</TableCell>
              <TableCell className="p-4">{market.volume}</TableCell>
              <TableCell className="p-4">{market.notional_ol}</TableCell>
              <TableCell
                className={`p-4 ${
                  market.long_short_rate_roi.toLowerCase().includes("long")
                    ? "text-green-500"
                    : market.long_short_rate_roi.toLowerCase().includes("short")
                      ? "text-red-500"
                      : ""
                }`}
              >
                {market.long_short_rate_roi}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
