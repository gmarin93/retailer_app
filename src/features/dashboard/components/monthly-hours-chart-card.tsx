"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { LoadingState } from "@/shared/components/loading-state";
import type { ListableCustomer } from "@/shared/services/entities/customers";
import type { MonthlyHoursDatum } from "../schemas";

/** "Complete hours by month" — single client + year (customer portal). */
export function MonthlyHoursChartCard({
  data,
  isLoading,
  customers,
  customerId,
  onCustomerChange,
  years,
  year,
  onYearChange,
}: {
  data: MonthlyHoursDatum[];
  isLoading: boolean;
  customers: ListableCustomer[];
  customerId: number | null;
  onCustomerChange: (id: number) => void;
  years: number[];
  year: number;
  onYearChange: (year: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Complete hours by month</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={customerId === null ? undefined : String(customerId)}
            onValueChange={(value) => onCustomerChange(Number(value))}
          >
            <SelectTrigger size="sm" aria-label="Client">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={String(customer.id)}>
                  {customer.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(value) => onYearChange(Number(value))}>
            <SelectTrigger size="sm" aria-label="Year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState label="Loading chart…" className="h-72" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${Math.round(Number(value))} h`, "Hours"]} />
                <Bar
                  dataKey="value"
                  name="Complete hours"
                  fill="#4c6fff"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
