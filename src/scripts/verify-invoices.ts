// Valida, após o backfill, que invoice.totalAmount de cada fatura de cartão
// bate com a soma real das transações vinculadas a ela. Um MISMATCH indica
// fatura que já existia com total calculado por outro caminho (e agora foi
// somada duas vezes) ou uma transação órfã que escapou do backfill.
//
// Uso:
//   pnpm tsx src/scripts/verify-invoices.ts
//
// Termina com exit code 1 se algum MISMATCH for encontrado (útil para
// encadear em CI ou em um passo de validação pós-deploy).

import { prisma } from "../shared/lib/prisma.js";

const BATCH_SIZE = 200;
// Tolerância de 1 centavo para absorver arredondamento de Decimal -> Number.
const TOLERANCE = 0.01;

const main = async () => {
  console.log("Verificando integridade das faturas...");

  let cursor: string | undefined;
  const rows: {
    invoiceId: string;
    period: string;
    totalAmount: string;
    calculatedSum: string;
    status: "OK" | "MISMATCH";
  }[] = [];

  for (;;) {
    const invoices = await prisma.creditCardInvoice.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (invoices.length === 0) break;

    for (const invoice of invoices) {
      const { _sum } = await prisma.transaction.aggregate({
        where: { invoiceId: invoice.id, deletedAt: null },
        _sum: { amount: true },
      });

      const totalAmount = Number(invoice.totalAmount);
      const calculatedSum = Number(_sum.amount ?? 0);
      const status = Math.abs(totalAmount - calculatedSum) <= TOLERANCE ? "OK" : "MISMATCH";

      rows.push({
        invoiceId: invoice.id,
        period: `${invoice.periodStartDate.toISOString().slice(0, 10)} -> ${invoice.periodEndDate.toISOString().slice(0, 10)}`,
        totalAmount: totalAmount.toFixed(2),
        calculatedSum: calculatedSum.toFixed(2),
        status,
      });
    }

    const lastInvoice = invoices[invoices.length - 1];
    if (!lastInvoice) break;
    cursor = lastInvoice.id;
  }

  console.table(rows);

  const mismatches = rows.filter((row) => row.status === "MISMATCH");
  console.log(
    `Verificação concluída. ${rows.length} faturas verificadas, ${mismatches.length} inconsistência(s).`
  );

  if (mismatches.length > 0) {
    console.error(
      "Faturas com MISMATCH:",
      mismatches.map((row) => row.invoiceId).join(", ")
    );
    process.exitCode = 1;
  }
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
