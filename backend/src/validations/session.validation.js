const { z } = require("zod");

const startSessionSchema = z.object({
  body: z.object({
    subject: z.string().trim().max(100).default("General"),
    studyMode: z.enum(["pomodoro", "deep", "custom"]).default("custom"),
    plannedDurationMinutes: z.number().int().nonnegative().default(0),
    riskMode: z.boolean().default(false)
  })
});

const endSessionSchema = z.object({
  body: z.object({
    inactiveSeconds: z.number().int().nonnegative().default(0),
    notes: z.string().trim().max(1000).optional().default(""),
    subject: z.string().trim().max(100).optional(),
    stopReason: z.string().trim().max(500).optional(),
    antiCheatFlags: z.number().int().nonnegative().default(0),
    sessionQualityTag: z.enum(["deep", "average", "distracted", ""]).default(""),
    studyMode: z.enum(["pomodoro", "deep", "custom"]).optional(),
    plannedDurationMinutes: z.number().int().nonnegative().optional(),
    riskMode: z.boolean().optional()
  })
});

const offlineSyncSchema = z.object({
  body: z.object({
    sessions: z.array(z.object({
      startedAt: z.string().datetime({ offset: true, message: "startedAt must be ISO date" }),
      endedAt: z.string().datetime({ offset: true, message: "endedAt must be ISO date" }),
      focusedMinutes: z.number().int().nonnegative(),
      inactiveSeconds: z.number().int().nonnegative().optional(),
      pauseCount: z.number().int().nonnegative().optional(),
      subject: z.string().trim().max(100).optional(),
      studyMode: z.enum(["pomodoro", "deep", "custom"]).optional(),
      plannedDurationMinutes: z.number().int().nonnegative().optional(),
      riskMode: z.boolean().optional(),
      notes: z.string().max(1000).optional(),
      stopReason: z.string().max(500).optional(),
      sessionQualityTag: z.enum(["deep", "average", "distracted", ""]).optional(),
      date: z.string().optional()
    })).nonempty("Must provide at least one session")
  })
});

module.exports = {
  startSessionSchema,
  endSessionSchema,
  offlineSyncSchema
};
