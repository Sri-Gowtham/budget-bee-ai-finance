"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, DollarSign, Target, Sparkles, ThumbsUp, TriangleAlert, Download, Upload, X, Check, Plus, Edit, Trash2, Leaf, Shield, Users, Calendar as CalendarIcon, Zap, Brain } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { FinanceChatbot } from "@/components/FinanceChatbot";
import { TaxCalculator } from "@/components/TaxCalculator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface Insight {
  id: number;
  userId: number;
  type: string;
  title: string;
  description: string;
  severity: string;
  createdAt: string;
}

interface PredictionData {
  nextMonthPrediction: number;
  currentMonthSpending: number;
  averageMonthlySpending: number;
  trend: "increasing" | "decreasing" | "stable";
  trendPercentage: number;
}

interface ExtractedData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  items: string[];
  confidence: string;
}

interface Goal {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  category: string | null;
  status: string;
  priority: string;
}

interface PersonalityProfile {
  id: number;
  personalityType: string;
  confidence: number;
  traits: string[];
  monthlyAnalysis: {
    month: string;
    insights: string[];
    strengths: string[];
    areasForImprovement: string[];
  };
}

interface RiskScore {
  riskScore: number;
  incomeVolatility: number;
  debtRatio: number;
  spendingVolatility: number;
  emergencyFundMonths: number;
  recommendations: string[];
}

interface SustainabilityScore {
  sustainabilityScore: number;
  ecoFriendlySpending: number;
  carbonFootprint: any;
}

interface EventPrediction {
  eventType: string;
  predictedDate: string;
  confidence: number;
  category: string;
  estimatedAmount: number;
  reasoning: string;
}

