import { getAuthBaselineReport } from "./index.js";

function printSection(title: string, lines: string[]): void {
  if (lines.length === 0) return;
  // eslint-disable-next-line no-console
  console.log(`\n${title}`);
  for (const line of lines) {
    // eslint-disable-next-line no-console
    console.log(`- ${line}`);
  }
}

export function main(): void {
  const report = getAuthBaselineReport();

  // eslint-disable-next-line no-console
  console.log("AUTH baseline report");
  // eslint-disable-next-line no-console
  console.log(`nodeEnv: ${report.nodeEnv}`);
  // eslint-disable-next-line no-console
  console.log(
    `auth: accessTtl=${report.auth.accessTokenTtlSeconds}s refreshTtl=${report.auth.refreshTokenTtlSeconds}s corsOrigin=${report.auth.corsOrigin}`
  );
  // eslint-disable-next-line no-console
  console.log(
    `stellar: network=${report.stellar.network} horizon=${report.stellar.horizonUrl} rpc=${report.stellar.rpcUrl}`
  );

  printSection("Warnings", report.warnings);
  printSection("Errors", report.errors);

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();

