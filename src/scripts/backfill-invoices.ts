import "dotenv/config";

// Script de migração pontual: liga transações de cartão legadas (sem invoiceId)
// à fatura correspondente, criando a fatura quando ela ainda não existir.
//
// Reaproveita computeInvoicePeriod do create-transaction.use-case para garantir
// que as faturas geradas aqui usem exatamente a mesma regra de período que o
// sistema usa ao criar transações novas — se essa lógica divergir, faturas
// antigas e novas passam a ter ranges diferentes e o unique constraint
// [creditCardId, periodStartDate, periodEndDate] fica inconsistente.
//
// Uso:
//   pnpm tsx src/scripts/backfill-invoices.ts --dry-run   (não escreve nada, só reporta)
//   pnpm tsx src/scripts/backfill-invoices.ts             (aplica de fato)
//
// Para testar contra o banco de dev antes de rodar em prod, defina
// USE_DEV_DATABASE=true no ambiente (ver src/shared/lib/env.ts).
//
// Sequência recomendada para produção:
//   1. Backup do banco de prod (snapshot / pg_dump)
//   2. USE_DEV_DATABASE=true pnpm tsx src/scripts/backfill-invoices.ts --dry-run
//   3. USE_DEV_DATABASE=true pnpm tsx src/scripts/backfill-invoices.ts
//   4. pnpm tsx src/scripts/backfill-invoices.ts --dry-run   (contra prod)
//   5. pnpm tsx src/scripts/backfill-invoices.ts             (contra prod)
//   6. pnpm tsx src/scripts/verify-invoices.ts               (valida integridade)

import { prisma } from "../shared/lib/prisma.js";
import { computeInvoicePeriod } from "../modules/transactions/use-cases/create-transaction.use-case.js";

const isDryRun = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

type OrphanTransaction = {
  id: string;
  amount: unknown;
  date: Date;
  creditCardId: string;
  creditCard: { closingDay: number; dueDay: number } | null;
};

type PendingInvoice = {
  creditCardId: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  existingInvoiceId: string | null;
  existingTotal: number;
  transactionIds: string[];
  addedAmount: number;
};

const pendingByKey = new Map<string, PendingInvoice>();

const periodKey = (creditCardId: string, periodStart: Date, periodEnd: Date) =>
  `${creditCardId}::${periodStart.toISOString()}::${periodEnd.toISOString()}`;

// Simula, em memória, o que backfillOne faria no banco — necessário porque em
// dry-run nenhuma fatura é de fato criada, então múltiplas transações órfãs do
// mesmo período precisam ser agrupadas aqui em vez de cada uma "não achar" a
// fatura da anterior e reportar uma criação duplicada.
const previewOne = async (transaction: OrphanTransaction) => {
  if (!transaction.creditCard) return;

  const { periodStart, periodEnd, dueDate } = computeInvoicePeriod(
    transaction.date,
    transaction.creditCard.closingDay,
    transaction.creditCard.dueDay
  );
  const amount = Number(transaction.amount);
  const key = periodKey(transaction.creditCardId, periodStart, periodEnd);

  let pending = pendingByKey.get(key);
  if (!pending) {
    const existingInvoice = await prisma.creditCardInvoice.findFirst({
      where: {
        creditCardId: transaction.creditCardId,
        periodStartDate: { lte: transaction.date },
        periodEndDate: { gte: transaction.date },
        deletedAt: null,
      },
    });

    pending = {
      creditCardId: transaction.creditCardId,
      periodStart,
      periodEnd,
      dueDate,
      existingInvoiceId: existingInvoice?.id ?? null,
      existingTotal: existingInvoice ? Number(existingInvoice.totalAmount) : 0,
      transactionIds: [],
      addedAmount: 0,
    };
    pendingByKey.set(key, pending);
  }

  pending.transactionIds.push(transaction.id);
  pending.addedAmount += amount;
};

const backfillOne = async (transaction: OrphanTransaction) => {
  if (!transaction.creditCard) return null;

  const { periodStart, periodEnd, dueDate } = computeInvoicePeriod(
    transaction.date,
    transaction.creditCard.closingDay,
    transaction.creditCard.dueDay
  );
  const amount = Number(transaction.amount);

  return prisma.$transaction(async (tx) => {
    let invoice = await tx.creditCardInvoice.findFirst({
      where: {
        creditCardId: transaction.creditCardId,
        periodStartDate: { lte: transaction.date },
        periodEndDate: { gte: transaction.date },
        deletedAt: null,
      },
    });

    if (!invoice) {
      invoice = await tx.creditCardInvoice.create({
        data: {
          creditCardId: transaction.creditCardId,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          dueDate,
          totalAmount: 0,
        },
      });
    }

    await tx.creditCardInvoice.update({
      where: { id: invoice.id },
      data: { totalAmount: { increment: amount } },
    });

    await tx.transaction.update({
      where: { id: transaction.id },
      data: { invoiceId: invoice.id },
    });

    return { transactionId: transaction.id, invoiceId: invoice.id, amount };
  });
};

const main = async () => {
  console.log(`Iniciando backfill de faturas legadas${isDryRun ? " (dry-run)" : ""}...`);

  let processed = 0;
  let cursor: string | undefined;
  const invoicesTouched = new Set<string>();

  for (;;) {
    const orphanTransactions = await prisma.transaction.findMany({
      where: {
        creditCardId: { not: null },
        invoiceId: null,
        deletedAt: null,
      },
      include: { creditCard: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (orphanTransactions.length === 0) break;

    for (const transaction of orphanTransactions as OrphanTransaction[]) {
      if (isDryRun) {
        await previewOne(transaction);
        processed += 1;
      } else {
        const result = await backfillOne(transaction);
        if (result) {
          processed += 1;
          invoicesTouched.add(result.invoiceId);
          console.log(`transação ${result.transactionId} -> fatura ${result.invoiceId}`);
        }
      }
    }

    const lastTransaction = orphanTransactions[orphanTransactions.length - 1];
    if (!lastTransaction) break;
    cursor = lastTransaction.id;
  }

  if (isDryRun) {
    const rows = Array.from(pendingByKey.values()).map((pending) => ({
      creditCardId: pending.creditCardId,
      period: `${pending.periodStart.toISOString().slice(0, 10)} -> ${pending.periodEnd.toISOString().slice(0, 10)}`,
      action: pending.existingInvoiceId ? `UPDATE ${pending.existingInvoiceId}` : "CREATE",
      transactions: pending.transactionIds.length,
      addedAmount: pending.addedAmount.toFixed(2),
      projectedTotal: (pending.existingTotal + pending.addedAmount).toFixed(2),
    }));
    console.table(rows);
  }

  const invoicesImpacted = isDryRun ? pendingByKey.size : invoicesTouched.size;
  console.log(
    `Backfill ${isDryRun ? "(dry-run) " : ""}concluído. ${processed} transações processadas, ${invoicesImpacted} faturas impactadas.`
  );
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
