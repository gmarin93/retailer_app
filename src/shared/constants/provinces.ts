/**
 * Canadian provinces / territories and region codes accepted by the API.
 * Operations uses Angular's `Other` value; invoicing historically used `OTHER`.
 */
export const PROVINCE_OPTIONS: { value: string; label: string }[] = [
  { value: "AB", label: "Alberta (AB)" },
  { value: "BC", label: "British Columbia (BC)" },
  { value: "MB", label: "Manitoba (MB)" },
  { value: "NB", label: "New Brunswick (NB)" },
  { value: "NL", label: "Newfoundland and Labrador (NL)" },
  { value: "NT", label: "Northwest Territories (NT)" },
  { value: "NS", label: "Nova Scotia (NS)" },
  { value: "NU", label: "Nunavut (NU)" },
  { value: "ON", label: "Ontario (ON)" },
  { value: "PE", label: "Prince Edward Island (PE)" },
  { value: "QC", label: "Quebec (QC)" },
  { value: "SK", label: "Saskatchewan (SK)" },
  { value: "YT", label: "Yukon (YT)" },
  { value: "USA", label: "USA" },
  { value: "Other", label: "OTHER" },
];
