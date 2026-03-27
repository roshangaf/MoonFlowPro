
"use client"

import { useState } from "react"
import { 
  BadgeDollarSign, 
  Calendar, 
  Download,
  CreditCard,
  Building2,
  ArrowUpRight,
  Trash2,
  X,
  TrendingUp,
  PackageCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MOCK_SALES, MOCK_PRODUCTS, MOCK_CUSTOMERS } from "@/app/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function SalesPage() {
  const [sales, setSales] = useState(MOCK_SALES)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  
  const { toast } = useToast()

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === sales.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sales.map(s => s.id)))
    }
  }

  const handleBulkDelete = () => {
    setSales(sales.filter(s => !selectedIds.has(s.id)))
    const count = selectedIds.size
    setSelectedIds(new Set())
    setIsSelectionMode(false)
    setIsBulkDeleteOpen(false)
    toast({
      title: "Transactions Cleared",
      description: `${count} sales records have been removed.`,
      variant: "destructive"
    })
  }

  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0)
  const avgSale = sales.length > 0 ? totalRevenue / sales.length : 0

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-2 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-headline">Sales Transactions</h1>
          <p className="text-muted-foreground font-body text-sm md:text-base">Detailed performance monitoring and sales records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isSelectionMode ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedIds(new Set())
                }}
                className="flex-1 md:flex-none gap-2"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button 
                variant="destructive" 
                disabled={selectedIds.size === 0}
                onClick={() => setIsBulkDeleteOpen(true)}
                className="flex-1 md:flex-none gap-2 shadow-lg"
              >
                <Trash2 className="h-4 w-4" /> Delete ({selectedIds.size})
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="border-destructive text-destructive hover:bg-destructive/10 flex-1 md:flex-none gap-2 shadow-sm"
                onClick={() => setIsSelectionMode(true)}
              >
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none gap-2">
                <Download className="h-4 w-4" /> Export Report
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-primary p-6 rounded-2xl text-primary-foreground shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-primary-foreground/70 text-sm font-medium">Monthly Revenue</p>
              <h2 className="text-2xl md:text-3xl font-bold mt-1">${totalRevenue.toLocaleString()}</h2>
            </div>
            <div className="bg-white/10 p-2 rounded-lg">
              <BadgeDollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-primary-foreground/80">
            <Badge variant="secondary" className="bg-white/20 text-white border-none">+18.5%</Badge>
            <span>vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Average Sale Value</p>
              <h2 className="text-2xl md:text-3xl font-bold mt-1 text-primary">${avgSale.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
            </div>
            <div className="bg-secondary p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-emerald-600">Healthy</span>
            <span>growth margin</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Items Sold</p>
              <h2 className="text-2xl md:text-3xl font-bold mt-1 text-primary">{sales.length}</h2>
            </div>
            <div className="bg-secondary p-2 rounded-lg">
              <PackageCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Recent</span>
            <span>transaction volume</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                {isSelectionMode && (
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedIds.size > 0 && selectedIds.size === sales.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold min-w-[140px]">Transaction ID</TableHead>
                <TableHead className="font-semibold min-w-[160px]">Customer</TableHead>
                <TableHead className="font-semibold min-w-[200px]">Product</TableHead>
                <TableHead className="font-semibold text-center min-w-[120px]">Date</TableHead>
                <TableHead className="font-semibold min-w-[140px]">Method</TableHead>
                <TableHead className="font-semibold text-right min-w-[120px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => {
                const product = MOCK_PRODUCTS.find(p => p.id === sale.productId);
                const customer = MOCK_CUSTOMERS.find(c => c.id === sale.customerId);
                return (
                  <TableRow 
                    key={sale.id} 
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors",
                      selectedIds.has(sale.id) && "bg-primary/5 hover:bg-primary/10"
                    )}
                  >
                    {isSelectionMode && (
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.has(sale.id)}
                          onCheckedChange={() => toggleSelection(sale.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                      #{sale.id}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{customer?.name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm line-clamp-1">{product?.name}</span>
                        <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {sale.date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        {sale.paymentMethod.includes('Card') ? <CreditCard className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                        {sale.paymentMethod}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-primary">${sale.amount.toLocaleString()}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isSelectionMode ? 7 : 6} className="h-32 text-center text-muted-foreground">
                    No sales transactions recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="w-[95vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently remove these sales records. This cannot be undone and will affect your revenue summaries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
