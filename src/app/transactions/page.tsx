"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Mic, MicOff, Trash2, Edit, Download, Sparkles, TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { FinanceChatbot } from "@/components/FinanceChatbot";
import { TaxCalculator } from "@/components/TaxCalculator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface Category {
  id: number;
  name: string;
  icon: string;
  type: "income" | "expense";
}

interface Transaction {
  id: number;
  userId: string;
  type: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { currencySymbol } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Transaction | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Form state
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Add budget checking function
  const checkBudgetStatus = async (categoryId: number, transactionType: string) => {
    // Only check budgets for expense transactions
    if (transactionType !== "expense") {
      console.log("Skipping budget check - not an expense transaction");
      return;
    }

    console.log("Checking budget status for category:", categoryId);

    try {
      // Add longer delay to ensure transaction is fully committed to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token = localStorage.getItem("bearer_token");
      
      // Check both monthly and yearly budgets
      const monthlyParams = new URLSearchParams({
        userId: session!.user.id,
        period: "monthly"
      });
      
      const yearlyParams = new URLSearchParams({
        userId: session!.user.id,
        period: "yearly"
      });

      console.log("Fetching budgets for user:", session!.user.id);

      // Fetch both monthly and yearly budgets
      const [monthlyResponse, yearlyResponse] = await Promise.all([
        fetch(`/api/budgets?${monthlyParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/budgets?${yearlyParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      const monthlyData = await monthlyResponse.json();
      const yearlyData = await yearlyResponse.json();
      const allBudgets = [...(monthlyData.budgets || []), ...(yearlyData.budgets || [])];
      
      console.log("All budgets:", allBudgets);
      
      // Find budgets for this category
      const categoryBudgets = allBudgets.filter((b: any) => b.categoryId === categoryId);
      
      console.log("Category budgets:", categoryBudgets);
      
      if (categoryBudgets.length === 0) {
        console.log("No budgets found for category:", categoryId);
        return;
      }
      
      // Check each budget and show alerts
      for (const budget of categoryBudgets) {
        console.log(`Budget ${budget.categoryName} (${budget.period}):`, {
          status: budget.status,
          spent: budget.spent,
          amount: budget.amount,
          percentage: budget.percentage
        });

        if (budget.status === "exceeded") {
          console.log("🚨 BUDGET EXCEEDED!");
          toast.error(
            `🚨 Budget Exceeded! Your ${budget.categoryName} budget (${budget.period}) has been exceeded. Spent: ${currencySymbol}${budget.spent.toFixed(2)} of ${currencySymbol}${budget.amount.toFixed(2)}`,
            { 
              duration: 10000,
              position: "top-center"
            }
          );
        } else if (budget.status === "warning") {
          console.log("⚠️ BUDGET WARNING!");
          toast.warning(
            `⚠️ Budget Warning! You've used ${budget.percentage.toFixed(0)}% of your ${budget.categoryName} budget (${budget.period}). Remaining: ${currencySymbol}${budget.remaining.toFixed(2)}`,
            { 
              duration: 8000,
              position: "top-center"
            }
          );
        } else {
          console.log("✅ Budget status is good");
        }
      }
    } catch (error) {
      console.error("Error checking budget status:", error);
      toast.error("Failed to check budget status");
    }
  };

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchTransactions();
      fetchCategories();
    }
  }, [session]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");
      const params = new URLSearchParams({ userId: session!.user.id });
      if (filterType !== "all") params.append("type", filterType);
      if (filterCategory !== "all") params.append("categoryId", filterCategory);

      console.log("Fetching transactions with filters:", { filterType, filterCategory });
      console.log("API URL:", `/api/transactions?${params}`);

      const response = await fetch(`/api/transactions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log("Received transactions:", data.transactions?.length, "transactions");
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
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
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchTransactions();
    }
  }, [filterType, filterCategory, session]);

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription(transcript);
      
      // AI categorization using API
      await handleAICategorization(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      toast.error("Speech recognition failed");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleAICategorization = async (desc: string) => {
    if (!desc.trim()) return;

    try {
      setAiCategorizing(true);
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description: desc }),
      });

      const data = await response.json();
      if (data.categoryId) {
        setCategoryId(data.categoryId.toString());
        toast.success("Category suggested by AI!");
      }
    } catch (error) {
      console.error("Error with AI categorization:", error);
    } finally {
      setAiCategorizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryId || !amount || !date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : "/api/transactions";
      const method = editingTransaction ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: session!.user.id,
          type,
          categoryId: parseInt(categoryId),
          amount: parseFloat(amount),
          date,
          description,
        }),
      });

      if (response.ok) {
        toast.success(editingTransaction ? "Transaction updated!" : "Transaction added!");
        
        // Check budget status after adding/updating transaction
        await checkBudgetStatus(parseInt(categoryId), type);
        
        resetForm();
        setIsDialogOpen(false);
        await fetchTransactions(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save transaction");
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      toast.error("Failed to save transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const performDelete = async () => {
    if (pendingDeleteId == null) return;
    try {
      const token = localStorage.getItem("bearer_token");
      const userId = session!.user.id;
      const response = await fetch(`/api/transactions/${pendingDeleteId}?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        toast.success("Transaction deleted!");
        await fetchTransactions();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    } finally {
      setIsDeleteOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setType(transaction.type as "income" | "expense");
    setCategoryId(transaction.categoryId.toString());
    setAmount(transaction.amount.toString());
    setDate(transaction.date);
    setDescription(transaction.description || "");
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setType("expense");
    setCategoryId("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
  };

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Category", "Amount", "Description"];
    const rows = transactions.map((t) => [
      t.date,
      t.type,
      t.categoryName,
      t.amount.toString(),
      t.description,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
  };

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netBalance = totalIncome - totalExpenses;

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
      <header className="bg-white dark:bg-gray-800 border-b border-yellow-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="text-3xl">🐝</div>
            <span className="text-2xl font-bold text-yellow-600">Budget Bee</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-yellow-600">
              Dashboard
            </Link>
            <Link href="/transactions" className="text-yellow-600 font-semibold">
              Transactions
            </Link>
            <Link href="/budgets" className="text-gray-600 dark:text-gray-300 hover:text-yellow-600">
              Budgets
            </Link>
            <Link href="/insights" className="text-gray-600 dark:text-gray-300 hover:text-yellow-600">
              AI Insights
            </Link>
            <Link href="/profile" className="text-gray-600 dark:text-gray-300 hover:text-yellow-600">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Transactions</h1>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Loader2 className="h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM dd, yyyy")
                    )
                  ) : (
                    "Pick a date"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={2}
                />
                <div className="p-3 border-t">
                  <Button 
                    size="sm" 
                    className="w-full" 
                    variant="outline"
                    onClick={() => setDateRange({})}
                  >
                    Clear Selection
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black gap-2">
                  <Plus className="h-4 w-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(val) => setType(val as "income" | "expense")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Category {aiCategorizing && <span className="text-xs text-yellow-600">(AI categorizing...)</span>}</Label>
                    <Select value={categoryId} onValueChange={setCategoryId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(cat => cat.type === type).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <div className="flex gap-2">
                      <Input
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                        }}
                        onBlur={(e) => {
                          if (e.target.value && !categoryId) {
                            handleAICategorization(e.target.value);
                          }
                        }}
                        placeholder="Add a description... (AI will suggest category)"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleVoiceInput}
                        disabled={isRecording}
                        title="Voice input with AI categorization"
                      >
                        {isRecording ? (
                          <MicOff className="h-4 w-4 text-red-500" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleAICategorization(description)}
                        disabled={!description || aiCategorizing}
                        title="AI categorize"
                      >
                        <Sparkles className="h-4 w-4 text-yellow-600" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Tip: Describe your transaction and AI will suggest the best category
                    </p>
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
                    ) : editingTransaction ? (
                      "Update Transaction"
                    ) : (
                      "Add Transaction"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{currencySymbol}{totalIncome.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{currencySymbol}{totalExpenses.toFixed(2)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Balance</p>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {currencySymbol}{netBalance.toFixed(2)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Filter by Category</Label>
              <Select value={filterCategory} onValueChange={(value) => {
                console.log("Category filter changed to:", value);
                setFilterCategory(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(filterType !== "all" || filterCategory !== "all") && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <span>Active filters:</span>
              {filterType !== "all" && (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                  Type: {filterType}
                </span>
              )}
              {filterCategory !== "all" && (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                  Category: {categories.find(c => c.id.toString() === filterCategory)?.name || filterCategory}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilterType("all");
                  setFilterCategory("all");
                }}
                className="ml-2"
              >
                Clear all
              </Button>
            </div>
          )}
        </Card>

        {/* Transactions List */}
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No transactions found. Add your first transaction!</p>
            </Card>
          ) : (
            transactions.map((transaction) => (
              <Card key={transaction.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{transaction.categoryIcon}</div>
                    <div>
                      <h3 className="font-semibold">{transaction.categoryName}</h3>
                      <p className="text-sm text-gray-500">{transaction.description}</p>
                      <p className="text-xs text-gray-400">{transaction.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xl font-bold ${
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}{currencySymbol}{transaction.amount.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setPendingDeleteId(transaction.id);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finance Chatbot */}
      {session?.user && <FinanceChatbot userId={session.user.id} />}
      
      {/* Tax Calculator */}
      <TaxCalculator />
    </div>
  );
}