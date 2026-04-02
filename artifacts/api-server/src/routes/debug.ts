import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/debug/connection", async (req, res): Promise<void> => {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? "depl " + process.env.WEB_REPL_RENEWAL
        : null;

    if (!hostname) {
      res.json({ error: "REPLIT_CONNECTORS_HOSTNAME not set", env: Object.keys(process.env).filter(k => k.startsWith("REPLIT")) });
      return;
    }

    if (!xReplitToken) {
      res.json({ error: "xReplitToken not available", hasReplId: !!process.env.REPL_IDENTITY, hasWebRenewal: !!process.env.WEB_REPL_RENEWAL });
      return;
    }

    const response = await fetch(
      "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=google-sheet",
      {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      },
    );

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    res.json({
      status: response.status,
      hostname,
      hasToken: true,
      data,
    });
  } catch (err: any) {
    res.json({ error: err.message });
  }
});

export default router;
