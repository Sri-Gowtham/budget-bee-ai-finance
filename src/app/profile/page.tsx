"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Bell, Settings, Save, Camera, Palette, Shield, KeyRound, Download, Trash2, HelpCircle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { countries, getCountryByName } from "@/lib/location-data";
import { motion } from "framer-motion";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  languagePreference: string;
  timezone: string | null;
  themeMode: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  } | null;
  accessibilityOptions: {
    fontSize: string;
    voiceAssist: boolean;
  } | null;
}

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    phoneNumber: "",
    dateOfBirth: "",
    country: "",
    region: "",
    preferredCurrency: "auto",
    monthlyIncome: "",
    budgetCycle: "monthly",
    defaultDashboardView: "overview",
    aiInsightsEnabled: true,
    spendingPersonality: "",
    taxAndStockTracking: false,
    timezone: "",
    themeMode: "auto",
    notificationEmail: true,
    notificationSms: false,
    notificationInApp: true,
    notificationBudgetAlerts: true,
    notificationFraudAlerts: true,
    fontSize: "medium",
    voiceAssist: false,
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  useEffect(() => {
    // Apply font size on mount and when it changes
    applyFontSize(formData.fontSize);
  }, [formData.fontSize]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/profile?userId=${session?.user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        
        // Populate form with profile data
        setFormData({
          name: data.name || "",
          username: data.username || "",
          phoneNumber: data.phoneNumber || "",
          dateOfBirth: data.dateOfBirth || "",
          country: data.country || "",
          region: data.region || "",
          preferredCurrency: (typeof window !== "undefined" && localStorage.getItem("preferredCurrency")) || "auto",
          monthlyIncome: (typeof window !== "undefined" && localStorage.getItem("monthlyIncome")) || "",
          budgetCycle: (typeof window !== "undefined" && localStorage.getItem("budgetCycle")) || "monthly",
          defaultDashboardView: (typeof window !== "undefined" && localStorage.getItem("defaultDashboardView")) || "overview",
          aiInsightsEnabled: (typeof window !== "undefined" && localStorage.getItem("aiInsightsEnabled") === "false" ? false : true),
          spendingPersonality: (typeof window !== "undefined" && localStorage.getItem("spendingPersonality")) || "",
          taxAndStockTracking: (typeof window !== "undefined" && localStorage.getItem("taxAndStockTracking") === "true"),
          timezone: data.timezone || "",
          themeMode: data.themeMode || localStorage.getItem("theme") || "auto",
          notificationEmail: data.notificationPreferences?.email ?? true,
          notificationSms: data.notificationPreferences?.sms ?? false,
          notificationInApp: data.notificationPreferences?.inApp ?? true,
          notificationBudgetAlerts: (typeof window !== "undefined" && localStorage.getItem("notificationBudgetAlerts") === "false" ? false : true),
          notificationFraudAlerts: (typeof window !== "undefined" && localStorage.getItem("notificationFraudAlerts") === "false" ? false : true),
          fontSize: data.accessibilityOptions?.fontSize || "medium",
          voiceAssist: data.accessibilityOptions?.voiceAssist ?? false,
        });
        
        // Apply font size immediately
        applyFontSize(data.accessibilityOptions?.fontSize || "medium");
        
        // Apply theme immediately
        applyTheme(data.themeMode || localStorage.getItem("theme") || "auto");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
      setLoading(false);
    }
  };

  const applyFontSize = (fontSize: string) => {
    const body = document.body;
    body.classList.remove("font-small", "font-medium", "font-large", "font-extra-large");
    body.classList.add(`font-${fontSize}`);
    localStorage.setItem("fontSize", fontSize);
    
    // Dispatch custom event for ThemeProvider to listen
    window.dispatchEvent(new CustomEvent("localStorageChange", {
      detail: { key: "fontSize", value: fontSize }
    }));
  };

  const applyTheme = (theme: string) => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else if (theme === "light") {
      html.classList.remove("dark");
    } else if (theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
    localStorage.setItem("theme", theme);
    
    // Dispatch custom event for ThemeProvider to listen
    window.dispatchEvent(new CustomEvent("localStorageChange", {
      detail: { key: "theme", value: theme }
    }));
  };

  const handleCountryChange = (newCountry: string) => {
    const countryData = getCountryByName(newCountry);
    setFormData({ 
      ...formData, 
      country: newCountry, 
      timezone: countryData?.timezone || ""
    });
  };

  // Link social accounts
  const handleLinkAccount = async (provider: "google" | "facebook") => {
    try {
      const { error } = await (authClient as any).linkSocial?.({ provider });
      if (error?.code) {
        toast.error(`Failed to link ${provider}: ${error.code}`);
        return;
      }
      toast.success(`${provider[0].toUpperCase() + provider.slice(1)} linked`);
    } catch (e) {
      // Fallback: try signIn.social to initiate OAuth linking
      try {
        const { error } = await (authClient as any).signIn?.social?.({ provider });
        if (error?.code) {
          toast.error(`Failed to link ${provider}`);
        } else {
          toast.success(`${provider[0].toUpperCase() + provider.slice(1)} linked`);
        }
      } catch {
        toast.error("Social linking not available yet");
      }
    }
  };

  // Download data as CSV (transactions + budgets)
  const handleDownloadData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const [txRes, bdgRes] = await Promise.all([
        fetch(`/api/transactions?userId=${session?.user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/budgets?userId=${session?.user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!txRes.ok && !bdgRes.ok) {
        toast.error("Nothing to export yet");
        return;
      }

      const txJson = txRes.ok ? await txRes.json() : { transactions: [] };
      const bdgJson = bdgRes.ok ? await bdgRes.json() : { budgets: [] };

      const txData = txJson.transactions || [];
      const bdgData = bdgJson.budgets || [];

      const txCsvHeader = "id,date,type,category,description,amount\n";
      const txCsvRows = txData.map((t: any) =>
        [t.id, t.date, t.type || "", t.categoryName || "", (t.description || "").replace(/,/g, " "), t.amount].join(",")
      ).join("\n");

      const bdgCsvHeader = "id,category,limit,spent,period,status\n";
      const bdgCsvRows = bdgData.map((b: any) =>
        [b.id, b.categoryName || "", b.amount, b.spent ?? 0, b.period || "monthly", b.status || ""].join(",")
      ).join("\n");

      const combined = [
        "Transactions",
        txCsvHeader + txCsvRows,
        "",
        "Budgets",
        bdgCsvHeader + bdgCsvRows,
      ].join("\n");

      const blob = new Blob([combined], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "budgetbee-export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export started");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      const updateData = {
        name: formData.name,
        username: formData.username || null,
        phoneNumber: formData.phoneNumber || null,
        dateOfBirth: formData.dateOfBirth || null,
        country: formData.country || null,
        city: null,
        region: formData.region || null,
        languagePreference: "en",
        timezone: formData.timezone || null,
        themeMode: formData.themeMode,
        notificationPreferences: {
          email: formData.notificationEmail,
          sms: formData.notificationSms,
          inApp: formData.notificationInApp,
        },
        accessibilityOptions: {
          fontSize: formData.fontSize,
          voiceAssist: formData.voiceAssist,
        },
      };

      // Persist client-only preferences locally
      localStorage.setItem("preferredCurrency", formData.preferredCurrency || "auto");
      localStorage.setItem("monthlyIncome", formData.monthlyIncome || "");
      localStorage.setItem("budgetCycle", formData.budgetCycle || "monthly");
      localStorage.setItem("defaultDashboardView", formData.defaultDashboardView || "overview");
      localStorage.setItem("aiInsightsEnabled", String(formData.aiInsightsEnabled));
      if (formData.spendingPersonality) localStorage.setItem("spendingPersonality", formData.spendingPersonality);
      localStorage.setItem("taxAndStockTracking", String(formData.taxAndStockTracking));
      localStorage.setItem("notificationBudgetAlerts", String(formData.notificationBudgetAlerts));
      localStorage.setItem("notificationFraudAlerts", String(formData.notificationFraudAlerts));

      const response = await fetch(`/api/profile?userId=${session?.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        
        // Apply font size immediately after saving
        applyFontSize(formData.fontSize);
        
        // Apply theme immediately after saving
        applyTheme(formData.themeMode);
        
        toast.success("Profile updated successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
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
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="text-3xl">🐝</div>
              <span className="text-xl font-bold text-yellow-600">Budget Bee</span>
            </Link>
            <div className="hidden md:flex gap-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-yellow-600">
                Dashboard
              </Link>
              <Link href="/transactions" className="text-gray-600 hover:text-yellow-600">
                Transactions
              </Link>
              <Link href="/budgets" className="text-gray-600 hover:text-yellow-600">
                Budgets
              </Link>
              <Link href="/insights" className="text-gray-600 hover:text-yellow-600">
                AI Insights
              </Link>
              <Link href="/profile" className="text-gray-700 font-semibold hover:text-yellow-600">
                Profile
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        {/* Profile Picture Section */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile?.image ? (
                <img
                  src={profile.image}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-yellow-100 dark:border-yellow-900"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center border-4 border-yellow-200 dark:border-yellow-800">
                  <User className="h-12 w-12 text-yellow-600" />
                </div>
              )}
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{profile?.name}</h3>
              <p className="text-gray-600">{profile?.email}</p>
              {profile?.username && (
                <Badge variant="secondary" className="mt-2">@{profile.username}</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <User className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Basic Information</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="johndoe"
              />
            </div>

            <div>
              <Label htmlFor="email">Email ID *</Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1-555-0123"
              />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                value={formData.country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select country...</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="region">Region / State</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="New York"
              />
            </div>

            <div>
              <Label htmlFor="timezone">Time Zone (Auto-detected)</Label>
              <Input
                id="timezone"
                value={formData.timezone}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 mt-1">Timezone is automatically set based on your country</p>
            </div>
          </div>
        </Card>

        {/* Personalization & Preferences */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Personalization & Preferences</h2>
          </div>

          <div className="space-y-6">
            {/* Theme Mode */}
            <div>
              <Label htmlFor="themeMode">Theme</Label>
              <select
                id="themeMode"
                value={formData.themeMode}
                onChange={(e) => {
                  const newTheme = e.target.value;
                  setFormData({ ...formData, themeMode: newTheme });
                  applyTheme(newTheme);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Theme applies across all pages</p>
            </div>

            {/* Preferred Currency */}
            <div>
              <Label htmlFor="preferredCurrency">Preferred Currency</Label>
              <select
                id="preferredCurrency"
                value={formData.preferredCurrency}
                onChange={(e) => setFormData({ ...formData, preferredCurrency: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="auto">Auto (based on country)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Financial Preferences */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Financial Preferences</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthlyIncome">Monthly Income</Label>
              <Input
                id="monthlyIncome"
                type="number"
                value={formData.monthlyIncome}
                onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                placeholder="e.g., 5000"
              />
            </div>
            <div>
              <Label htmlFor="budgetCycle">Budget Cycle</Label>
              <select
                id="budgetCycle"
                value={formData.budgetCycle}
                onChange={(e) => setFormData({ ...formData, budgetCycle: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <Label htmlFor="defaultDashboardView">Default Dashboard View</Label>
              <select
                id="defaultDashboardView"
                value={formData.defaultDashboardView}
                onChange={(e) => setFormData({ ...formData, defaultDashboardView: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="overview">Overview</option>
                <option value="insights">Insights</option>
                <option value="categories">Categories</option>
              </select>
            </div>
          </div>
        </Card>

        {/* AI & App Settings */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">AI & App Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable AI Insights</Label>
                <p className="text-sm text-gray-500">Get spending patterns and recommendations</p>
              </div>
              <input
                type="checkbox"
                checked={formData.aiInsightsEnabled}
                onChange={(e) => setFormData({ ...formData, aiInsightsEnabled: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
            </div>
            <div>
              <Label htmlFor="spendingPersonality">Spending Personality</Label>
              <Input
                id="spendingPersonality"
                value={formData.spendingPersonality}
                onChange={(e) => setFormData({ ...formData, spendingPersonality: e.target.value })}
                placeholder="Auto-generated by AI"
              />
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Notification Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive updates via email</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notificationEmail}
                onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-gray-500">Receive alerts via text message</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notificationSms}
                onChange={(e) => setFormData({ ...formData, notificationSms: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>In-App Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications in the app</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notificationInApp}
                onChange={(e) => setFormData({ ...formData, notificationInApp: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Budget Alerts</Label>
                <p className="text-sm text-gray-500">Get alerts when nearing budget limits</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notificationBudgetAlerts}
                onChange={(e) => setFormData({ ...formData, notificationBudgetAlerts: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Fraud Detection Alerts</Label>
                <p className="text-sm text-gray-500">Notify for suspicious transactions</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notificationFraudAlerts}
                onChange={(e) => setFormData({ ...formData, notificationFraudAlerts: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
            </div>
          </div>
        </Card>

        {/* Connected Accounts */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <Link2 className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Connected Accounts</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-gray-500">Link your Google account</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleLinkAccount("google")}>Link</Button>
            </div>
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">Facebook</p>
                <p className="text-sm text-gray-500">Link your Facebook account</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleLinkAccount("facebook")}>Link</Button>
            </div>
          </div>
        </Card>

        {/* Security & Account */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Security & Account</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info("Password change coming soon")}>Change</Button>
            </div>

            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">Download Data (CSV)</p>
                <p className="text-sm text-gray-500">Export your transactions and budgets</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadData}>Download</Button>
            </div>

            <div className="rounded-md border p-4 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">Delete Account</p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80">This action is permanent and cannot be undone.</p>
                </div>
                {!confirmDelete ? (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>Delete</Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button variant="destructive" size="sm" onClick={() => toast.error("Account deletion not implemented yet")}>Confirm</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Support & Feedback */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Support & Feedback</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">Contact Support</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.open("mailto:support@budgetbee.app","_self")}>Contact</Button>
            </div>
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">Submit Feedback</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info("Feedback form coming soon")}>Submit</Button>
            </div>
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">Report a Bug</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info("Bug report coming soon")}>Report</Button>
            </div>
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">FAQs / Help Center</p>
              </div>
              <Link href="/help">
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Accessibility Options */}
        <Card className="p-6 mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Accessibility Options</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fontSize">Font Size</Label>
              <select
                id="fontSize"
                value={formData.fontSize}
                onChange={(e) => {
                  const newFontSize = e.target.value;
                  setFormData({ ...formData, fontSize: newFontSize });
                  applyFontSize(newFontSize);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra Large</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Voice Assist</Label>
                <p className="text-sm text-gray-500">Enable voice assistance features</p>
              </div>
              <input
                type="checkbox"
                checked={formData.voiceAssist}
                onChange={(e) => setFormData({ ...formData, voiceAssist: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}