import { Router } from "express";
import type { Request, Response } from "express";
import { brawlStarsService, BrawlStarsApiError } from "./brawlstars.service.js";
import { apiLimiter } from "../../lib/rateLimiter.js";

export const brawlStarsRouter = Router();

// Apply rate limiting to all Brawl Stars proxy routes
brawlStarsRouter.use(apiLimiter);

function handleBsError(err: unknown, res: Response): void {
  if (err instanceof BrawlStarsApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Unexpected error" });
}

brawlStarsRouter.get("/players/:tag", (req: Request, res: Response) => {
  brawlStarsService
    .getPlayer(req.params.tag)
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});

brawlStarsRouter.get("/players/:tag/battlelog", (req: Request, res: Response) => {
  brawlStarsService
    .getBattleLog(req.params.tag)
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});

brawlStarsRouter.get("/brawlers", (_req: Request, res: Response) => {
  brawlStarsService
    .getBrawlers()
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});

brawlStarsRouter.get("/brawlers/:id", (req: Request, res: Response) => {
  brawlStarsService
    .getBrawler(req.params.id)
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});

brawlStarsRouter.get("/clubs/:tag", (req: Request, res: Response) => {
  brawlStarsService
    .getClub(req.params.tag)
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});

brawlStarsRouter.get("/clubs/:tag/members", (req: Request, res: Response) => {
  brawlStarsService
    .getClubMembers(req.params.tag)
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});

brawlStarsRouter.get("/rankings/:countryCode/players", (req: Request, res: Response) => {
  brawlStarsService
    .getPlayerRankings(req.params.countryCode)
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});

brawlStarsRouter.get("/rankings/:countryCode/clubs", (req: Request, res: Response) => {
  brawlStarsService
    .getClubRankings(req.params.countryCode)
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});

brawlStarsRouter.get(
  "/rankings/:countryCode/brawlers/:brawlerId",
  (req: Request, res: Response) => {
    brawlStarsService
      .getBrawlerRankings(req.params.countryCode, req.params.brawlerId)
      .then((data) => res.json(data))
      .catch((err) => handleBsError(err, res));
  },
);

brawlStarsRouter.get("/events/rotation", (_req: Request, res: Response) => {
  brawlStarsService
    .getEventRotation()
    .then((data) => res.json(data))
    .catch((err) => handleBsError(err, res));
});
