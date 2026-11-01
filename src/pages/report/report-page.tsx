import { Printer } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { BackLink } from "@/components/back-link";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageSkeleton } from "@/components/page-skeleton";
import { formatDate } from "@/lib/format";
import {
  buildReport,
  REPORT_DISCLAIMER,
  type ReportVerdict,
} from "@shared/report/report-data";
import { api } from "../../../convex/_generated/api";

const th =
  "border-b-[1.5px] border-[#111216] px-1.5 py-1.5 text-left text-2xs font-semibold tracking-wider text-[#4a4d55] uppercase";
const td = "border-b border-[#e1e2e6] px-1.5 py-1.5 align-top print:py-1";

// A plain black-and-white document for a pharmacist or dermatologist: products, results and every scan as numbers,
// with a clear "not a medical assessment" box. Printed (or saved as PDF) with the browser's own print dialog.
// Numbers only: no photos exist, no model-written text, and only the name typed here (never saved) identifies anyone.
export function ReportPage() {
  const products = useQuery(api.products.list);
  const scans = useQuery(api.scans.list);
  const latest = useQuery(api.verdicts.latestForAll);
  const [name, setName] = useState("");
  const [now] = useState(() => Date.now());
  if (!products || !scans || !latest) return <PageSkeleton />;

  const verdicts = new Map<string, ReportVerdict>();
  for (const entry of latest) {
    if (entry.verdict)
      verdicts.set(entry.productId, {
        verdict: entry.verdict.verdict,
        reasons: entry.verdict.reasons,
        inputs: entry.verdict.inputs,
      });
  }
  const report = buildReport({ products, scans, verdicts, now });
  const trimmedName = name.trim();

  return (
    <main className="screen report-page print:min-h-0 print:bg-white print:pb-0">
      <div className="report-controls print:hidden">
        <BackLink to="/settings" label="Back" /><h1 className="page-title">Skin report</h1><p className="report-intro">Your products, progress and scan history. Ready to share.</p>
        <Label className="min-w-[200px] flex-1" htmlFor="report-name">
          Your name (optional, not saved)
          <Input
            id="report-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="Your name"
          />
        </Label>
        <button type="button" onClick={() => window.print()} className={buttonVariants({ size: "lg" })}>
          <Printer size={18} weight="bold" />
          Print or save as PDF
        </button>
      </div>

      <article className="report-paper bg-white text-[#111216] print:text-xs print:leading-[1.35]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-4xl leading-[1.05] font-semibold tracking-tighter">
            Skin tracking report
          </h2>
          <span className="inline-flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight">
            <LogoMark className="size-7" />
            Skinify
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[#4a4d55]">
          <span className={trimmedName ? "" : "print:hidden"}>
            Prepared for:{" "}
            <strong>{trimmedName || "(add your name above)"}</strong>
          </span>
          <span>
            Created {formatDate(report.generatedAt)} with Skinify
            {report.firstScanAt !== null && report.lastScanAt !== null
              ? ` · scans ${formatDate(report.firstScanAt)} to ${formatDate(report.lastScanAt)} (${report.scanCount} ${report.scanCount === 1 ? "scan" : "scans"})`
              : " · no scans yet"}
          </span>
        </div>

        <p className="mt-3.5 rounded-xl border-[1.5px] border-[#111216] px-3 py-2.5 text-xs">
          <strong>Please read first.</strong> {REPORT_DISCLAIMER}
        </p>

        <h2 className="mt-5 mb-2 border-b-[1.5px] border-[#111216] pb-1 text-lg font-semibold tracking-tight print:mt-4 print:break-after-avoid">
          Products being tracked
        </h2>
        {report.products.length === 0 ? (
          <p>No products are being tracked yet.</p>
        ) : (
          <>
            {/* On a phone each product is a block (a wide table would be cut off); print and wider screens use the table. */}
            <ul className="sm:hidden print:hidden">
              {report.products.map((product) => (
                <li
                  key={`${product.name}-${product.startDate}`}
                  className="border-b border-[#e1e2e6] py-2.5"
                >
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-[#4a4d55]">
                    {product.concern} · started {formatDate(product.startDate)}{" "}
                    (day {product.day})
                    {!product.active &&
                      product.endDate !== null &&
                      ` · stopped ${formatDate(product.endDate)}`}
                  </p>
                  <p className="mt-1.5">
                    <span className="inline-block rounded-[4px] border-[1.5px] border-[#111216] px-1.5 text-xs font-semibold">
                      {product.verdictLabel}
                    </span>
                  </p>
                  {product.lines.map((line) => (
                    <p key={line} className="mt-0.5 text-xs text-[#4a4d55]">
                      {line}
                    </p>
                  ))}
                  {(product.scoreChange || product.variation) && (
                    <p className="mt-1 text-xs tabular-nums">
                      {product.scoreChange
                        ? `Score before → now: ${product.scoreChange}`
                        : ""}
                      {product.scoreChange && product.variation ? " · " : ""}
                      {product.variation
                        ? `Normal variation ${product.variation}`
                        : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block print:block print:overflow-visible">
              <Table className="min-w-[640px] text-xs print:min-w-0" containerClassName="print:overflow-visible">
                <TableHeader>
                  <TableRow>
                    <TableHead className={th}>Product</TableHead>
                    <TableHead className={th}>Concern</TableHead>
                    <TableHead className={th}>Started</TableHead>
                    <TableHead className={th}>Result so far</TableHead>
                    <TableHead className={`${th} text-right`}>Score before → now</TableHead>
                    <TableHead className={`${th} text-right`}>Normal variation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.products.map((product) => (
                    <TableRow
                      key={`${product.name}-${product.startDate}`}
                      className="print:break-inside-avoid"
                    >
                      <TableCell className={td}>
                        <strong>{product.name}</strong>
                        {!product.active && product.endDate !== null && (
                          <span className="block text-xs text-[#4a4d55]">
                            Stopped {formatDate(product.endDate)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={td}>{product.concern}</TableCell>
                      <TableCell className={td}>
                        {formatDate(product.startDate)}
                        <span className="block text-xs text-[#4a4d55]">
                          day {product.day}
                        </span>
                      </TableCell>
                      <TableCell className={td}>
                        <span className="inline-block rounded-[4px] border-[1.5px] border-[#111216] px-1.5 text-xs font-semibold">
                          {product.verdictLabel}
                        </span>
                        {product.lines.map((line) => (
                          <span
                            key={line}
                            className="block text-xs text-[#4a4d55]"
                          >
                            {line}
                          </span>
                        ))}
                      </TableCell>
                      <TableCell className={`${td} text-right tabular-nums`}>
                        {product.scoreChange ?? "—"}
                      </TableCell>
                      <TableCell className={`${td} text-right tabular-nums`}>
                        {product.variation ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        <p className="mt-2 text-xs text-[#4a4d55]">
          Scores run 1 to 100, higher is healthier.
        </p>

        <h2 className="mt-5 mb-2 border-b-[1.5px] border-[#111216] pb-1 text-lg font-semibold tracking-tight print:mt-4 print:break-after-avoid">
          Scores at each scan
        </h2>
        {report.scans.length === 0 ? (
          <p>No scans yet.</p>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <p className="mb-1.5 text-xs text-[#4a4d55] sm:hidden print:hidden">
              Swipe sideways to see every concern.
            </p>
            <Table className="min-w-[640px] text-xs print:min-w-0" containerClassName="print:overflow-visible">
              <TableHeader>
                <TableRow>
                  <TableHead className={th}>Date</TableHead>
                  {report.concernLabels.map((label) => (
                    <TableHead key={label} className={`${th} text-right`}>
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.scans.map((scan) => (
                  <TableRow
                    key={scan.createdAt}
                    className={`print:break-inside-avoid ${scan.flagged ? "text-canttell-ink" : ""}`}
                  >
                    <TableCell className={td}>
                      {formatDate(scan.createdAt)}
                      {scan.startedProducts > 0 && (
                        <span className="block text-xs text-[#4a4d55]">
                          {scan.startedProducts === 1
                            ? "a product started"
                            : `${scan.startedProducts} products started`}
                        </span>
                      )}
                      {scan.flagged && (
                        <span className="block text-xs">lower quality</span>
                      )}
                    </TableCell>
                    {scan.scores.map((score, index) => (
                      <TableCell
                        key={index}
                        className={`${td} text-right tabular-nums`}
                      >
                        {score ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <h2 className="mt-5 mb-2 border-b-[1.5px] border-[#111216] pb-1 text-lg font-semibold tracking-tight print:mt-4 print:break-after-avoid">
          How to read this
        </h2>
        <ul className="grid list-disc gap-x-8 pl-5 sm:grid-cols-2">
          {report.howToRead.map((line) => (
            <li key={line} className="my-0.5 break-inside-avoid">
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3.5 border-t border-[#e1e2e6] pt-2 text-xs text-[#4a4d55]">
          Generated by Skinify from the person's own scans. Skin analysis by
          YouCam. Not a medical device, not a diagnosis.
        </p>
      </article>
    </main>
  );
}
