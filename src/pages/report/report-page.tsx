import { CaretLeft, Printer } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";
import { PageSkeleton } from "@/components/page-skeleton";
import { formatDate } from "@/lib/format";
import {
  buildReport,
  REPORT_DISCLAIMER,
  type ReportVerdict,
} from "@shared/report/report-data";
import { api } from "../../../convex/_generated/api";

const th =
  "border-b-[1.5px] border-[#1d1714] px-1.5 py-1.5 text-left text-[11px] font-semibold tracking-[0.04em] text-[#4a3b35] uppercase";
const td = "border-b border-[#d7ccc3] px-1.5 py-1.5 align-top print:py-1";

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
    <main className="min-h-dvh bg-[#e9e4de] pb-10 print:min-h-0 print:bg-white print:pb-0">
      <div className="mx-auto flex max-w-[794px] flex-wrap items-center justify-between gap-3 px-4 pt-4 print:hidden">
        <Link
          to="/settings"
          className="press -ml-1 flex min-h-11 items-center gap-2 font-semibold"
        >
          <span className="grid size-10 place-items-center rounded-full bg-white">
            <CaretLeft size={18} weight="bold" />
          </span>
          Back
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="sr-only" htmlFor="report-name">
            Your name (optional, not saved)
          </label>
          <input
            id="report-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="Your name (optional, not saved)"
            className="h-11 w-64 max-w-full rounded-xl border-[1.5px] border-[#cdbdb1] bg-white px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="press inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-cocoa px-5 text-sm font-semibold text-cream"
          >
            <Printer size={18} />
            Print or save as PDF
          </button>
        </div>
      </div>

      <article className="mx-auto my-3 max-w-[794px] bg-white p-5 text-[13px] leading-[1.45] text-[#1d1714] shadow-[0_8px_30px_rgb(0_0_0/0.18)] sm:p-11 print:m-0 print:max-w-none print:p-0 print:text-[12px] print:leading-[1.35] print:shadow-none">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Skin tracking report
        </h1>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[#4a3b35]">
          <span className={trimmedName ? "" : "print:hidden"}>
            Prepared for:{" "}
            <strong>{trimmedName || "(add your name above)"}</strong>
          </span>
          <span>
            Created {formatDate(report.generatedAt)} with Receipts
            {report.firstScanAt !== null && report.lastScanAt !== null
              ? ` · scans ${formatDate(report.firstScanAt)} to ${formatDate(report.lastScanAt)} (${report.scanCount} ${report.scanCount === 1 ? "scan" : "scans"})`
              : " · no scans yet"}
          </span>
        </div>

        <p className="mt-3.5 rounded-md border-[1.5px] border-[#1d1714] px-3 py-2.5 text-[12.5px]">
          <strong>Please read first.</strong> {REPORT_DISCLAIMER}
        </p>

        <h2 className="mt-5 mb-2 border-b-[1.5px] border-[#1d1714] pb-1 text-[15px] font-semibold print:mt-4 print:break-after-avoid">
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
                  className="border-b border-[#d7ccc3] py-2.5"
                >
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-[12px] text-[#4a3b35]">
                    {product.concern} · started {formatDate(product.startDate)}{" "}
                    (day {product.day})
                    {!product.active &&
                      product.endDate !== null &&
                      ` · stopped ${formatDate(product.endDate)}`}
                  </p>
                  <p className="mt-1.5">
                    <span className="inline-block rounded-[4px] border-[1.5px] border-[#1d1714] px-1.5 text-[11px] font-bold">
                      {product.verdictLabel}
                    </span>
                  </p>
                  {product.lines.map((line) => (
                    <p key={line} className="mt-0.5 text-[12px] text-[#4a3b35]">
                      {line}
                    </p>
                  ))}
                  {(product.scoreChange || product.variation) && (
                    <p className="mt-1 text-[12px] tabular-nums">
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
              <table className="w-full min-w-[640px] border-collapse text-[12px] print:min-w-0">
                <thead>
                  <tr>
                    <th className={th}>Product</th>
                    <th className={th}>Concern</th>
                    <th className={th}>Started</th>
                    <th className={th}>Result so far</th>
                    <th className={`${th} text-right`}>Score before → now</th>
                    <th className={`${th} text-right`}>Normal variation</th>
                  </tr>
                </thead>
                <tbody>
                  {report.products.map((product) => (
                    <tr
                      key={`${product.name}-${product.startDate}`}
                      className="print:break-inside-avoid"
                    >
                      <td className={td}>
                        <strong>{product.name}</strong>
                        {!product.active && product.endDate !== null && (
                          <span className="block text-[11px] text-[#4a3b35]">
                            Stopped {formatDate(product.endDate)}
                          </span>
                        )}
                      </td>
                      <td className={td}>{product.concern}</td>
                      <td className={td}>
                        {formatDate(product.startDate)}
                        <span className="block text-[11px] text-[#4a3b35]">
                          day {product.day}
                        </span>
                      </td>
                      <td className={td}>
                        <span className="inline-block rounded-[4px] border-[1.5px] border-[#1d1714] px-1.5 text-[11px] font-bold">
                          {product.verdictLabel}
                        </span>
                        {product.lines.map((line) => (
                          <span
                            key={line}
                            className="block text-[11px] text-[#4a3b35]"
                          >
                            {line}
                          </span>
                        ))}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {product.scoreChange ?? "—"}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {product.variation ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="mt-2 text-[11px] text-[#4a3b35]">
          Scores run 1 to 100, higher is healthier.
        </p>

        <h2 className="mt-5 mb-2 border-b-[1.5px] border-[#1d1714] pb-1 text-[15px] font-semibold print:mt-4 print:break-after-avoid">
          Scores at each scan
        </h2>
        {report.scans.length === 0 ? (
          <p>No scans yet.</p>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <p className="mb-1.5 text-[11px] text-[#4a3b35] sm:hidden print:hidden">
              Swipe sideways to see every concern.
            </p>
            <table className="w-full min-w-[640px] border-collapse text-[12px] print:min-w-0">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  {report.concernLabels.map((label) => (
                    <th key={label} className={`${th} text-right`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.scans.map((scan) => (
                  <tr
                    key={scan.createdAt}
                    className={`print:break-inside-avoid ${scan.flagged ? "text-[#7c5a12]" : ""}`}
                  >
                    <td className={td}>
                      {formatDate(scan.createdAt)}
                      {scan.startedProducts > 0 && (
                        <span className="block text-[11px] text-[#4a3b35]">
                          {scan.startedProducts === 1
                            ? "a product started"
                            : `${scan.startedProducts} products started`}
                        </span>
                      )}
                      {scan.flagged && (
                        <span className="block text-[11px]">lower quality</span>
                      )}
                    </td>
                    {scan.scores.map((score, index) => (
                      <td
                        key={index}
                        className={`${td} text-right tabular-nums`}
                      >
                        {score ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="mt-5 mb-2 border-b-[1.5px] border-[#1d1714] pb-1 text-[15px] font-semibold print:mt-4 print:break-after-avoid">
          How to read this
        </h2>
        <ul className="grid list-disc gap-x-8 pl-5 sm:grid-cols-2">
          {report.howToRead.map((line) => (
            <li key={line} className="my-0.5 break-inside-avoid">
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3.5 border-t border-[#d7ccc3] pt-2 text-[11px] text-[#4a3b35]">
          Generated by Receipts from the person's own scans. Skin analysis by
          YouCam. Not a medical device, not a diagnosis.
        </p>
      </article>
    </main>
  );
}
