const { z } = require("zod");
const zxcvbn = require("zxcvbn");

const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid neural ID format"),
    password: z.string()
      .min(8, "Protocol key must be 8+ characters")
      .superRefine((val, ctx) => {
        const result = zxcvbn(val);
        if (result.score < 3) {
          const feedback = result.feedback;
          const suggestions = feedback.suggestions?.join(" ") || "";
          const warning = feedback.warning || "";
          const detail = [warning, suggestions].filter(Boolean).join(". ") || "Choose a longer or more varied password.";
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Password is too weak: ${detail}`,
          });
        }
      }),
    name: z.string().trim().min(1, "Identity name required"),
    college: z.string().optional(),
    identityType: z.enum(["Casual", "Serious", "Hardcore"]).optional(),
    motivationWhy: z.string().optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required")
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string()
      .min(8, "Protocol key must be 8+ characters")
      .superRefine((val, ctx) => {
        const result = zxcvbn(val);
        if (result.score < 3) {
          const feedback = result.feedback;
          const suggestions = feedback.suggestions?.join(" ") || "";
          const warning = feedback.warning || "";
          const detail = [warning, suggestions].filter(Boolean).join(". ") || "Choose a longer or more varied password.";
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Password is too weak: ${detail}`,
          });
        }
      })
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  resetPasswordSchema
};
