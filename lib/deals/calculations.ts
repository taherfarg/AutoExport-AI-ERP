type MonthlyPaymentInput = {
  principal: number;
  annualRate: number;
  termMonths: number;
  balloonPayment?: number;
};

type FinanceAmountInput = {
  vehiclePrice: number;
  productTotal: number;
  downPayment: number;
  tradeInValue: number;
};

type DealStructureInput = FinanceAmountInput & {
  annualRate: number;
  termMonths: number;
  balloonPayment?: number;
};

type FiProductInput = {
  sellingPrice: number;
  costAmount: number;
  status: string;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateMonthlyPayment({
  principal,
  annualRate,
  termMonths,
  balloonPayment = 0,
}: MonthlyPaymentInput) {
  const safePrincipal = Math.max(principal - Math.max(balloonPayment, 0), 0);
  const safeMonths = Math.max(Math.trunc(termMonths), 1);

  if (annualRate <= 0) {
    return money(safePrincipal / safeMonths);
  }

  const monthlyRate = annualRate / 100 / 12;
  const discountFactor = Math.pow(1 + monthlyRate, safeMonths);
  return money((safePrincipal * monthlyRate * discountFactor) / (discountFactor - 1));
}

export function calculateFinanceAmount({
  vehiclePrice,
  productTotal,
  downPayment,
  tradeInValue,
}: FinanceAmountInput) {
  return money(Math.max(vehiclePrice + productTotal - downPayment - tradeInValue, 0));
}

export function calculateFiGross(products: FiProductInput[]) {
  return money(
    products
      .filter((product) => product.status === "accepted")
      .reduce((sum, product) => sum + Math.max(product.sellingPrice - product.costAmount, 0), 0),
  );
}

export function calculateDealStructure(input: DealStructureInput) {
  const financeAmount = calculateFinanceAmount(input);
  const monthlyPayment = calculateMonthlyPayment({
    principal: financeAmount,
    annualRate: input.annualRate,
    termMonths: input.termMonths,
    balloonPayment: input.balloonPayment ?? 0,
  });

  return {
    financeAmount,
    monthlyPayment,
    totalPayable: money(monthlyPayment * Math.max(Math.trunc(input.termMonths), 1) + Math.max(input.balloonPayment ?? 0, 0)),
  };
}
