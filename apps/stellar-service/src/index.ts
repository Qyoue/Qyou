import express from "express";
import { Horizon } from "@stellar/stellar-sdk";

type ServiceStatus = {
  ok: boolean;
  service: "stellar-service";
  timestamp: string;
};

type StellarServiceInfo = {
  latestLedgerSequence: number | null;
  network: string;
  rpcUrl: string;
};

const port = Number(process.env.PORT ?? 4100);
const network = process.env.STELLAR_NETWORK ?? "testnet";
const rpcUrl = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");

const app = express();

app.get("/health", (_request, response) => {
  const payload: ServiceStatus = {
    ok: true,
    service: "stellar-service",
    timestamp: new Date().toISOString()
  };

  response.json(payload);
});

app.get("/api/v1/stellar/info", async (_request, response) => {
  const latestLedger = await horizonServer.ledgers().order("desc").limit(1).call();
  const payload: StellarServiceInfo = {
    latestLedgerSequence: latestLedger.records[0]?.sequence ?? null,
    network,
    rpcUrl
  };

  response.json(payload);
});

app.listen(port, () => {
  console.log(`[stellar-service] listening on http://localhost:${port}`);
});
