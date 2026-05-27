import cors from "cors";
import express from "express";

type ServiceStatus = {
  ok: boolean;
  service: "api";
  timestamp: string;
};

type AuthBootstrap = {
  nextStep: string;
  providers: Array<"email-password" | "stellar-wallet-link">;
  sessionStrategy: "jwt";
};

const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/health", (_request, response) => {
  const payload: ServiceStatus = {
    ok: true,
    service: "api",
    timestamp: new Date().toISOString()
  };

  response.json(payload);
});

app.get("/api/v1/auth/bootstrap", (_request, response) => {
  const payload: AuthBootstrap = {
    providers: ["email-password", "stellar-wallet-link"],
    sessionStrategy: "jwt",
    nextStep: "Implement registration, login, refresh, logout, and wallet-linking flows."
  };

  response.json(payload);
});

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
