"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, AlertCircle, Bell } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { FinanceChatbot } from "@/components/FinanceChatbot";
import { TaxCalculator } from "@/components/TaxCalculator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Stats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  totalBudget: number;
  budgetUsed: number;
  budgetPercentage: number;
  anomalyCount: number;
  netBalance: number;
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  date: string;
  isAnomaly: boolean;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
}

interface Insight {
  id: number;
  type: string;
  title: string;
  description: string;
  priority: string;
  isRead: boolean;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { currencySymbol } = useCurrency();
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<any[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<any[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
      fetchInsights();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");
      const userId = session!.user.id;
      
      const [statsRes, transactionsRes, categoryRes, trendRes] =
        await Promise.all([
          fetch(`/api/dashboard/stats?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/dashboard/transactions?userId=${userId}&limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/dashboard/spending-by-category?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/dashboard/spending-trend?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setRecentTransactions(transactionsData || []);
      }
      
      if (categoryRes.ok) {
        const categoryData = await categoryRes.json();
        setSpendingByCategory(categoryData || []);
      }
      
      if (trendRes.ok) {
        const trendData = await trendRes.json();
        setSpendingTrend(trendData || []);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/insights?userId=${session!.user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setInsights(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    }
  };

  const markAsRead = async (insightId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      await fetch(`/api/insights/${insightId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isRead: true }),
      });
      
      // Update local state
      setInsights(insights.map(i => 
        i.id === insightId ? { ...i, isRead: true } : i
      ));
    } catch (error) {
      console.error("Error marking insight as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const unreadIds = insights.filter(i => !i.isRead).map(i => i.id);
      
      await Promise.all(
        unreadIds.map(id =>
          fetch(`/api/insights/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isRead: true }),
          })
        )
      );
      
      setInsights(insights.map(i => ({ ...i, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleSignOut = async () => {
    const token = localStorage.getItem("bearer_token");
    await authClient.signOut({
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="border-b bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  const COLORS = ["#FBBF24", "#F59E0B", "#D97706", "#B45309", "#92400E"];
  const unreadCount = insights.filter((i) => !i.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b bg-white dark:bg-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="text-3xl">🐝</div>
              <span className="text-xl font-bold text-yellow-600">
                Budget Bee
              </span>
            </Link>
            <div className="hidden md:flex gap-6">
              <Link
                href="/dashboard"
                className="text-gray-700 font-semibold hover:text-yellow-600"
              >
                Dashboard
              </Link>
              <Link
                href="/transactions"
                className="text-gray-600 hover:text-yellow-600"
              >
                Transactions
              </Link>
              <Link
                href="/budgets"
                className="text-gray-600 hover:text-yellow-600"
              >
                Budgets
              </Link>
              <Link
                href="/insights"
                className="text-gray-600 hover:text-yellow-600"
              >
                AI Insights
              </Link>
              <Link
                href="/profile"
                className="text-gray-600 hover:text-yellow-600"
              >
                Profile
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {insights.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {insights.map((insight) => (
                        <div
                          key={insight.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                            !insight.isRead ? "bg-yellow-50 dark:bg-yellow-900/10" : ""
                          }`}
                          onClick={() => {
                            if (!insight.isRead) markAsRead(insight.id);
                            setNotificationsOpen(false);
                            router.push("/insights");
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 ${
                              insight.severity === "high" || insight.type === "fraud"
                                ? "text-red-600"
                                : insight.severity === "medium"
                                ? "text-yellow-600"
                                : "text-blue-600"
                            }`}>
                              {insight.type === "fraud" || insight.severity === "high" ? (
                                <AlertCircle className="h-5 w-5" />
                              ) : insight.type === "prediction" ? (
                                <TrendingUp className="h-5 w-5" />
                              ) : (
                                <AlertCircle className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${!insight.isRead ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                                {insight.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                                {insight.description}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(insight.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {!insight.isRead && (
                              <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 border-t bg-gray-50 dark:bg-gray-800">
                  <Link href="/insights">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      View all insights
                    </Button>
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your finances and get AI-powered insights</p>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Income</p>
                <p className="text-3xl font-bold text-green-600">
                  {currencySymbol}{stats?.totalIncome?.toFixed(2) || '0.00'}
                </p>
              </div>
              <ArrowUpCircle className="h-10 w-10 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-red-600">
                  {currencySymbol}{stats?.totalExpenses?.toFixed(2) || '0.00'}
                </p>
              </div>
              <ArrowDownCircle className="h-10 w-10 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Balance</p>
                <p className={`text-3xl font-bold ${(stats?.netBalance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {currencySymbol}{stats?.netBalance?.toFixed(2) || '0.00'}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-yellow-600" />
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Spending Trend */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Spending Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingTrend}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `${currencySymbol}${Number(value).toFixed(2)}`}
                  labelStyle={{ color: '#000' }}
                />
                <Bar dataKey="amount" fill="#eab308" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Spending by Category */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spendingByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${currencySymbol}${entry.value.toFixed(2)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {spendingByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <Link href="/transactions">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No transactions yet. Add your first transaction!
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {transaction.type === "income" ? (
                      <ArrowUpCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{transaction.description || "No description"}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.categoryName || "Uncategorized"} • {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {transaction.type === "income" ? "+" : "-"}{currencySymbol}{transaction.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* AI Insights Preview */}
        {insights.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI Insights</h3>
              <Link href="/insights">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>

            <div className="space-y-3">
              {insights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{insight.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Finance Chatbot */}
      {session?.user && <FinanceChatbot userId={session.user.id} />}
      
      {/* Tax Calculator */}
      <TaxCalculator />
    </div>
  );
}