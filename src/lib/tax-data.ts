export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface CountryTaxInfo {
  country: string;
  currency: string;
  incomeTax: {
    brackets: TaxBracket[];
    description: string;
  };
  salesTax: {
    rate: number;
    name: string;
    description: string;
  };
  capitalGainsTax: {
    shortTerm: number;
    longTerm: number;
    description: string;
  };
  corporateTax: {
    rate: number;
    description: string;
  };
  otherTaxes: {
    name: string;
    rate: number;
    description: string;
  }[];
}

export const taxData: CountryTaxInfo[] = [
  {
    country: "United States",
    currency: "USD",
    incomeTax: {
      brackets: [
        { min: 0, max: 11000, rate: 10 },
        { min: 11001, max: 44725, rate: 12 },
        { min: 44726, max: 95375, rate: 22 },
        { min: 95376, max: 182100, rate: 24 },
        { min: 182101, max: 231250, rate: 32 },
        { min: 231251, max: 578125, rate: 35 },
        { min: 578126, max: null, rate: 37 },
      ],
      description: "Progressive federal income tax (2024 rates for single filers)",
    },
    salesTax: {
      rate: 7.12,
      name: "Sales Tax",
      description: "Average combined state and local sales tax rate",
    },
    capitalGainsTax: {
      shortTerm: 37,
      longTerm: 20,
      description: "Short-term: ordinary income rates; Long-term: 0%, 15%, or 20% based on income",
    },
    corporateTax: {
      rate: 21,
      description: "Federal corporate income tax rate",
    },
    otherTaxes: [
      { name: "Social Security Tax", rate: 6.2, description: "On wages up to $160,200" },
      { name: "Medicare Tax", rate: 1.45, description: "On all wages" },
      { name: "Property Tax", rate: 1.1, description: "Average effective rate on home value" },
    ],
  },
  {
    country: "United Kingdom",
    currency: "GBP",
    incomeTax: {
      brackets: [
        { min: 0, max: 12570, rate: 0 },
        { min: 12571, max: 50270, rate: 20 },
        { min: 50271, max: 125140, rate: 40 },
        { min: 125141, max: null, rate: 45 },
      ],
      description: "Progressive income tax rates (2024/25 tax year)",
    },
    salesTax: {
      rate: 20,
      name: "VAT (Value Added Tax)",
      description: "Standard VAT rate; reduced rates of 5% and 0% apply to certain goods",
    },
    capitalGainsTax: {
      shortTerm: 20,
      longTerm: 20,
      description: "18% for basic rate taxpayers, 20% for higher/additional rate taxpayers",
    },
    corporateTax: {
      rate: 25,
      description: "Main rate of corporation tax",
    },
    otherTaxes: [
      { name: "National Insurance", rate: 12, description: "On earnings between £12,570 and £50,270" },
      { name: "Council Tax", rate: 0, description: "Local property tax based on property value band" },
      { name: "Stamp Duty", rate: 5, description: "On property purchases over £250,000" },
    ],
  },
  {
    country: "India",
    currency: "INR",
    incomeTax: {
      brackets: [
        { min: 0, max: 300000, rate: 0 },
        { min: 300001, max: 600000, rate: 5 },
        { min: 600001, max: 900000, rate: 10 },
        { min: 900001, max: 1200000, rate: 15 },
        { min: 1200001, max: 1500000, rate: 20 },
        { min: 1500001, max: null, rate: 30 },
      ],
      description: "New tax regime rates (2024-25); Old regime also available",
    },
    salesTax: {
      rate: 18,
      name: "GST (Goods and Services Tax)",
      description: "Standard GST rate; rates of 5%, 12%, and 28% apply to different goods",
    },
    capitalGainsTax: {
      shortTerm: 15,
      longTerm: 10,
      description: "Short-term: 15% for equity; Long-term: 10% on gains above ₹1 lakh",
    },
    corporateTax: {
      rate: 25,
      description: "For companies with turnover up to ₹400 crore",
    },
    otherTaxes: [
      { name: "Securities Transaction Tax", rate: 0.1, description: "On equity delivery transactions" },
      { name: "TDS (Tax Deducted at Source)", rate: 10, description: "Varies by income type" },
      { name: "Property Tax", rate: 0, description: "Varies by municipality" },
    ],
  },
  {
    country: "Canada",
    currency: "CAD",
    incomeTax: {
      brackets: [
        { min: 0, max: 53359, rate: 15 },
        { min: 53360, max: 106717, rate: 20.5 },
        { min: 106718, max: 165430, rate: 26 },
        { min: 165431, max: 235675, rate: 29 },
        { min: 235676, max: null, rate: 33 },
      ],
      description: "Federal income tax rates (2024); provincial taxes also apply",
    },
    salesTax: {
      rate: 13,
      name: "HST/GST/PST",
      description: "Varies by province; HST 13-15%, GST 5%, or GST+PST combination",
    },
    capitalGainsTax: {
      shortTerm: 33,
      longTerm: 16.5,
      description: "50% of capital gains included in taxable income",
    },
    corporateTax: {
      rate: 15,
      description: "Federal small business rate; general rate is 15%",
    },
    otherTaxes: [
      { name: "CPP (Canada Pension Plan)", rate: 5.95, description: "On earnings up to $66,600" },
      { name: "EI (Employment Insurance)", rate: 1.66, description: "On insurable earnings" },
      { name: "Property Tax", rate: 0, description: "Municipal tax varies by location" },
    ],
  },
  {
    country: "Germany",
    currency: "EUR",
    incomeTax: {
      brackets: [
        { min: 0, max: 11604, rate: 0 },
        { min: 11605, max: 17005, rate: 14 },
        { min: 17006, max: 66760, rate: 24 },
        { min: 66761, max: 277825, rate: 42 },
        { min: 277826, max: null, rate: 45 },
      ],
      description: "Progressive income tax rates (2024); solidarity surcharge may apply",
    },
    salesTax: {
      rate: 19,
      name: "MwSt (Mehrwertsteuer/VAT)",
      description: "Standard VAT rate; reduced rate of 7% for certain goods",
    },
    capitalGainsTax: {
      shortTerm: 26.375,
      longTerm: 26.375,
      description: "Flat rate capital gains tax (Abgeltungsteuer)",
    },
    corporateTax: {
      rate: 30,
      description: "Combined federal and trade tax (average)",
    },
    otherTaxes: [
      { name: "Social Security", rate: 18.6, description: "Pension insurance contribution" },
      { name: "Health Insurance", rate: 14.6, description: "Mandatory health insurance" },
      { name: "Church Tax", rate: 8, description: "Optional, for registered church members" },
    ],
  },
  {
    country: "Australia",
    currency: "AUD",
    incomeTax: {
      brackets: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18201, max: 45000, rate: 19 },
        { min: 45001, max: 120000, rate: 32.5 },
        { min: 120001, max: 180000, rate: 37 },
        { min: 180001, max: null, rate: 45 },
      ],
      description: "Income tax rates (2024-25); Medicare levy also applies",
    },
    salesTax: {
      rate: 10,
      name: "GST (Goods and Services Tax)",
      description: "Standard GST rate; some goods are GST-free",
    },
    capitalGainsTax: {
      shortTerm: 45,
      longTerm: 22.5,
      description: "50% discount on long-term capital gains (held >12 months)",
    },
    corporateTax: {
      rate: 25,
      description: "For base rate entities; otherwise 30%",
    },
    otherTaxes: [
      { name: "Medicare Levy", rate: 2, description: "On taxable income" },
      { name: "Superannuation", rate: 11, description: "Employer contribution to retirement fund" },
      { name: "Land Tax", rate: 0, description: "State-based tax on property value" },
    ],
  },
  {
    country: "France",
    currency: "EUR",
    incomeTax: {
      brackets: [
        { min: 0, max: 11294, rate: 0 },
        { min: 11295, max: 28797, rate: 11 },
        { min: 28798, max: 82341, rate: 30 },
        { min: 82342, max: 177106, rate: 41 },
        { min: 177107, max: null, rate: 45 },
      ],
      description: "Progressive income tax (2024); family quotient system applies",
    },
    salesTax: {
      rate: 20,
      name: "TVA (Taxe sur la Valeur Ajoutée/VAT)",
      description: "Standard VAT rate; reduced rates of 5.5% and 10% apply",
    },
    capitalGainsTax: {
      shortTerm: 30,
      longTerm: 30,
      description: "Flat rate tax on capital gains (PFU)",
    },
    corporateTax: {
      rate: 25,
      description: "Standard corporate income tax rate",
    },
    otherTaxes: [
      { name: "Social Contributions", rate: 17.2, description: "On investment income" },
      { name: "Wealth Tax (IFI)", rate: 1.5, description: "On real estate wealth over €1.3M" },
      { name: "Property Tax", rate: 0, description: "Local tax based on property value" },
    ],
  },
  {
    country: "Japan",
    currency: "JPY",
    incomeTax: {
      brackets: [
        { min: 0, max: 1950000, rate: 5 },
        { min: 1950001, max: 3300000, rate: 10 },
        { min: 3300001, max: 6950000, rate: 20 },
        { min: 6950001, max: 9000000, rate: 23 },
        { min: 9000001, max: 18000000, rate: 33 },
        { min: 18000001, max: 40000000, rate: 40 },
        { min: 40000001, max: null, rate: 45 },
      ],
      description: "National income tax rates (2024); local inhabitant tax also applies",
    },
    salesTax: {
      rate: 10,
      name: "Consumption Tax",
      description: "Standard rate; reduced rate of 8% for food and newspapers",
    },
    capitalGainsTax: {
      shortTerm: 20.315,
      longTerm: 20.315,
      description: "Includes income tax, local tax, and reconstruction tax",
    },
    corporateTax: {
      rate: 30.62,
      description: "Effective corporate tax rate (national and local combined)",
    },
    otherTaxes: [
      { name: "Inhabitant Tax", rate: 10, description: "Local income tax" },
      { name: "Social Insurance", rate: 15, description: "Employee's share of pension and health" },
      { name: "Property Tax", rate: 1.4, description: "Fixed asset tax on real estate" },
    ],
  },
  {
    country: "Singapore",
    currency: "SGD",
    incomeTax: {
      brackets: [
        { min: 0, max: 20000, rate: 0 },
        { min: 20001, max: 30000, rate: 2 },
        { min: 30001, max: 40000, rate: 3.5 },
        { min: 40001, max: 80000, rate: 7 },
        { min: 80001, max: 120000, rate: 11.5 },
        { min: 120001, max: 160000, rate: 15 },
        { min: 160001, max: 200000, rate: 18 },
        { min: 200001, max: 240000, rate: 19 },
        { min: 240001, max: 280000, rate: 19.5 },
        { min: 280001, max: 320000, rate: 20 },
        { min: 320001, max: 500000, rate: 22 },
        { min: 500001, max: 1000000, rate: 23 },
        { min: 1000001, max: null, rate: 24 },
      ],
      description: "Resident individual income tax rates (YA 2024)",
    },
    salesTax: {
      rate: 9,
      name: "GST (Goods and Services Tax)",
      description: "Standard GST rate (increased to 9% in 2024)",
    },
    capitalGainsTax: {
      shortTerm: 0,
      longTerm: 0,
      description: "No capital gains tax in Singapore",
    },
    corporateTax: {
      rate: 17,
      description: "Corporate income tax rate with partial tax exemptions available",
    },
    otherTaxes: [
      { name: "CPF (Central Provident Fund)", rate: 20, description: "Employee contribution up to 20%" },
      { name: "Property Tax", rate: 16, description: "For non-owner-occupied residential (progressive)" },
      { name: "Stamp Duty", rate: 4, description: "On property transactions" },
    ],
  },
];

export function getTaxInfoByCountry(countryName: string): CountryTaxInfo | undefined {
  return taxData.find((t) => t.country.toLowerCase() === countryName.toLowerCase());
}

export function calculateIncomeTax(income: number, country: string): number {
  const taxInfo = getTaxInfoByCountry(country);
  if (!taxInfo) return 0;

  let totalTax = 0;
  const brackets = taxInfo.incomeTax.brackets;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const bracketMax = bracket.max || Infinity;
    
    if (income > bracket.min) {
      const taxableInBracket = Math.min(income, bracketMax) - bracket.min;
      totalTax += (taxableInBracket * bracket.rate) / 100;
    }
  }

  return totalTax;
}