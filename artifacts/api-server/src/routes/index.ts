import { type Express } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import accountsRouter from "./accounts";
import contactsRouter from "./contacts";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import analysesRouter from "./analyses";
import insightsRouter from "./insights";
import sequencesRouter from "./sequences";
import activitiesRouter from "./activities";
import opportunitiesRouter from "./opportunities";
import experimentsRouter from "./experiments";

export function registerRoutes(app: Express) {
  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", accountsRouter);
  app.use("/api", contactsRouter);
  app.use("/api", settingsRouter);
  app.use("/api", dashboardRouter);
  app.use("/api", analysesRouter);
  app.use("/api", insightsRouter);
  app.use("/api", sequencesRouter);
  app.use("/api", activitiesRouter);
  app.use("/api", opportunitiesRouter);
  app.use("/api", experimentsRouter);
}
