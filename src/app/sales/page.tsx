"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  BadgeDollarSign, 
  Calendar, 
  CreditCard,
  Building2,
  ArrowUpRight,
  Trash2,
  X,
  TrendingUp,
  PackageCheck,
  Loader2,
  Plus,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, doc, query, where } from "firebase/firestore"
import { deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function SalesPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/")
    }
  }, [user, isUserLoading, router])

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "businessUsers", user.uid)
  }, [db, user?.uid])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)
  const isApproved = profile?.approved === true || user?.email === 'roshanismean@gmail.com'
  const companyId = profile?.companyId
  const isSuperAdmin = user?.email === 'roshanismean@gmail.com'

  // Fetch Sales
  const salesQuery = useMemoFirebase(() => {
    if (!db || !user || !isApproved) return null
    if (isSuperAdmin) return collection(db, "sales")
    if (!companyId) return null
    return query(collection(db, "sales"), where("companyId", "==", companyId))
  }, [db, user, companyId, isSuperAdmin, isApproved])

  const { data: sales, isLoading: salesLoading } = useCollection(salesQuery)

  // Fetch Customers and Products for recording new sale
  const customersQuery = useMemoFirebase(() => {
    if (!db || !companyId || !isApproved) return null
    return query(collection(db, "customers"), where("companyId", "==", companyId))
  }, [db, companyId, isApproved])
  
  const productsQuery = useMemoFirebase(() => {
    if (!db || !companyId || !isApproved) return null
    return query(collection(db, "products"), where("companyId", "==", companyId), where("lifecycleStatus", "!=", "Sold"))
  }, [db, companyId, isApproved])

  const { data: customers } = useCollection(customersQuery)
  const { data: products } = useCollection(productsQuery)

  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newSale, setNewSale] = useState({
    customerId: "",
    productId: "",
    amount: "",
    paymentMethod: "Credit Card",
    paymentStatus: "Completed"
  })

  const handleRecordSale = () => {
    if (!newSale.customerId || !newSale.productId || !newSale.amount) {
      toast({ title: "Missing Fields", description: "Please select customer, product and enter amount.", variant: "destructive" })
      return
    }

    if (!db || !companyId) return

    const saleData = {
      customerId: newSale.customerId,
      productId: newSale.productId,
      totalAmount: Number(newSale.amount),
      paymentMethod: newSale.paymentMethod,
      paymentStatus: newSale.paymentStatus,
      companyId: companyId,
      createdAt: new Date().toISOString(),
      saleDate: new Date().toISOString(),
    }

    // Add Sale
    addDocumentNonBlocking(collection(db, "sales"), saleData)

    // Mark Product as Sold
    updateDocumentNonBlocking(doc(db, "products", newSale.productId), {
      lifecycleStatus: "Sold",
      updatedAt: new Date().toISOString()
    })

    // Update Customer Lifetime Value
    const customer = customers?.find(c => c.id === newSale.customerId)
    if (customer) {
      updateDocumentNonBlocking(doc(db, "customers", customer.id), {
        totalSpent: (customer.totalSpent || 0) + Number(newSale.amount),
        updatedAt: new Date().toISOString()
      })
    }

    setIsAddDialogOpen(false)
    setNewSale({ customerId: "", productId: "", amount: "", paymentMethod: "Credit Card", paymentStatus: "Completed" })
    toast({ title: "Sale Recorded", description: "The transaction has been logged and inventory updated." })
  }

  const handleDelete = () => {
    if (deleteId && db) {
      deleteDocumentNonBlocking(doc(db, "sales", deleteId))
      setDeleteId(null)
      toast({ title: "Sale Deleted", variant: "destructive" })
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const totalRevenue = (sales || []).reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  const avgSale = (sales || []).length > 0 ? totalRevenue / (sales || []).length : 0

  const isLoading = isUserLoading || isProfileLoading || salesLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !isApproved) return null

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-2 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-headline">Sales Transactions</h1>
          <p className="text-muted-foreground font-body text-sm md:text-base">Detailed performance monitoring and sales records.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3">
          {isSelectionMode ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedIds(new Set())
                }}
                className="gap-2 h-11"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button 
                variant="destructive" 
                disabled={selectedIds.size === 0}
                onClick={() => setIsBulkDeleteOpen(true)}
                className="gap-2 h-11 shadow-lg"
              >
                <Trash2 className="h-4 w-4" /> Delete ({selectedIds.size})
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="border-destructive text-destructive hover:bg-destructive/10 gap-2 h-11 shadow-sm"
                onClick={() => setIsSelectionMode(true)}
              >
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg gap-2 h-11" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Record New Sale
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary p-6 text-primary-foreground shadow-lg border-none overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <BadgeDollarSign className="h-32 w-32" />
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-primary-foreground/70 text-sm font-bold uppercase tracking-wider">Total Revenue</p>
              <h2 className="text-3xl md:text-4xl font-bold mt-1">${totalRevenue.toLocaleString()}</h2>
            </div>
            <div className="bg-white/10 p-2 rounded-lg">
              <BadgeDollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-primary-foreground/80 relative z-10">
            <Badge variant="secondary" className="bg-white/20 text-white border-none font-bold">+18.5%</Badge>
            <span className="font-medium">Company Total</span>
          </div>
        </Card>

        <Card className="bg-card p-6 rounded-2xl border shadow-sm group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">Average Sale</p>
              <h2 className="text-3xl font-bold mt-1 text-primary">${avgSale.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
            </div>
            <div className="bg-secondary p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-bold text-emerald-600">Stable Growth</span>
          </div>
        </Card>

        <Card className="bg-card p-6 rounded-2xl border shadow-sm group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">Units Sold</p>
              <h2 className="text-3xl font-bold mt-1 text-primary">{(sales || []).length}</h2>
            </div>
            <div className="bg-secondary p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
              <PackageCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-bold">Total Transactions</span>
          </div>
        </Card>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-card rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {isSelectionMode && (
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedIds.size > 0 && selectedIds.size === (sales || []).length}
                    onCheckedChange={() => {
                        if (selectedIds.size === (sales || []).length) setSelectedIds(new Set())
                        else setSelectedIds(new Set((sales || []).map(s => s.id)))
                    }}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold text-foreground">Transaction ID</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="text-center font-semibold text-foreground">Date</TableHead>
              <TableHead className="font-semibold text-foreground">Method</TableHead>
              <TableHead className="font-semibold text-right text-foreground">Amount</TableHead>
              {!isSelectionMode && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(sales || []).map((sale) => (
              <TableRow 
                key={sale.id} 
                className={cn(
                  "hover:bg-muted/50 transition-colors",
                  selectedIds.has(sale.id) && "bg-primary/5"
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
                  #{sale.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 uppercase text-[10px] font-bold">
                    {sale.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                    {sale.paymentMethod?.includes('Card') ? <CreditCard className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                    {sale.paymentMethod || 'Other'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-primary">${(sale.totalAmount || 0).toLocaleString()}</span>
                </TableCell>
                {!isSelectionMode && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(sale.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(sales || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium italic">
                  No sales transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {(sales || []).map((sale) => (
          <Card key={sale.id} className={cn("border-none shadow-sm relative overflow-hidden group bg-card", selectedIds.has(sale.id) && "ring-2 ring-primary")}>
            {isSelectionMode && (
              <div className="absolute top-4 left-4 z-10">
                <Checkbox checked={selectedIds.has(sale.id)} onCheckedChange={() => toggleSelection(sale.id)} />
              </div>
            )}
            <CardContent className={cn("p-4 flex flex-col gap-4", isSelectionMode && "pl-12")}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary">
                    <BadgeDollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Sale Record</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">ID: #{sale.id.slice(0, 8)}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[9px] font-bold">
                  {sale.paymentStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-muted/50">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Transaction Value</span>
                  <span className="text-lg font-bold text-primary">${(sale.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Method</span>
                  <span className="text-xs font-bold flex items-center gap-1.5 justify-end mt-1">
                    {sale.paymentMethod?.includes('Card') ? <CreditCard className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                    {sale.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  <Calendar className="h-3 w-3" />
                  {new Date(sale.createdAt).toLocaleDateString()}
                </div>
                {!isSelectionMode && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(sale.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {(sales || []).length === 0 && (
          <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed font-medium">No sales transactions logged.</div>
        )}
      </div>

      {/* Record New Sale Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-2xl bg-card p-0 overflow-hidden">
          <div className="p-6 bg-muted/30 border-b">
            <DialogTitle>Record New Sale</DialogTitle>
            <DialogDescription>Log a completed transaction and update your inventory status.</DialogDescription>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Customer</Label>
              <Select onValueChange={(v) => setNewSale({...newSale, customerId: v})} value={newSale.customerId}>
                <SelectTrigger className="h-11 bg-background"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                  {(!customers || customers.length === 0) && <p className="p-2 text-xs text-muted-foreground">No customer profiles available.</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Sold</Label>
              <Select onValueChange={(v) => setNewSale({...newSale, productId: v})} value={newSale.productId}>
                <SelectTrigger className="h-11 bg-background"><SelectValue placeholder="Select Product" /></SelectTrigger>
                <SelectContent>
                  {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (SN: {p.serialNumber})</SelectItem>)}
                  {(!products || products.length === 0) && <p className="p-2 text-xs text-muted-foreground">No available inventory.</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount ($)</Label>
                <Input type="number" placeholder="0.00" value={newSale.amount} onChange={(e) => setNewSale({...newSale, amount: e.target.value})} className="h-11 bg-background" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Method</Label>
                <Select onValueChange={(v) => setNewSale({...newSale, paymentMethod: v})} value={newSale.paymentMethod}>
                  <SelectTrigger className="h-11 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Separator />
          <div className="p-6">
            <Button className="w-full font-bold h-12 text-base shadow-lg gap-2" onClick={handleRecordSale}>
              Record Transaction <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[95vw] rounded-2xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>This action is permanent and will remove the record from your database. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="w-[95vw] rounded-2xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Transactions?</AlertDialogTitle>
            <AlertDialogDescription>You are about to permanently remove these sales records. This cannot be reversed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">Delete All Selected</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
