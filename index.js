import Stripe from "stripe";
import "dotenv/config";

const { STRIPE_TOKEN } = process.env;

const periodSince = "1725163200";

async function fetchStripeInvoicesForPeriod(period) {
  const stripe = new Stripe(STRIPE_TOKEN, { apiVersion: "2022-08-01" });

  const allInvoices = [];
  let hasMore = true;
  let nextPage;

  while (hasMore) {
    const {
      data: invoices,
      has_more,
      next_page,
    } = await stripe.invoices.search({
      query: `created>${period} total>0`,
      limit: 100,
      ...(nextPage && { page: nextPage }),
    });

    allInvoices.push(...invoices);

    hasMore = has_more;

    if (next_page) {
      nextPage = next_page;
    }
  }

  return allInvoices;
}

async function filterOutBaseInvoices(allInvoicesForPeriod) {
  return allInvoicesForPeriod.filter(
    (invoice) => invoice.lines.data.length > 1 && invoice.status === "paid"
  );
}

async function filterOutUsageInvoices(allInvoicesForPeriod) {
  return allInvoicesForPeriod.filter(
    (invoice) => invoice.lines.data.length === 1 && invoice.status === "paid"
  );
}

async function filterOutUnpaidInvoices(allInvoicesForPeriod) {
  return allInvoicesForPeriod.filter((invoice) => invoice.status === "paid");
}

async function calculateInvoicesAmountPaid(filteredInvoices) {
  return filteredInvoices.reduce(
    (acc, current) => acc + current.amount_paid,
    0
  );
}

async function calculateInvoicesTotal(filteredInvoices) {
  return filteredInvoices.reduce((acc, current) => acc + current.total, 0);
}

async function run() {
  const date = new Date(periodSince * 1000);

  console.log(`Totals for all invoices since ${date}`);

  console.log("-------------");

  const allInvoicesForPeriod = await fetchStripeInvoicesForPeriod(periodSince);
  console.log("Total fetched invoices: ", allInvoicesForPeriod.length);

  console.log("-------------");

  const filteredUsageInvoices = await filterOutBaseInvoices(
    allInvoicesForPeriod
  );
  console.log("Total usage invoices: ", filteredUsageInvoices.length);

  const filteredBaseInvoices = await filterOutUsageInvoices(
    allInvoicesForPeriod
  );
  console.log("Total base invoices: ", filteredBaseInvoices.length);

  const filteredPaidInvoices = await filterOutUnpaidInvoices(
    allInvoicesForPeriod
  );
  console.log("Total paid invoices: ", filteredPaidInvoices.length);

  console.log("-------------");

  const calculatedUsageInvoiceTotal = await calculateInvoicesTotal(
    filteredUsageInvoices
  );
  console.log(
    "Total usage amount before credit: ",
    Math.round(calculatedUsageInvoiceTotal / 100)
  );

  const calculatedUsageInvoiceAmountPaid = await calculateInvoicesAmountPaid(
    filteredUsageInvoices
  );
  console.log(
    "Total usage amount after credit: ",
    Math.round(calculatedUsageInvoiceAmountPaid / 100)
  );

  const calculatedBaseInvoiceAmountPaid = await calculateInvoicesAmountPaid(
    filteredBaseInvoices
  );
  console.log(
    "Total base amount: ",
    Math.round(calculatedBaseInvoiceAmountPaid / 100)
  );

  const calculatedAllInvoiceAmountPaid = await calculateInvoicesAmountPaid(
    filteredPaidInvoices
  );
  console.log(
    "Total paid amount: ",
    Math.round(calculatedAllInvoiceAmountPaid / 100)
  );
}

run();
