// Country data with timezone, currency, and cities
export interface Country {
  code: string;
  name: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  cities: string[];
}

export const countries: Country[] = [
  {
    code: "US",
    name: "United States",
    timezone: "America/New_York",
    currency: "USD",
    currencySymbol: "$",
    cities: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"]
  },
  {
    code: "GB",
    name: "United Kingdom",
    timezone: "Europe/London",
    currency: "GBP",
    currencySymbol: "£",
    cities: ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Sheffield", "Edinburgh", "Bristol", "Cardiff"]
  },
  {
    code: "CA",
    name: "Canada",
    timezone: "America/Toronto",
    currency: "CAD",
    currencySymbol: "C$",
    cities: ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Victoria"]
  },
  {
    code: "AU",
    name: "Australia",
    timezone: "Australia/Sydney",
    currency: "AUD",
    currencySymbol: "A$",
    cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Newcastle", "Wollongong", "Hobart"]
  },
  {
    code: "IN",
    name: "India",
    timezone: "Asia/Kolkata",
    currency: "INR",
    currencySymbol: "₹",
    cities: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat"]
  },
  {
    code: "DE",
    name: "Germany",
    timezone: "Europe/Berlin",
    currency: "EUR",
    currencySymbol: "€",
    cities: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund", "Essen", "Leipzig"]
  },
  {
    code: "FR",
    name: "France",
    timezone: "Europe/Paris",
    currency: "EUR",
    currencySymbol: "€",
    cities: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"]
  },
  {
    code: "JP",
    name: "Japan",
    timezone: "Asia/Tokyo",
    currency: "JPY",
    currencySymbol: "¥",
    cities: ["Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto", "Kawasaki", "Saitama"]
  },
  {
    code: "CN",
    name: "China",
    timezone: "Asia/Shanghai",
    currency: "CNY",
    currencySymbol: "¥",
    cities: ["Shanghai", "Beijing", "Guangzhou", "Shenzhen", "Chengdu", "Tianjin", "Chongqing", "Wuhan", "Hangzhou", "Xi'an"]
  },
  {
    code: "BR",
    name: "Brazil",
    timezone: "America/Sao_Paulo",
    currency: "BRL",
    currencySymbol: "R$",
    cities: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre"]
  },
  {
    code: "MX",
    name: "Mexico",
    timezone: "America/Mexico_City",
    currency: "MXN",
    currencySymbol: "Mex$",
    cities: ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "León", "Juárez", "Zapopan", "Mérida", "Cancún"]
  },
  {
    code: "IT",
    name: "Italy",
    timezone: "Europe/Rome",
    currency: "EUR",
    currencySymbol: "€",
    cities: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania"]
  },
  {
    code: "ES",
    name: "Spain",
    timezone: "Europe/Madrid",
    currency: "EUR",
    currencySymbol: "€",
    cities: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao"]
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    timezone: "Asia/Dubai",
    currency: "AED",
    currencySymbol: "د.إ",
    cities: ["Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Khor Fakkan", "Dibba Al-Fujairah"]
  },
  {
    code: "SG",
    name: "Singapore",
    timezone: "Asia/Singapore",
    currency: "SGD",
    currencySymbol: "S$",
    cities: ["Singapore"]
  },
  {
    code: "NL",
    name: "Netherlands",
    timezone: "Europe/Amsterdam",
    currency: "EUR",
    currencySymbol: "€",
    cities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen"]
  },
  {
    code: "ZA",
    name: "South Africa",
    timezone: "Africa/Johannesburg",
    currency: "ZAR",
    currencySymbol: "R",
    cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London", "Polokwane", "Nelspruit", "Kimberley"]
  },
  {
    code: "KR",
    name: "South Korea",
    timezone: "Asia/Seoul",
    currency: "KRW",
    currencySymbol: "₩",
    cities: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Ulsan", "Changwon", "Seongnam"]
  },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find(c => c.code === code);
}

export function getCountryByName(name: string): Country | undefined {
  return countries.find(c => c.name === name);
}

export function getCurrencySymbol(countryCode: string): string {
  const country = getCountryByCode(countryCode);
  return country?.currencySymbol || "$";
}

export function getCurrencySymbolByName(countryName: string): string {
  const country = getCountryByName(countryName);
  return country?.currencySymbol || "$";
}