export default function InsightsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { currencySymbol } = useCurrency();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAdvice, setAiAdvice] = useState<any[]>([]);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reportText, setReportText] = useState<string>("");

  // New AI features state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [personalityProfile, setPersonalityProfile] = useState<PersonalityProfile | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [sustainabilityScore, setSustainabilityScore] = useState<SustainabilityScore | null>(null);
  const [eventPredictions, setEventPredictions] = useState<EventPrediction[]>([]);
  const [loadingPersonality, setLoadingPersonality] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // OCR state
  const [ocrImage, setOcrImage] = useState<File | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [processingOcr, setProcessingOcr] = useState(false);
  const [editableData, setEditableData] = useState<ExtractedData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchAllData();
    }
  }, [session]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchInsights(),
      calculatePredictions(),
      fetchAIAdvice(),
      fetchGoals(),
      fetchPersonalityProfile(),
      fetchRiskScore(),
      analyzeEventPredictions(),
    ]);
  };

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
    
      const txRes = await fetch(`/api/dashboard/transactions?userId=${session!.user.id}&limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txData = await txRes.json();
      // API returns array directly, not wrapped in transactions property
      setTransactions(Array.isArray(txData) ? txData : []);

      const response = await fetch(`/api/insights?userId=${session!.user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setInsights(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching insights:", error);
    }
  };

  const calculatePredictions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/dashboard/transactions?userId=${session!.user.id}&limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      // API returns array directly
      const txs = Array.isArray(data) ? data : [];

      // expose transactions to UI helpers
      setTransactions(txs);

      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 7);

      const sum = (arr: any[]) => arr.reduce((s, t) => s + (Number(t.amount) || 0), 0);

      const currentMonthExpenses = sum(txs.filter((t: any) => t.type === "expense" && (t.date || "").startsWith(currentMonth)));
      const lastMonthExpenses = sum(txs.filter((t: any) => t.type === "expense" && (t.date || "").startsWith(lastMonth)));
      const twoMonthsAgoExpenses = sum(txs.filter((t: any) => t.type === "expense" && (t.date || "").startsWith(twoMonthsAgo)));

      const averageSpending = (currentMonthExpenses + lastMonthExpenses + twoMonthsAgoExpenses) / 3;
      const monthlyGrowth = ((currentMonthExpenses - lastMonthExpenses) + (lastMonthExpenses - twoMonthsAgoExpenses)) / 2;
      const nextMonthPrediction = Math.max(0, currentMonthExpenses + monthlyGrowth);

      let trend: "increasing" | "decreasing" | "stable" = "stable";
      let trendPercentage = 0;
      if (lastMonthExpenses > 0) {
        trendPercentage = ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
        if (trendPercentage > 5) trend = "increasing";
        else if (trendPercentage < -5) trend = "decreasing";
      }

      setPrediction({
        nextMonthPrediction,
        currentMonthSpending: currentMonthExpenses,
        averageMonthlySpending: averageSpending,
        trend,
        trendPercentage: Math.abs(trendPercentage),
      });
    } catch (error) {
      console.error("Error calculating predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIAdvice = async () => {
    try {
      setLoadingAdvice(true);
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/ai/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: session!.user.id }),
      });
      const data = await response.json();
      setAiAdvice(data.advice || []);
    } catch (error) {
      console.error("Error fetching AI advice:", error);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/goals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGoals(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const fetchPersonalityProfile = async () => {
    try {
      setLoadingPersonality(true);
      const token = localStorage.getItem("bearer_token");
      
      // Try to get existing profile first
      let response = await fetch(`/api/personality?userId=${session!.user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 404) {
        // Generate new profile
        response = await fetch("/api/ai/personality-analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        
        if (response.ok) {
          const data = await response.json();
          setPersonalityProfile(data.personality);
        }
      } else if (response.ok) {
        const data = await response.json();
        setPersonalityProfile(data);
      }
    } catch (error) {
      console.error("Error fetching personality:", error);
    } finally {
      setLoadingPersonality(false);
    }
  };

  const fetchRiskScore = async () => {
    try {
      setLoadingRisk(true);
      const token = localStorage.getItem("bearer_token");
      const now = new Date();
      const response = await fetch(
        `/api/risk-score?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setRiskScore(data[0]);
        } else {
          // Calculate risk score from transactions
          calculateRiskScore();
        }
      } else {
        calculateRiskScore();
      }
    } catch (error) {
      console.error("Error fetching risk score:", error);
    } finally {
      setLoadingRisk(false);
    }
  };

  const calculateRiskScore = async () => {
    // Calculate from transaction data
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    
    const recentTxs = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
    
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    
    recentTxs.forEach(t => {
      const month = t.date.slice(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
      
      if (t.type === "income") monthlyData[month].income += Number(t.amount);
      else monthlyData[month].expenses += Number(t.amount);
    });
    
    const months = Object.values(monthlyData);
    if (months.length === 0) return;
    
    const avgIncome = months.reduce((s, m) => s + m.income, 0) / months.length;
    const avgExpenses = months.reduce((s, m) => s + m.expenses, 0) / months.length;
    
    // Calculate volatility (coefficient of variation)
    const incomeStdDev = Math.sqrt(months.reduce((s, m) => s + Math.pow(m.income - avgIncome, 2), 0) / months.length);
    const expenseStdDev = Math.sqrt(months.reduce((s, m) => s + Math.pow(m.expenses - avgExpenses, 2), 0) / months.length);
    
    const incomeVolatility = avgIncome > 0 ? (incomeStdDev / avgIncome) : 0;
    const spendingVolatility = avgExpenses > 0 ? (expenseStdDev / avgExpenses) : 0;
    
    // Calculate debt ratio (assume 0 for now, would need debt data)
    const debtRatio = 0;
    
    // Calculate emergency fund months
    const totalSavings = months.reduce((s, m) => s + (m.income - m.expenses), 0);
    const emergencyFundMonths = avgExpenses > 0 ? totalSavings / avgExpenses : 0;
    
    // Calculate overall risk score (0-100, higher = more risky)
    let riskScore = 0;
    riskScore += incomeVolatility * 30; // High income volatility = risky
    riskScore += spendingVolatility * 20; // High spending volatility = risky
    riskScore += debtRatio * 30; // High debt = risky
    riskScore += Math.max(0, (3 - emergencyFundMonths)) * 10; // Low emergency fund = risky
    
    riskScore = Math.min(100, Math.max(0, riskScore));
    
    const recommendations: string[] = [];
    if (incomeVolatility > 0.3) recommendations.push("Income is unstable - consider diversifying income sources");
    if (emergencyFundMonths < 3) recommendations.push(`Build emergency fund to 3-6 months of expenses ($${(avgExpenses * 3).toFixed(0)})`);
    if (spendingVolatility > 0.3) recommendations.push("Spending varies significantly - create a consistent budget");
    
    setRiskScore({
      riskScore,
      incomeVolatility,
      debtRatio,
      spendingVolatility,
      emergencyFundMonths,
      recommendations,
    });
  };

  const analyzeEventPredictions = async () => {
    try {
      setLoadingPredictions(true);
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/ai/predict-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        const data = await response.json();
        setEventPredictions(data.predictions || []);
      }
    } catch (error) {
      console.error("Error predicting events:", error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const saveGoal = async (goalData: Partial<Goal>) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const method = editingGoal ? "PUT" : "POST";
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(goalData),
      });
      
      if (response.ok) {
        toast.success(editingGoal ? "Goal updated!" : "Goal created!");
        fetchGoals();
        setShowGoalDialog(false);
        setEditingGoal(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save goal");
      }
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Failed to save goal");
    }
  };

  const deleteGoal = async (id: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/goals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        toast.success("Goal deleted");
        fetchGoals();
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setOcrImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setOcrPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Reset extracted data
    setExtractedData(null);
    setEditableData(null);
  };

  const processImage = async () => {
    if (!ocrImage) return;

    setProcessingOcr(true);
    try {
      const formData = new FormData();
      formData.append("image", ocrImage);

      const response = await fetch("/api/ai/ocr", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to process image");
        return;
      }

      setExtractedData(result.data);
      setEditableData(result.data);
      toast.success("Receipt data extracted successfully!");
    } catch (error) {
      console.error("OCR processing error:", error);
      toast.error("Failed to process image");
    } finally {
      setProcessingOcr(false);
    }
  };

  const saveAsTransaction = async () => {
    if (!editableData || !session?.user) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
          type: "expense",
          amount: editableData.amount,
          categoryName: editableData.category,
          description: `${editableData.merchant}${editableData.items.length > 0 ? ` - ${editableData.items.join(", ")}` : ""}`,
          date: editableData.date,
        }),
      });

      if (response.ok) {
        toast.success("Transaction saved successfully!");
        // Reset OCR state
        setOcrImage(null);
        setOcrPreview(null);
        setExtractedData(null);
        setEditableData(null);
        // Refresh insights
        fetchInsights();
        calculatePredictions();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save transaction");
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast.error("Failed to save transaction");
    }
  };

  const clearOcrData = () => {
    setOcrImage(null);
    setOcrPreview(null);
    setExtractedData(null);
    setEditableData(null);
  };

  // Derived analytics from transactions
  const { categoryTotals, topCategories, totalThisMonth, daysTrend, sentiment } = useMemo(() => {
    const now = new Date();
    const yyyymm = now.toISOString().slice(0, 7);
    const monthTx = transactions.filter((t) => t.type === "expense" && (t.date || "").startsWith(yyyymm));
    const total = monthTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const catMap: Record<string, number> = {};
    for (const t of monthTx) {
      const key = t.categoryName || "Other";
      catMap[key] = (catMap[key] || 0) + (Number(t.amount) || 0);
    }
    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    // daily trend for current month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const perDay: number[] = Array(daysInMonth).fill(0);
    for (const t of monthTx) {
      const d = new Date(t.date);
      const idx = d.getDate() - 1;
      if (!Number.isNaN(idx) && idx >= 0 && idx < perDay.length) perDay[idx] += (Number(t.amount) || 0);
    }

    // Sentiment badge based on trend and spending vs 3-month average
    let badge: { label: string; tone: "good" | "warning" | "risk" } = { label: "Stable control", tone: "good" };
    if (prediction) {
      if (prediction.trend === "increasing" && prediction.trendPercentage > 15) badge = { label: "Risky spending ⚠️", tone: "risk" };
      else if (prediction.trend === "increasing") badge = { label: "Watch spending", tone: "warning" };
      else badge = { label: "Good control 👍", tone: "good" };
    }

    return {
      categoryTotals: catEntries,
      topCategories: catEntries.slice(0, 3),
      totalThisMonth: total,
      daysTrend: perDay,
      sentiment: badge,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, prediction?.trend, prediction?.trendPercentage]);

  const fraudAlerts = insights.filter((i) => i.type === "fraud" || i.severity === "high");
  const generalInsights = insights.filter((i) => i.type !== "fraud" && i.severity !== "high");

  const handleMarkSafe = (id: number) => {
    // Optionally call backend to mark safe
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };
  const handleReportFraud = (id: number) => {
    // Optionally call backend to escalate
    console.log("Reported fraud id", id);
  };

  const generateReport = () => {
    const lines: string[] = [];
    lines.push("Budget Bee — AI Monthly Report");
    lines.push("");
    lines.push(`Summary: You spent ${currencySymbol}${(totalThisMonth || 0).toFixed(2)} this month across ${categoryTotals.length} categories.`);
    if (prediction) {
      lines.push(`Forecast: Next month ~ ${currencySymbol}${prediction.nextMonthPrediction.toFixed(2)} (${prediction.trend} by ~${prediction.trendPercentage.toFixed(1)}%).`);
    }
    if (topCategories.length) {
      lines.push("Top categories:");
      topCategories.forEach(([c, v]) => lines.push(`- ${c}: ${currencySymbol}${(v as number).toFixed(2)}`));
    }
    if (aiAdvice.length) {
      lines.push("");
      lines.push("AI Recommendations:");
      aiAdvice.slice(0, 5).forEach((a: any) => lines.push(`- ${a.title}: ${a.description}`));
    }
    setReportText(lines.join("\n"));
  };

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="text-3xl">🐝</div>
            <span className="text-2xl font-bold text-yellow-600">Budget Bee</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground hover:text-yellow-600">
              Dashboard
            </Link>
            <Link href="/transactions" className="text-muted-foreground hover:text-yellow-600">
              Transactions
            </Link>
            <Link href="/budgets" className="text-muted-foreground hover:text-yellow-600">
              Budgets
            </Link>
            <Link href="/insights" className="text-yellow-600 font-semibold">
              AI Insights
            </Link>
            <Link href="/profile" className="text-muted-foreground hover:text-yellow-600">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Financial Risk Score - NEW */}
        {riskScore && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-600" />
                <h2 className="text-2xl font-bold text-foreground">Financial Risk Score</h2>
              </div>
              <Button variant="outline" size="sm" onClick={fetchRiskScore} disabled={loadingRisk}>
                {loadingRisk ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Risk</span>
                    <span className={`text-2xl font-bold ${
                      riskScore.riskScore < 30 ? "text-green-600" :
                      riskScore.riskScore < 60 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {riskScore.riskScore.toFixed(0)}/100
                    </span>
                  </div>
                  <Progress value={riskScore.riskScore} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {riskScore.riskScore < 30 ? "Low Risk - Stable finances" :
                     riskScore.riskScore < 60 ? "Moderate Risk - Room for improvement" :
                     "High Risk - Action needed"}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Income Volatility:</span>
                    <span className="font-medium">{(riskScore.incomeVolatility * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spending Volatility:</span>
                    <span className="font-medium">{(riskScore.spendingVolatility * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Emergency Fund:</span>
                    <span className="font-medium">{riskScore.emergencyFundMonths.toFixed(1)} months</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-2">Recommendations:</h3>
                <div className="space-y-2">
                  {riskScore.recommendations?.map((rec, idx) => (
                    <div key={idx} className="flex gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                  {(!riskScore.recommendations || riskScore.recommendations.length === 0) && (
                    <p className="text-sm text-green-600">✓ Your financial stability looks good!</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Financial Personality Profile - NEW */}
        {personalityProfile && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-foreground">Financial Personality</h2>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPersonalityProfile} disabled={loadingPersonality}>
                {loadingPersonality ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-4xl mb-2">
                    {personalityProfile.personalityType === "saver" ? "💰" :
                     personalityProfile.personalityType === "spender" ? "🛍️" :
                     personalityProfile.personalityType === "planner" ? "📊" :
                     personalityProfile.personalityType === "investor" ? "📈" : "🎲"}
                  </div>
                  <h3 className="text-xl font-bold capitalize mb-1">{personalityProfile.personalityType}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {(personalityProfile.confidence * 100).toFixed(0)}% confidence
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {personalityProfile.traits?.map((trait, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Key Insights
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {personalityProfile.monthlyAnalysis?.insights?.map((insight, idx) => (
                      <li key={idx}>• {insight}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-600">
                    <ThumbsUp className="h-4 w-4" />
                    Strengths
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {personalityProfile.monthlyAnalysis?.strengths?.map((strength, idx) => (
                      <li key={idx}>✓ {strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-orange-600">
                    <TrendingUp className="h-4 w-4" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {personalityProfile.monthlyAnalysis?.areasForImprovement?.map((area, idx) => (
                      <li key={idx}>→ {area}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* AI-Driven Goals - NEW */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-yellow-600" />
              <h2 className="text-2xl font-bold text-foreground">Financial Goals</h2>
            </div>
            <Button 
              onClick={() => setShowGoalDialog(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Goal
            </Button>
          </div>
          
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No goals set yet. Create your first financial goal!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{goal.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {goal.category && `${goal.category} • `}
                          {goal.deadline && `Due: ${new Date(goal.deadline).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => {
                          setEditingGoal(goal);
                          setShowGoalDialog(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteGoal(goal.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {currencySymbol}{goal.currentAmount.toFixed(0)} / {currencySymbol}{goal.targetAmount.toFixed(0)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">
                        {progress.toFixed(0)}% complete
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Event Predictions - NEW */}
        {eventPredictions.length > 0 && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-foreground">Upcoming Life Events</h2>
              </div>
              <Button variant="outline" size="sm" onClick={analyzeEventPredictions} disabled={loadingPredictions}>
                {loadingPredictions ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {eventPredictions.map((event, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{event.eventType}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.predictedDate).toLocaleDateString()} • {event.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600">
                        {currencySymbol}{event.estimatedAmount.toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(event.confidence * 100).toFixed(0)}% confident
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.reasoning}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* OCR Receipt Scanner */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-foreground">Receipt Scanner (OCR)</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a photo of your receipt or invoice to automatically extract transaction details.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div>
              <div className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-8 text-center bg-white dark:bg-gray-800/50">
                {!ocrPreview ? (
                  <div>
                    <Upload className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      <span className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">
                        Click to upload
                      </span>
                      <input
                        id="receipt-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, JPEG up to 10MB
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={ocrPreview}
                      alt="Receipt preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={clearOcrData}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {ocrPreview && !extractedData && (
                <Button
                  onClick={processImage}
                  disabled={processingOcr}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {processingOcr ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract Data
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Extracted Data Section */}
            <div>
              {extractedData && editableData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Extracted Data</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        extractedData.confidence === "high"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                          : extractedData.confidence === "medium"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      }`}
                    >
                      {extractedData.confidence} confidence
                    </span>
                  </div>

                  <div>
                    <Label htmlFor="merchant" className="text-xs text-muted-foreground">Merchant</Label>
                    <Input
                      id="merchant"
                      value={editableData.merchant}
                      onChange={(e) => setEditableData({ ...editableData, merchant: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="amount" className="text-xs text-muted-foreground">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={editableData.amount}
                        onChange={(e) => setEditableData({ ...editableData, amount: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date" className="text-xs text-muted-foreground">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={editableData.date}
                        onChange={(e) => setEditableData({ ...editableData, date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-xs text-muted-foreground">Category</Label>
                    <select
                      id="category"
                      value={editableData.category}
                      onChange={(e) => setEditableData({ ...editableData, category: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                    >
                      <option value="groceries">Groceries</option>
                      <option value="dining">Dining</option>
                      <option value="shopping">Shopping</option>
                      <option value="transport">Transport</option>
                      <option value="utilities">Utilities</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="health">Health</option>
                      <option value="education">Education</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {editableData.items.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Items</Label>
                      <div className="mt-1 text-sm text-muted-foreground max-h-24 overflow-y-auto">
                        {editableData.items.map((item, idx) => (
                          <div key={idx}>• {item}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={saveAsTransaction}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Save Transaction
                  </Button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div>
                    <Sparkles className="h-12 w-12 text-purple-300 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Upload a receipt and click "Extract Data" to see the results here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* AI-Powered Recommendations (moved content lives here) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="h-6 w-6 text-yellow-600" />
              AI-Powered Recommendations
            </h2>
            <div className="flex items-center gap-2">
              <Button onClick={generateReport} variant="secondary" className="gap-2">
                <Download className="h-4 w-4" /> Generate AI Report
              </Button>
              <Button
                onClick={fetchAIAdvice}
                disabled={loadingAdvice}
                className="bg-yellow-500 hover:bg-yellow-600 text-black gap-2"
              >
                {loadingAdvice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get AI Advice
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Personalized Financial Overview (moved) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Smart Summary</h3>
                <Lightbulb className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                This month you spent <span className="font-semibold text-foreground">{currencySymbol}{(totalThisMonth || 0).toFixed(2)}</span> across {categoryTotals.length} categories.
              </p>
              {prediction && (
                <p className="text-xs text-muted-foreground mt-2">
                  Hint: {prediction.trend === "increasing" ? "Your spending is trending up" : prediction.trend === "decreasing" ? "Great! Spending is trending down" : "Spending is stable"} — consider trimming the top category by {currencySymbol}{Math.max(100, Math.round((prediction.currentMonthSpending || 0) * 0.04))}.
                </p>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">AI Sentiment</h3>
                {sentiment.tone === "good" ? (
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                ) : sentiment.tone === "warning" ? (
                  <TriangleAlert className="h-5 w-5 text-yellow-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded ${sentiment.tone === "good" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" : sentiment.tone === "warning" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"}`}>
                {sentiment.label}
              </span>
              <p className="text-xs text-muted-foreground mt-2">Automatically assessed from your month-over-month trend.</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Top Categories</h3>
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-2">
                {topCategories.map(([cat, val]) => (
                  <div key={String(cat)} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{cat}</span>
                    <span className="font-medium text-foreground">{currencySymbol}{(val as number).toFixed(0)}</span>
                  </div>
                ))}
                {topCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add transactions to see category highlights.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Category breakdown (moved) */}
          {categoryTotals.length > 0 && (
            <Card className="p-6 mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Where your money goes</h3>
              <div className="space-y-3">
                {categoryTotals.slice(0, 8).map(([cat, val]) => {
                  const pct = totalThisMonth ? (Number(val) / totalThisMonth) * 100 : 0;
                  return (
                    <div key={String(cat)}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min(100, Math.max(0, pct))} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Daily trend (moved) */}
          {daysTrend && daysTrend.length > 0 && (
            <Card className="p-6 mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">Daily spending trend</h3>
              <svg viewBox={`0 0 ${Math.max(daysTrend.length, 1)} 100`} preserveAspectRatio="none" className="w-full h-24 text-yellow-600">
                {(() => {
                  const max = Math.max(1, ...daysTrend);
                  const hasData = daysTrend.some(v => v > 0);
                  
                  if (!hasData) {
                    return (
                      <text x="50%" y="50" textAnchor="middle" fill="currentColor" fontSize="4" opacity="0.5">
                        No spending data for this month
                      </text>
                    );
                  }
                  
                  const points = daysTrend.map((v, i) => `${i},${100 - Math.round((v / max) * 100)}`).join(" ");
                  return (
                    <>
                      <polyline fill="none" stroke="currentColor" strokeWidth="0.5" points={points} opacity="0.3" />
                      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
                    </>
                  );
                })()}
              </svg>
              <p className="text-xs text-muted-foreground">Peaks indicate high-spend days. Use them to spot patterns.</p>
            </Card>
          )}

          {/* Predictions (moved) */}
          {prediction && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Next Month Prediction</h3>
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-yellow-600 mb-2">
                  {currencySymbol}{prediction.nextMonthPrediction.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on your spending patterns, we predict this amount for next month.
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Current Month</h3>
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-600 mb-2">
                  {currencySymbol}{prediction.currentMonthSpending.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Total expenses so far this month.</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Spending Trend</h3>
                  {prediction.trend === "increasing" ? (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  ) : prediction.trend === "decreasing" ? (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-3xl font-bold mb-2">
                  {prediction.trend === "increasing" ? "📈" : prediction.trend === "decreasing" ? "📉" : "➡️"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {prediction.trend === "increasing"
                    ? `Spending increased by ${prediction.trendPercentage.toFixed(1)}%`
                    : prediction.trend === "decreasing"
                    ? `Spending decreased by ${prediction.trendPercentage.toFixed(1)}%`
                    : "Spending is stable"}
                </p>
              </Card>
            </div>
          )}

          {/* Advice cards */}
          {aiAdvice.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiAdvice.map((advice, index) => (
                <Card
                  key={index}
                  className={`p-6 ${
                    advice.priority === "high"
                      ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                      : advice.priority === "medium"
                      ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                      <Lightbulb className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{advice.title}</h3>
                        {advice.priority && (
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              advice.priority === "high"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                : advice.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {advice.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{advice.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Insights from Database */}
        {generalInsights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Detailed Insights</h2>
            <div className="space-y-3">
              {generalInsights.map((insight) => (
                <Card key={insight.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      {insight.type === "prediction" ? (
                        <TrendingUp className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <Lightbulb className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 text-foreground">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(insight.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Fraud Alerts Details */}
        {fraudAlerts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              Fraud Alerts
            </h2>
            <div className="space-y-3">
              {fraudAlerts.map((alert) => (
                <Card key={alert.id} className="p-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">{alert.title}</h3>
                      <p className="text-sm text-red-800 dark:text-red-400">{alert.description}</p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-2">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => handleMarkSafe(alert.id)}>Mark Safe</Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleReportFraud(alert.id)}>Report Fraud</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* AI Report Viewer */}
        {reportText && (
          <Card className="p-6 mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">AI Report (Preview)</h3>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{reportText}</pre>
          </Card>
        )}

        {/* Empty State */}
        {insights.length === 0 && aiAdvice.length === 0 && (
          <Card className="p-8 text-center">
            <Lightbulb className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No insights available yet. Keep tracking your expenses and we'll generate personalized
              insights for you!
            </p>
            <Button
              onClick={fetchAIAdvice}
              className="bg-yellow-500 hover:bg-yellow-600 text-black gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Get AI Advice Now
            </Button>
          </Card>
        )}
      </div>

      {/* Goal Dialog */}
      {showGoalDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingGoal ? "Edit Goal" : "Create New Goal"}</h2>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => {
                  setShowGoalDialog(false);
                  setEditingGoal(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              saveGoal({
                title: formData.get("title") as string,
                targetAmount: parseFloat(formData.get("targetAmount") as string),
                currentAmount: parseFloat(formData.get("currentAmount") as string) || 0,
                deadline: formData.get("deadline") as string || null,
                category: formData.get("category") as string || null,
                priority: formData.get("priority") as string || "medium",
                status: "active",
              });
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Goal Title *</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    defaultValue={editingGoal?.title}
                    placeholder="e.g., Emergency Fund" 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetAmount">Target Amount *</Label>
                    <Input 
                      id="targetAmount" 
                      name="targetAmount" 
                      type="number" 
                      defaultValue={editingGoal?.targetAmount}
                      placeholder="5000" 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentAmount">Current Amount</Label>
                    <Input 
                      id="currentAmount" 
                      name="currentAmount" 
                      type="number" 
                      defaultValue={editingGoal?.currentAmount}
                      placeholder="0" 
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category" 
                    name="category"
                    defaultValue={editingGoal?.category || ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="">Select category</option>
                    <option value="Savings">Savings</option>
                    <option value="Travel">Travel</option>
                    <option value="Technology">Technology</option>
                    <option value="Education">Education</option>
                    <option value="Debt">Debt Payoff</option>
                    <option value="Investment">Investment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input 
                      id="deadline" 
                      name="deadline" 
                      type="date" 
                      defaultValue={editingGoal?.deadline?.split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <select 
                      id="priority" 
                      name="priority"
                      defaultValue={editingGoal?.priority || "medium"}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowGoalDialog(false);
                    setEditingGoal(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black">
                  {editingGoal ? "Update" : "Create"} Goal
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* AI Chatbot - RIGHT SIDE */}
      {session?.user && <FinanceChatbot userId={session.user.id} />}
      
      {/* Tax Calculator - LEFT SIDE */}
      <TaxCalculator />
    </div>
  );
}