const { z } = require("zod");

const updateGoalConfigSchema = z.object({
  body: z.object({
    dailyMinutes: z.number().int().nonnegative().optional(),
    weeklyTargetMinutes: z.number().int().nonnegative().optional(),
    weeklySessionTarget: z.number().int().nonnegative().optional()
  })
});

const updateUserProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name cannot be empty").optional(),
    email: z.string().email("Invalid email format").optional(),
    college: z.string().trim().optional(),
    identityType: z.enum(["Casual", "Serious", "Hardcore"]).optional(),
    motivationWhy: z.string().trim().max(250).optional()
  })
});

module.exports = {
  updateGoalConfigSchema,
  updateUserProfileSchema
};
