"use client";

import { useExpenses } from "@/lib/ExpenseContext";
import { Search, Plus, Wallet, Zap, Users, Wrench, Wifi, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Chip, Button } from "@heroui/react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";

const expenseCategories = ["Utilities", "Salary", "Repairs", "Internet", "Miscellaneous"];

const categoryIcons: Record<string, React.ReactNode> = {
  Utilities: <Zap size={16} className="text-amber-600" />,
  Salary: <Users size={16} className="text-blue-600" />,
  Repairs: <Wrench size={16} className="text-red-600" />,
  Internet: <Wifi size={16} className="text-indigo-600" />,
  Miscellaneous: <MoreHorizontal size={16} className="text-slate-600" />,
};

const categoryColors: Record<string, string> = {
  Utilities: "bg-amber-50 text-amber-700",
  Salary: "bg-blue-50 text-blue-700",
  Repairs: "bg-red-50 text-red-700",
  Internet: "bg-indigo-50 text-indigo-700",
  Miscellaneous: "bg-slate-100 text-slate-700",
};

export default function ExpensesPage() {
  const { expenses, loading, addExpense } = useExpenses();
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: "Utilities", description: "", amount: "", vendor: "", date: "", paymentMethod: "UPI" });

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  const filtered = expenses.filter((e) => {
    const matchesCategory = filter === "All" || e.category === filter;
    const matchesSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.vendor.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalMonthly = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = expenseCategories.map((cat) => ({
    name: cat,
    total: expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
  })).sort((a, b) => b.total - a.total);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.vendor || !form.date) return;
    addExpense({
      category: form.category,
      description: form.description,
      amount: parseInt(form.amount),
      vendor: form.vendor,
      date: form.date,
      paymentMethod: form.paymentMethod,
    });
    setForm({ category: "Utilities", description: "", amount: "", vendor: "", date: "", paymentMethod: "UPI" });
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Expenses</h2>
          <p className="text-sm text-slate-500 mt-1">Track and manage property expenses</p>
        </div>
        <Button variant="primary" size="sm" onPress={() => setShowModal(true)}>
          <Plus size={14} />
          Add Expense
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <Wallet size={18} className="text-slate-700" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Monthly Total</p>
                <p className="text-xl font-bold text-slate-900">{`₹${totalMonthly.toLocaleString("en-IN")}`}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
        {byCategory.slice(0, 3).map((cat) => (
          <Card key={cat.name} className="card-hover">
            <Card.Content className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${categoryColors[cat.name]?.split(" ")[0] || "bg-slate-100"}`}>
                  {categoryIcons[cat.name]}
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{cat.name}</p>
                  <p className="text-xl font-bold text-slate-900">{`₹${cat.total.toLocaleString("en-IN")}`}</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
          {["All", ...expenseCategories].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === cat ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="No expenses found" description="Try adjusting your filters or add a new expense" />
      ) : (
        <Card>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Category</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Description</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Date</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Vendor</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => (
                    <tr key={expense.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <Chip size="sm" variant="soft" className={categoryColors[expense.category]}>
                          {expense.category}
                        </Chip>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{expense.description}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{`₹${expense.amount.toLocaleString("en-IN")}`}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{new Date(expense.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{expense.vendor}</td>
                      <td className="px-5 py-3.5">
                        <Chip size="sm" variant="soft" color={expense.paymentMethod === "UPI" ? "accent" : expense.paymentMethod === "Cash" ? "default" : "success"}>
                          {expense.paymentMethod}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor</label>
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
