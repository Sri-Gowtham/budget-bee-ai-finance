"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Edit, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { FinanceChatbot } from "@/components/FinanceChatbot";
import { TaxCalculator } from "@/components/TaxCalculator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

interface Category {
  id: number;
  name: string;
  icon: string;
  type: "expense" | "income";
}

interface Budget {
  id: number;
  userId: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  period: string;
  startDate: string;
  endDate: string;
  spent: number;
  percentage: number;
  remaining: number;
  status: "good" | "warning" | "exceeded";
  createdAt: string;
}

export default function BudgetsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { currencySymbol } = useCurrency();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchBudgets();
      fetchCategories();
    }
  }, [session, selectedPeriod]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");
      const params = new URLSearchParams({
        userId: session!.user.id,
        period: selectedPeriod,
      });

      const response = await fetch(`/api/budgets?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setBudgets(data.budgets || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const url = editingBudget ? `/api/budgets/${editingBudget.id}` : "/api/budgets";
      const method = editingBudget ? "PUT" : "POST";

      // Calculate startDate and endDate based on period
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      let endDate: string;
      
      if (period === "monthly") {
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else {
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      }

      const body = editingBudget
        ? { amount: parseFloat(amount) }
        : {
            userId: session!.user.id,
            categoryId: parseInt(categoryId),
            amount: parseFloat(amount),
            period,
            startDate,
            endDate,
          };

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingBudget ? "Budget updated!" : "Budget created!");
        resetForm();
        setIsDialogOpen(false);
        fetchBudgets();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save budget");
      }
    } catch (error) {
      console.error("Error submitting budget:", error);
      toast.error("Failed to save budget");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    // open confirm dialog instead of using window.confirm (not allowed)
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem("bearer_token");
      const res = await fetch(`/api/budgets/${deleteTargetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete budget");
        return;
      }
      toast.success("Budget deleted");
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
      fetchBudgets();
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error("Failed to delete budget");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setAmount(budget.amount.toString());
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingBudget(null);
    setCategoryId("");
    setPeriod("monthly");
    setAmount("");
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const warningBudgets = budgets.filter((b) => b.status === "warning" || b.status === "exceeded");

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-yellow-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="text-3xl">🐝</div>
            <span className="text-2xl font-bold text-yellow-600">Budget Bee</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-yellow-600">
              Dashboard
            </Link>
            <Link href="/transactions" className="text-gray-600 hover:text-yellow-600">
              Transactions
            </Link>
            <Link href="/budgets" className="text-yellow-600 font-semibold">
              Budgets
            </Link>
            <Link href="/insights" className="text-gray-600 hover:text-yellow-600">
              AI Insights
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-yellow-600">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Alerts */}
        {warningBudgets.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Budget Alert!</strong> You have {warningBudgets.length} budget
              {warningBudgets.length > 1 ? "s" : ""} that {warningBudgets.length > 1 ? "are" : "is"}{" "}
              nearing or exceeding the limit.
            </AlertDescription>
          </Alert>
        )}

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <h3 className="text-sm text-gray-600 mb-2">Total Budget</h3>
            <p className="text-2xl font-bold text-yellow-600">{currencySymbol}{totalBudget.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-gray-600 mb-2">Total Spent</h3>
            <p className="text-2xl font-bold text-red-600">{currencySymbol}{totalSpent.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-gray-600 mb-2">Remaining</h3>
            <p className="text-2xl font-bold text-green-600">{currencySymbol}{totalRemaining.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-gray-600 mb-2">Overall Usage</h3>
            <p className="text-2xl font-bold">{overallPercentage.toFixed(0)}%</p>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Budget Management</h1>
            <div className="w-48">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Budgets</SelectItem>
                  <SelectItem value="yearly">Yearly Budgets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black gap-2">
                <Plus className="h-4 w-4" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBudget ? "Edit Budget" : "Add New Budget"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingBudget && (
                  <>
                    <div>
                      <Label>Category</Label>
                      <Select value={categoryId} onValueChange={setCategoryId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c.type === "expense").map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Period</Label>
                      <Select value={period} onValueChange={setPeriod} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div>
                  <Label>Budget Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="Enter budget amount"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingBudget ? (
                    "Update Budget"
                  ) : (
                    "Add Budget"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget List */}
        <div className="space-y-4">
          {budgets.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No budgets set for this period. Create your first budget!</p>
            </Card>
          ) : (
            budgets.map((budget) => {
              const spent = budget.spent || 0;
              const remaining = budget.amount - spent;
              const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
              const status = budget.status || (percentage >= 100 ? "exceeded" : percentage >= 80 ? "warning" : "good");

              return (
                <Card key={budget.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{budget.categoryIcon}</div>
                      <div>
                        <h3 className="text-xl font-semibold">{budget.categoryName}</h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {budget.period} Budget
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(budget)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(budget.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Spent: {currencySymbol}{spent.toFixed(2)} of {currencySymbol}{budget.amount.toFixed(2)}
                      </span>
                      <span className={remaining >= 0 ? "text-green-600" : "text-red-600"}>
                        {remaining >= 0 ? "Remaining" : "Over"}: {currencySymbol}{Math.abs(remaining).toFixed(2)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(percentage, 100)}
                      className={
                        status === "exceeded"
                          ? "bg-red-100 [&>div]:bg-red-600"
                          : status === "warning"
                          ? "bg-orange-100 [&>div]:bg-orange-600"
                          : "bg-green-100 [&>div]:bg-green-600"
                      }
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-gray-600">
                        {status === "exceeded" ? "Over Budget!" : status === "warning" ? "Nearing Limit" : "On Track!"}
                      </p>
                      {(status === "warning" || status === "exceeded") && (
                        <span className={`text-xs font-semibold flex items-center gap-1 ${
                          status === "exceeded" ? "text-red-600" : "text-orange-600"
                        }`}>
                          <AlertTriangle className="h-3 w-3" />
                          {percentage.toFixed(0)}% Used
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* AI Prediction Hint */}
        {budgets.length > 0 && (
          <Card className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-6 w-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">AI Budget Prediction</h3>
                <p className="text-sm text-gray-700">
                  Based on your spending patterns, you're on track to use{" "}
                  <span className="font-semibold">{overallPercentage.toFixed(0)}%</span> of your total
                  budget this month. Visit the{" "}
                  <Link href="/insights" className="text-yellow-600 font-semibold hover:underline">
                    AI Insights
                  </Link>{" "}
                  page for detailed predictions and recommendations.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Finance Chatbot */}
      {session?.user && <FinanceChatbot userId={session.user.id} />}
      
      {/* Tax Calculator */}
      <TaxCalculator />
      
      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the selected budget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}