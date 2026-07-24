"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  paymentMethod: string;
}

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [],
  loading: true,
  addExpense: async () => {},
  deleteExpense: async () => {},
  refetch: async () => {},
});

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { propertyId } = usePropertyContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!propertyId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("property_id", propertyId)
      .order("date", { ascending: false });

    if (data) {
      setExpenses(data.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description || "",
        amount: e.amount,
        date: e.date,
        vendor: e.vendor || "",
        paymentMethod: e.payment_method || "Cash",
      })));
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = useCallback(async (expense: Omit<Expense, "id">) => {
    if (!propertyId) return;

    const { data } = await supabase
      .from("expenses")
      .insert({
        property_id: propertyId,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        vendor: expense.vendor,
        payment_method: expense.paymentMethod,
      })
      .select()
      .single();

    if (data) {
      setExpenses((prev) => [{
        id: data.id,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        vendor: expense.vendor,
        paymentMethod: expense.paymentMethod,
      }, ...prev]);
    }
  }, [propertyId]);

  const deleteExpense = useCallback(async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <ExpenseContext.Provider value={{ expenses, loading, addExpense, deleteExpense, refetch: fetchExpenses }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export const useExpenses = () => useContext(ExpenseContext);
