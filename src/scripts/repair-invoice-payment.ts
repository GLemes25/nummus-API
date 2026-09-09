import "dotenv/config";

// Script de reparo pontual: desfaz o(s) pagamento(s) registrado(s) por engano em uma
// fatura específica, restaurando-a ao estado anterior ao pagamento.
//
// Reaproveita a mesma reversão usada por DELETE /transactions/:id
// (transactionRepository.softDeleteWithReversal) para garantir que o resultado seja
// idêntico ao de excluir a transação de pagamento pela API: a transação de pagamento
// é soft-deletada, o saldo da carteira é reembolsado, invoice.paidAmount/paid voltam
// ao estado anterior e as transações do cartão que o pagamento quitou voltam a
// aparecer como pendentes (paidAt: null).
//
// Uso:
//   pnpm tsx src/scripts/repair-invoice-payment.ts --invoice-id=<id> --dry-run
//   pnpm tsx src/scripts/repair-invoice-payment.ts --invoice-id=<id>

import { prisma } from "../shared/lib/prisma.js";
import { transactionRepository } from "../modules/transactions/repositories/transaction.repository.js";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const invoiceIdArg = args.find((arg) => arg.startsWith("--invoice-id="));
const invoiceId = invoiceIdArg?.split("=")[1];

const main = async () => {
  if (!invoiceId) {
    console.error("Uso: pnpm tsx src/scripts/repair-invoice-payment.ts --invoice-id=<id> [--dry-run]");
    process.exitCode = 1;
    return;
  }

  const invoice = await prisma.creditCardInvoice.findFirst({ where: { id: invoiceId } });

  if (!invoice) {
    console.error(`Fatura ${invoiceId} não encontrada.`);
    process.exitCode = 1;
    return;
  }

  // Transações de pagamento: saída de carteira vinculada à fatura, sem creditCardId
  // (diferente de uma compra no cartão, que também carrega invoiceId).
  const paymentTransactions = await prisma.transaction.findMany({
    where: { invoiceId, walletId: { not: null }, creditCardId: null, deletedAt: null },
    orderBy: { date: "asc" },
  });

  console.log(
    `Fatura ${invoiceId}: totalAmount=${Number(invoice.totalAmount).toFixed(2)}, paidAmount=${Number(invoice.paidAmount).toFixed(2)}, paid=${invoice.paid}`
  );
  console.log(`${paymentTransactions.length} transação(ões) de pagamento encontrada(s) para reverter.`);

  if (paymentTransactions.length === 0) {
    console.log("Nada a reparar.");
    return;
  }

  if (isDryRun) {
    console.table(
      paymentTransactions.map((t) => ({
        transactionId: t.id,
        amount: Number(t.amount).toFixed(2),
        date: t.date.toISOString().slice(0, 10),
      }))
    );
    console.log(
      `(dry-run) paidAmount projetado após reparo: ${Math.max(0, Number(invoice.paidAmount) - paymentTransactions.reduce((sum, t) => sum + Number(t.amount), 0)).toFixed(2)}`
    );
    return;
  }

  for (const transaction of paymentTransactions) {
    await transactionRepository.softDeleteWithReversal(transaction.id);
    console.log(`Transação de pagamento ${transaction.id} revertida.`);
  }

  const invoiceAfter = await prisma.creditCardInvoice.findFirst({ where: { id: invoiceId } });
  console.log(
    `Fatura ${invoiceId} restaurada: paidAmount=${Number(invoiceAfter?.paidAmount ?? 0).toFixed(2)}, paid=${invoiceAfter?.paid ?? false}`
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
