
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  PackageCheck,
  Loader2,
  Plus,
  Search,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { collection, doc, query, where, addDoc } from "firebase/firestore"
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
    if (!db || !companyId || isSuperAdmin) return null
    return query(collection(db, "customers"), where("companyId", "==", companyId))
  }, [db, companyId, isSuperAdmin])
  
  const productsQuery = useMemoFirebase(() => {
    if (!db || !companyId || isSuperAdmin) return null
    return query(collection(db, "products"), where("companyId", "==", companyId), where("lifecycleStatus", "!=", "Sold"))
  }, [db, companyId, isSuperAdmin])

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

    // Update Customer Lifetime Value (Simplified logic for demo)
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

  const toggleAll = () => {
    if (selectedIds.size === (sales || []).length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set((sales || []).map(s => s.id)))
    }
  }

  const handleBulkDelete = () => {
    if (!db) return
    selectedIds.forEach(id => {
      deleteDocumentNonBlocking(doc(db, "sales", id))
    })
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
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex-1 md:flex-none gap-2" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Record New Sale
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

        <div className="bg-card p-6 rounded-2xl border shadow-sm">
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

        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Items Sold</p>
              <h2 className="text-2xl md:text-3xl font-bold mt-1 text-primary">{(sales || []).length}</h2>
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

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {isSelectionMode && (
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedIds.size > 0 && selectedIds.size === (sales || []).length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold min-w-[140px] text-foreground">Transaction ID</TableHead>
                <TableHead className="font-semibold min-w-[200px] text-foreground">Details</TableHead>
                <TableHead className="font-semibold text-center min-w-[120px] text-foreground">Date</TableHead>
                <TableHead className="font-semibold min-w-[140px] text-foreground">Method</TableHead>
                <TableHead className="font-semibold text-right min-w-[120px] text-foreground">Amount</TableHead>
                {!isSelectionMode && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sales || []).map((sale) => (
                <TableRow 
                  key={sale.id} 
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
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
                    #{sale.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm line-clamp-1 text-foreground">Sale Record</span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
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
                  <TableCell colSpan={isSelectionMode ? 7 : 6} className="h-32 text-center text-muted-foreground">
                    No sales transactions recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Record New Sale Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record New Sale</DialogTitle>
            <DialogDescription>
              Log a transaction and update your inventory status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Target Customer</Label>
              <Select onValueChange={(v) => setNewSale({...newSale, customerId: v})} value={newSale.customerId}>
                <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                  {customers?.length === 0 && <p className="p-2 text-xs text-muted-foreground">No customers found.</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Product Sold</Label>
              <Select onValueChange={(v) => setNewSale({...newSale, productId: v})} value={newSale.productId}>
                <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                <SelectContent>
                  {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (SN: {p.serialNumber})</SelectItem>)}
                  {products?.length === 0 && <p className="p-2 text-xs text-muted-foreground">No available inventory.</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Amount ($)</Label>
                <Input type="number" placeholder="0.00" value={newSale.amount} onChange={(e) => setNewSale({...newSale, amount: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>Method</Label>
                <Select onValueChange={(v) => setNewSale({...newSale, paymentMethod: v})} value={newSale.paymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleRecordSale}>Finalize Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[95vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>This action is permanent and will remove the record from your database "for real".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete FR</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="w-[95vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently remove these sales records from Firestore. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
              Delete All FR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
