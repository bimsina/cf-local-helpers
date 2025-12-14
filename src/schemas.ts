import { z } from "zod";

export const kvEntrySchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
  expirationTtl: z.coerce.number().optional(), // Allow string input from form to be coerced
  metadata: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Metadata must be valid JSON" }
    ),
});

export type KVEntryInput = z.infer<typeof kvEntrySchema>;
