"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export const InterestRateTable = ({
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
}) => (
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
              style={{ textShadow: "0px 0px 12px hsl(var(--primary))" }}
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
          <TableRow key={market.id} className="hover:bg-muted/50">
            <TableCell className="p-4">
              <Link
                href={`/markets/${market.id}`}
                className="text-[hsl(var(--foreground))] hover:underline font-medium"
              >
                {market.id}
              </Link>
            </TableCell>
            <TableCell className="p-4">{market.maturity}</TableCell>
            <TableCell className="p-4">{market.implied_apr}</TableCell>
            <TableCell className="p-4">{market.underlying_apr}</TableCell>
            <TableCell className="p-4">{market.volume}</TableCell>
            <TableCell className="p-4">{market.notional_ol}</TableCell>
            <TableCell className="p-4">{market.long_short_rate_roi}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </section>
);
