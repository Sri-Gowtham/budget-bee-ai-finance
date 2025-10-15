"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { 
  TrendingUp, 
  Brain, 
  Shield, 
  PieChart, 
  Bell, 
  Sparkles,
  ChevronRight,
  Check
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-white to-yellow-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-4xl">🐝</div>
            <span className="text-2xl font-bold text-yellow-600">Budget Bee</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 inline-block animate-bounce">
            <div className="text-8xl">🐝</div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-600 to-yellow-800 bg-clip-text text-transparent">
            Smart Finance Management with AI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Budget Bee helps you track expenses, predict spending, detect fraud, and make smarter financial decisions with AI-powered insights.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/sign-up">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black text-lg px-8">
                Get Started
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to master your finances</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-6 hover:shadow-lg transition-shadow border-yellow-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
              <p className="text-gray-600">
                Get personalized financial recommendations and spending predictions powered by advanced AI.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-yellow-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fraud Detection</h3>
              <p className="text-gray-600">
                Automatically detect unusual transactions and suspicious patterns to protect your money.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-yellow-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Spending Predictions</h3>
              <p className="text-gray-600">
                Know your future expenses before they happen with accurate spending forecasts.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-yellow-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <PieChart className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Visual Analytics</h3>
              <p className="text-gray-600">
                Beautiful charts and graphs that make understanding your finances effortless.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-yellow-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Alerts</h3>
              <p className="text-gray-600">
                Get notified about budget limits, unusual spending, and important financial events.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-yellow-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Auto Categorization</h3>
              <p className="text-gray-600">
                AI automatically categorizes your transactions, saving you time and effort.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-yellow-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get started in three simple steps</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Account</h3>
                <p className="text-gray-600">
                  Sign up in seconds and set up your financial profile
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Add Transactions</h3>
                <p className="text-gray-600">
                  Import or manually add your expenses and income
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Get AI Insights</h3>
                <p className="text-gray-600">
                  Let AI analyze your finances and provide smart recommendations
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">Why Choose Budget Bee?</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">AI-Powered Automation</h4>
                      <p className="text-gray-600">Save hours with automatic categorization and insights</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Bank-Level Security</h4>
                      <p className="text-gray-600">Your data is encrypted and protected 24/7</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Real-Time Alerts</h4>
                      <p className="text-gray-600">Stay on top of your finances with instant notifications</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Predictive Analytics</h4>
                      <p className="text-gray-600">Plan better with accurate spending forecasts</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🐝💰</div>
                <h3 className="text-2xl font-bold mb-2">Start Saving Today</h3>
                <p className="text-gray-700 mb-6">Join thousands of users already managing their finances smarter</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-3xl">🐝</div>
                <span className="text-xl font-bold text-yellow-600">Budget Bee</span>
              </div>
              <p className="text-gray-600">
                AI-powered personal finance management for smarter money decisions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/features" className="hover:text-yellow-600">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-yellow-600">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-yellow-600">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/about" className="hover:text-yellow-600">About</Link></li>
                <li><Link href="/blog" className="hover:text-yellow-600">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-yellow-600">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Legal</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/privacy" className="hover:text-yellow-600">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-yellow-600">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-300 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2024 Budget Bee. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}