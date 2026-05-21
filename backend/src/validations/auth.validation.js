const { z } = require("zod");
const zxcvbn = require("zxcvbn");

const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid neural ID format"),
    password: z.string()
      .min(8, "Protocol key must be 8+ characters")
      .refine((val) => {
        const result = zxcvbn(val);
        return result.score >= 3;
      }, {
        message: "Password is too weak. Choose a stronger key.",
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

module.exports = {
  registerSchema,
  loginSchema
};
