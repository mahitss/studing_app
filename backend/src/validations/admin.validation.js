const { z } = require("zod");

const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(["user", "admin"], { required_error: "Role is required" })
  })
});

const updateStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({ required_error: "isActive status is required" })
  })
});

module.exports = {
  updateRoleSchema,
  updateStatusSchema
};
