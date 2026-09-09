import { z } from "zod";

export const monthlySummaryQuerySchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    startDate: z.coerce.date({ error: "A data inicial é inválida" }).optional(),
    endDate: z.coerce.date({ error: "A data final é inválida" }).optional(),
  })
  .refine((data) => (data.startDate === undefined) === (data.endDate === undefined), {
    message: "startDate e endDate devem ser enviados juntos",
    path: ["endDate"],
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "startDate deve ser menor ou igual a endDate",
    path: ["endDate"],
  });

export type MonthlySummaryQueryDto = z.infer<typeof monthlySummaryQuerySchema>;

export const monthlySummaryResponseSchema = z.object({
  totalIncome: z.number(),
  totalExpense: z.number(),
  balance: z.number(),
});

export type MonthlySummaryResponseDto = z.infer<typeof monthlySummaryResponseSchema>;
