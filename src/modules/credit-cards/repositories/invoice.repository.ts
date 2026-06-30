import { prisma } from "../../../shared/lib/prisma.js";

type CreateInvoiceData = {
  creditCardId: string;
  periodStartDate: Date;
  periodEndDate: Date;
  dueDate: Date;
  totalAmount: number;
};

export const invoiceRepository = {
  findByDateAndCard: async (creditCardId: string, date: Date) => {
    return prisma.creditCardInvoice.findFirst({
      where: {
        creditCardId,
        periodStartDate: { lte: date },
        periodEndDate: { gte: date },
        deletedAt: null,
      },
    });
  },

  create: async (data: CreateInvoiceData) => {
    return prisma.creditCardInvoice.create({ data });
  },

  incrementTotal: async (invoiceId: string, amount: number) => {
    return prisma.creditCardInvoice.update({
      where: { id: invoiceId },
      data: { totalAmount: { increment: amount } },
    });
  },
};
