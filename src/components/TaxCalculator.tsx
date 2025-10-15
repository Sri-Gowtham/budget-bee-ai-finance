"use client";

import { useState } from "react";
import { X, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { taxData, getTaxInfoByCountry, calculateIncomeTax, type CountryTaxInfo } from "@/lib/tax-data";
import { motion, AnimatePresence } from "framer-motion";

export function TaxCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("United States");
  const [income, setIncome] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    incomeTax: true,
    salesTax: false,
    capitalGains: false,
    corporate: false,
    other: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const taxInfo = getTaxInfoByCountry(selectedCountry);
  const calculatedTax = income && taxInfo ? calculateIncomeTax(parseFloat(income), selectedCountry) : 0;
  const effectiveRate = income && parseFloat(income) > 0 ? (calculatedTax / parseFloat(income)) * 100 : 0;

  return (
    <>
      {/* Floating Button - RIGHT SIDE, ABOVE CHATBOT */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-24 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg"
              size="icon"
            >
              <Calculator className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calculator Widget - POSITIONED VISIBLY ON SCREEN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[450px] max-h-[90vh] flex flex-col"
            >
              <Card className="shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-yellow-500 text-black p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    <h3 className="font-bold text-lg">Global Tax Calculator</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="h-8 w-8 hover:bg-yellow-600"
                    >
                      {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 hover:bg-yellow-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                {!isMinimized && (
                  <div className="p-4 overflow-y-auto flex-1">
                    {/* Country Selector */}
                    <div className="mb-4">
                      <Label htmlFor="country" className="mb-2 block">
                        Select Country
                      </Label>
                      <select
                        id="country"
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {taxData.map((country) => (
                          <option key={country.country} value={country.country}>
                            {country.country}
                          </option>
                        ))}
                      </select>
                    </div>

                    {taxInfo && (
                      <>
                        {/* Income Calculator */}
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md">
                          <Label htmlFor="income" className="mb-2 block">
                            Annual Income ({taxInfo.currency})
                          </Label>
                          <Input
                            id="income"
                            type="number"
                            value={income}
                            onChange={(e) => setIncome(e.target.value)}
                            placeholder="Enter your income"
                            className="mb-2"
                          />
                          {income && parseFloat(income) > 0 && (
                            <div className="mt-3 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">Estimated Tax:</span>
                                <span className="font-bold text-yellow-600">
                                  {taxInfo.currency} {calculatedTax.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">After Tax:</span>
                                <span className="font-bold">
                                  {taxInfo.currency} {(parseFloat(income) - calculatedTax).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">Effective Rate:</span>
                                <span className="font-bold">{effectiveRate.toFixed(2)}%</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Income Tax Brackets */}
                        <div className="mb-3">
                          <button
                            onClick={() => toggleSection("incomeTax")}
                            className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            <span className="font-semibold">📊 Income Tax</span>
                            {expandedSections.incomeTax ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          {expandedSections.incomeTax && (
                            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-b-md mt-1">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                {taxInfo.incomeTax.description}
                              </p>
                              <div className="space-y-1">
                                {taxInfo.incomeTax.brackets.map((bracket, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span>
                                      {bracket.min.toLocaleString()} -{" "}
                                      {bracket.max ? bracket.max.toLocaleString() : "∞"}
                                    </span>
                                    <span className="font-medium">{bracket.rate}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sales Tax / VAT */}
                        <div className="mb-3">
                          <button
                            onClick={() => toggleSection("salesTax")}
                            className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            <span className="font-semibold">🛒 {taxInfo.salesTax.name}</span>
                            {expandedSections.salesTax ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          {expandedSections.salesTax && (
                            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-b-md mt-1">
                              <div className="flex justify-between mb-2">
                                <span className="font-medium">Rate:</span>
                                <span className="font-bold text-yellow-600">{taxInfo.salesTax.rate}%</span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {taxInfo.salesTax.description}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Capital Gains Tax */}
                        <div className="mb-3">
                          <button
                            onClick={() => toggleSection("capitalGains")}
                            className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            <span className="font-semibold">📈 Capital Gains Tax</span>
                            {expandedSections.capitalGains ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          {expandedSections.capitalGains && (
                            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-b-md mt-1">
                              <div className="space-y-2 mb-2">
                                <div className="flex justify-between">
                                  <span className="text-sm">Short-term:</span>
                                  <span className="font-medium">{taxInfo.capitalGainsTax.shortTerm}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Long-term:</span>
                                  <span className="font-medium">{taxInfo.capitalGainsTax.longTerm}%</span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {taxInfo.capitalGainsTax.description}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Corporate Tax */}
                        <div className="mb-3">
                          <button
                            onClick={() => toggleSection("corporate")}
                            className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            <span className="font-semibold">🏢 Corporate Tax</span>
                            {expandedSections.corporate ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          {expandedSections.corporate && (
                            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-b-md mt-1">
                              <div className="flex justify-between mb-2">
                                <span className="font-medium">Rate:</span>
                                <span className="font-bold text-yellow-600">{taxInfo.corporateTax.rate}%</span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {taxInfo.corporateTax.description}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Other Taxes */}
                        {taxInfo.otherTaxes.length > 0 && (
                          <div className="mb-3">
                            <button
                              onClick={() => toggleSection("other")}
                              className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              <span className="font-semibold">📋 Other Taxes</span>
                              {expandedSections.other ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            {expandedSections.other && (
                              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-b-md mt-1">
                                <div className="space-y-3">
                                  {taxInfo.otherTaxes.map((tax, idx) => (
                                    <div key={idx} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-2 last:pb-0">
                                      <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium">{tax.name}</span>
                                        <span className="text-sm font-bold">{tax.rate}%</span>
                                      </div>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {tax.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Disclaimer */}
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                        ⚠️ For informational purposes only. Tax laws vary and change frequently. Consult a tax
                        professional for accurate advice.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}