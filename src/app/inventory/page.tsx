
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  Filter, 
  Warehouse,
  Loader2, 
  Trash2, 
  X, 
  ArrowLeftRight, 
  Wrench,
  Package,
  ChevronDown,
  BadgeDollarSign,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, doc, query, where, orderBy, limit } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

type ProductStatus = 'Received' | 'In Repair' | 'Tested' | 'Listed' | 'Sold';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Received': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'In Repair': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Tested': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Listed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Sold': return 'bg-primary/10 text-primary border-primary/20';
    default: return 'bg-gray-100';
  }
}

const ALL_STATUSES: ProductStatus[] = ['Received', 'In Repair', 'Tested', 'Listed', 'Sold']
const FILTER_STATUSES = ['All', ...ALL_STATUSES]
const DEFAULT_LOCATIONS = ["Main Warehouse"]

export default function InventoryPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "businessUsers", user.uid)
  }, [db, user?.uid])

  const { data: profile, isLoading: profileLoading } = useDoc(profileRef)
  
  const isSuperAdmin = user?.email === 'roshanismean@gmail.com'
  const isApproved = profile?.approved === true || isSuperAdmin
  const companyId = profile?.companyId || (isSuperAdmin ? "system" : user?.uid)

  const [currentInventory, setCurrentInventory] = useState("Main Warehouse")
  const [isSwitchDialogOpen, setIsSwitchDialogOpen] = useState(false)
  const [newInvName, setNewInvName] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  
  const [newItem, setNewItem] = useState({
    name: "",
    status: "Received" as ProductStatus,
    currentCondition: "Excellent",
    purchaseCost: "",
    serialNumber: "",
  })

  const [selectedProductForRepair, setSelectedProductForRepair] = useState<any | null>(null)
  const [repairDescription, setRepairDescription] = useState("")
  const [repairCost, setRepairCost] = useState("")

  // Sale Recording State
  const [isRecordSaleDialogOpen, setIsRecordSaleDialogOpen] = useState(false)
  const [selectedProductForSale, setSelectedProductForSale] = useState<any | null>(null)
  const [saleAmount, setSaleAmount] = useState("")
  const [saleCustomerId, setSaleCustomerId] = useState("")
  const [salePaymentMethod, setSalePaymentMethod] = useState("Credit Card")

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user || !isApproved || !companyId) return null
    return query(
      collection(db, "products"), 
      where("companyId", "==", companyId),
      limit(100)
    )
  }, [db, user, companyId, isApproved])

  const { data: products, isLoading: productsLoading } = useCollection(productsQuery)

  const customersQuery = useMemoFirebase(() => {
    if (!db || !companyId || !isApproved) return null
    return query(
      collection(db, "customers"), 
      where("companyId", "==", companyId),
      limit(100)
    )
  }, [db, companyId, isApproved])

  const { data: customers } = useCollection(customersQuery)

  const repairLogsQuery = useMemoFirebase(() => {
    if (!db || !selectedProductForRepair?.id) return null
    return query(
      collection(db, "products", selectedProductForRepair.id, "repairLogs"),
      orderBy("date", "desc"),
      limit(50)
    )
  }, [db, selectedProductForRepair?.id])

  const { data: repairLogs, isLoading: repairsLoading } = useCollection(repairLogsQuery)

  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch = (product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.id.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "All" || product.lifecycleStatus === statusFilter
    const matchesInventory = product.location === currentInventory || (!product.location && currentInventory === "Main Warehouse")
    return matchesSearch && matchesStatus && matchesInventory
  })

  const handleAddProduct = () => {
    if (!newItem.name) {
      toast({ title: "Required Field", description: "Please enter a product name.", variant: "destructive" });
      return;
    }

    if (!db || !companyId) return;

    const productData = {
      name: newItem.name,
      lifecycleStatus: newItem.status,
      currentCondition: newItem.currentCondition,
      purchaseCost: newItem.purchaseCost === "" ? 0 : Number(newItem.purchaseCost),
      totalRepairCost: 0,
      serialNumber: newItem.serialNumber || `SN-${Math.floor(Math.random() * 100000)}`,
      location: currentInventory,
      companyId: companyId,
      purchaseDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addDocumentNonBlocking(collection(db, "products"), productData);
    setIsAddDialogOpen(false);
    setNewItem({ name: "", status: "Received", currentCondition: "Excellent", purchaseCost: "", serialNumber: "" });
    toast({ title: "Item Added", description: `${newItem.name} added to inventory.` });
  }

  const handleStatusChange = (productId: string, newStatus: ProductStatus) => {
    if (!db) return
    
    // Trigger Sale Flow if status is 'Sold'
    if (newStatus === 'Sold') {
      const product = (products || []).find(p => p.id === productId)
      if (product) {
        setSelectedProductForSale(product)
        setSaleAmount(String((product.purchaseCost || 0) + (product.totalRepairCost || 0) + 500)) // Default suggestion
        setIsRecordSaleDialogOpen(true)
      }
      return
    }

    updateDocumentNonBlocking(doc(db, "products", productId), { 
      lifecycleStatus: newStatus,
      updatedAt: new Date().toISOString()
    })
    toast({ title: "Status Updated", description: `Item status changed to ${newStatus}.` })
  }

  const handleConfirmSale = () => {
    if (!db || !selectedProductForSale || !saleCustomerId || !saleAmount || !companyId) {
      toast({ title: "Missing Information", description: "Please select a customer and enter a sale amount.", variant: "destructive" })
      return
    }

    const amount = Number(saleAmount)
    const saleData = {
      customerId: saleCustomerId,
      productId: selectedProductForSale.id,
      totalAmount: amount,
      paymentMethod: salePaymentMethod,
      paymentStatus: "Completed",
      companyId: companyId,
      createdAt: new Date().toISOString(),
      saleDate: new Date().toISOString(),
    }

    // Add Sale Record
    addDocumentNonBlocking(collection(db, "sales"), saleData)

    // Mark Product as Sold
    updateDocumentNonBlocking(doc(db, "products", selectedProductForSale.id), {
      lifecycleStatus: "Sold",
      updatedAt: new Date().toISOString()
    })

    // Update Customer Lifetime Value
    const customer = (customers || []).find(c => c.id === saleCustomerId)
    if (customer) {
      updateDocumentNonBlocking(doc(db, "customers", customer.id), {
        totalSpent: (customer.totalSpent || 0) + amount,
        updatedAt: new Date().toISOString()
      })
    }

    setIsRecordSaleDialogOpen(false)
    setSelectedProductForSale(null)
    setSaleAmount("")
    setSaleCustomerId("")
    toast({ title: "Sale Recorded", description: "Transaction finalized and inventory updated." })
  }

  const handleAddRepair = async () => {
    if (!selectedProductForRepair || !repairDescription || !db) return
    const costNum = repairCost === "" ? 0 : Number(repairCost);

    const logData = {
      description: repairDescription,
      cost: costNum,
      date: new Date().toISOString(),
      performedBy: user?.email || "Staff"
    }

    const colRef = collection(db, "products", selectedProductForRepair.id, "repairLogs")
    addDocumentNonBlocking(colRef, logData)

    const newTotalRepairCost = (selectedProductForRepair.totalRepairCost || 0) + costNum
    updateDocumentNonBlocking(doc(db, "products", selectedProductForRepair.id), {
      totalRepairCost: newTotalRepairCost,
      updatedAt: new Date().toISOString()
    })

    setRepairDescription("")
    setRepairCost("")
    toast({ title: "Repair Added", description: `Recorded $${costNum} investment.` })
  }

  const handleDelete = () => {
    if (!deleteId || !db) return
    deleteDocumentNonBlocking(doc(db, "products", deleteId))
    setDeleteId(null)
    toast({ title: "Item Deleted", variant: "destructive" })
  }

  const handleBulkDelete = () => {
    if (!db) return
    selectedIds.forEach(id => {
      deleteDocumentNonBlocking(doc(db, "products", id))
    })
    const count = selectedIds.size
    setSelectedIds(new Set())
    setIsSelectionMode(false)
    setIsBulkDeleteOpen(false)
    toast({ title: "Items Deleted", description: `${count} items removed.`, variant: "destructive" })
  }

  const handleSwitchInventory = (name: string) => {
    setCurrentInventory(name)
    setIsSwitchDialogOpen(false)
  }

  const handleAddNewInventory = () => {
    if (!newInvName.trim() || !profileRef) return
    const currentLocations = profile?.inventoryLocations || DEFAULT_LOCATIONS
    const updatedLocations = [...currentLocations, newInvName.trim()]
    updateDocumentNonBlocking(profileRef, { inventoryLocations: updatedLocations })
    setNewInvName("")
    toast({ title: "Location Added", description: `${newInvName} is now available.` })
  }

  const handleDeleteInventory = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    const currentLocations = profile?.inventoryLocations || DEFAULT_LOCATIONS
    if (!profileRef || currentLocations.length <= 1) return
    const updatedLocations = currentLocations.filter((l: string) => l !== name)
    updateDocumentNonBlocking(profileRef, { inventoryLocations: updatedLocations })
    if (currentInventory === name) setCurrentInventory(updatedLocations[0])
    toast({ title: "Location Removed", variant: "destructive" })
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const isLoading = isUserLoading || profileLoading || (isApproved && productsLoading)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Inventory...</p>
        </div>
      </div>
    )
  }

  if (!user || !isApproved) return null

  const availableInventories = profile?.inventoryLocations || DEFAULT_LOCATIONS

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-primary text-primary bg-primary/5 px-2 py-0.5 flex gap-1.5 items-center">
              <Warehouse className="h-3 w-3" />
              {currentInventory}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">Inventory Management</h1>
          <p className="text-muted-foreground text-sm font-body">Manage stock for {profile?.companyName || "your account"}.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {isSelectionMode ? (
            <>
              <Button variant="ghost" className="h-11" onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()) }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button variant="destructive" className="h-11 shadow-lg" disabled={selectedIds.size === 0} onClick={() => setIsBulkDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="h-11 border-destructive text-destructive" onClick={() => setIsSelectionMode(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
              <Button className="h-11 shadow-lg bg-primary hover:bg-primary/90" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add to Stock
              </Button>
              <Button variant="outline" className="h-11 col-span-2 sm:col-auto" onClick={() => setIsSwitchDialogOpen(true)}>
                <ArrowLeftRight className="h-4 w-4 mr-1" /> Switch Warehouse
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or serial..." 
            className="pl-9 h-10 border-none bg-background/50 focus:bg-background" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/50 h-10">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden md:block bg-card rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {isSelectionMode && <TableHead className="w-[50px]"></TableHead>}
              <TableHead className="font-semibold text-foreground">Product Details</TableHead>
              <TableHead className="text-center font-semibold text-foreground">Status</TableHead>
              <TableHead className="font-semibold text-foreground">Condition</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Total Investment</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">No inventory records found.</TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const totalInvest = (product.purchaseCost || 0) + (product.totalRepairCost || 0);
                return (
                  <TableRow key={product.id} className={cn(selectedIds.has(product.id) && "bg-primary/5")}>
                    {isSelectionMode && (
                      <TableCell>
                        <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelection(product.id)} />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{product.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">SN: {product.serialNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge variant="outline" className={cn("cursor-pointer flex gap-1 items-center justify-center", getStatusColor(product.lifecycleStatus))}>
                            {product.lifecycleStatus} <ChevronDown className="h-3 w-3 opacity-50" />
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {ALL_STATUSES.map(s => <DropdownMenuItem key={s} onClick={() => handleStatusChange(product.id, s)}>{s}</DropdownMenuItem>)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{product.currentCondition}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">${totalInvest.toLocaleString()}</span>
                        {product.totalRepairCost > 0 && <span className="text-[9px] text-muted-foreground">Repairs: ${product.totalRepairCost}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedProductForRepair(product)}><Wrench className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(product.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {filteredProducts.map((product) => {
          const totalInvest = (product.purchaseCost || 0) + (product.totalRepairCost || 0);
          return (
            <Card key={product.id} className={cn("overflow-hidden border-none shadow-sm relative bg-card", selectedIds.has(product.id) && "ring-2 ring-primary")}>
              {isSelectionMode && (
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelection(product.id)} />
                </div>
              )}
              <CardContent className={cn("p-4 flex flex-col gap-4", isSelectionMode && "pl-12")}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground leading-tight text-base">{product.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">SN: {product.serialNumber}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 gap-1", getStatusColor(product.lifecycleStatus))}>
                        {product.lifecycleStatus} <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {ALL_STATUSES.map(s => <DropdownMenuItem key={s} onClick={() => handleStatusChange(product.id, s)}>{s}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-muted/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Investment</span>
                    <span className="text-lg font-bold text-primary">${totalInvest.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Condition</span>
                    <span className="text-sm font-semibold">{product.currentCondition}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="secondary" size="sm" className="flex-1 gap-1.5 h-10 font-bold" onClick={() => setSelectedProductForRepair(product)}>
                    <Wrench className="h-4 w-4" /> Add Repair
                  </Button>
                  <Button variant="ghost" size="icon" className="w-10 h-10 text-destructive" onClick={() => setDeleteId(product.id)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedProductForRepair} onOpenChange={(open) => !open && setSelectedProductForRepair(null)}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-card">
          <div className="p-6 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Repair Management
            </DialogTitle>
            <DialogDescription className="mt-1">
              Tracking reconditioning for <strong>{selectedProductForRepair?.name}</strong>.
            </DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
              <Label className="text-[10px] font-bold uppercase text-primary">Log New Repair Task</Label>
              <div className="space-y-3">
                <Input placeholder="Description (e.g., Brake Pad Replacement)" value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)} className="bg-background" />
                <div className="flex gap-2">
                  <Input type="number" placeholder="Cost ($)" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} className="bg-background" />
                  <Button onClick={handleAddRepair} className="shrink-0 h-10 bg-primary hover:bg-primary/90"><Plus className="h-5 w-5" /></Button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                <span>Investment History</span>
                <span className="text-primary">${selectedProductForRepair?.totalRepairCost || 0} Total Repairs</span>
              </Label>
              <div className="space-y-2">
                {repairsLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /> : repairLogs?.map(log => (
                  <div key={log.id} className="flex justify-between p-3 rounded-lg border bg-background text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground">{log.description}</p>
                      <p className="text-muted-foreground opacity-70">{new Date(log.date).toLocaleDateString()} • {log.performedBy}</p>
                    </div>
                    <span className="font-bold text-primary">+${log.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecordSaleDialogOpen} onOpenChange={setIsRecordSaleDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-2xl bg-card p-0 overflow-hidden">
          <div className="p-6 bg-muted/30 border-b">
            <DialogTitle className="flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
              Record Transaction
            </DialogTitle>
            <DialogDescription>Item: <strong>{selectedProductForSale?.name}</strong>. Update sale details.</DialogDescription>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Customer</Label>
              <Select onValueChange={setSaleCustomerId} value={saleCustomerId}>
                <SelectTrigger className="h-11 bg-background"><SelectValue placeholder="Choose profile..." /></SelectTrigger>
                <SelectContent>
                  {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sale Amount ($)</Label>
                <Input type="number" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} className="h-11 bg-background" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Method</Label>
                <Select onValueChange={setSalePaymentMethod} value={salePaymentMethod}>
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
            <Button className="w-full font-bold h-12 text-base shadow-lg gap-2" onClick={handleConfirmSale}>
              Confirm Sale <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-2xl bg-card p-0 overflow-hidden">
          <div className="p-6 bg-muted/30 border-b">
            <DialogTitle>Add New to Stock</DialogTitle>
            <DialogDescription>Enter initial details for your new inventory item.</DialogDescription>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Name</Label>
              <Input placeholder="e.g. Yamaha R15 V3" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="h-11 bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purchase Cost ($)</Label>
                <Input type="number" placeholder="0" value={newItem.purchaseCost} onChange={(e) => setNewItem({...newItem, purchaseCost: e.target.value})} className="h-11 bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condition</Label>
                <Select value={newItem.currentCondition} onValueChange={(v) => setNewItem({...newItem, currentCondition: v})}>
                  <SelectTrigger className="h-11 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Serial / Chassis No.</Label>
              <Input placeholder="Optional" value={newItem.serialNumber} onChange={(e) => setNewItem({...newItem, serialNumber: e.target.value})} className="h-11 bg-background" />
            </div>
          </div>
          <Separator />
          <div className="p-6">
            <Button className="w-full font-bold h-12 text-base shadow-lg bg-primary hover:bg-primary/90" onClick={handleAddProduct}>Add to Account Inventory</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSwitchDialogOpen} onOpenChange={setIsSwitchDialogOpen}>
        <DialogContent className="sm:max-w-[450px] w-[95vw] rounded-2xl bg-card p-0 overflow-hidden">
          <div className="p-6 bg-muted/30 border-b">
            <DialogTitle>Inventory Warehouses</DialogTitle>
            <DialogDescription>Manage and switch between your account locations.</DialogDescription>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
              {availableInventories.map(name => (
                <div key={name} className={cn("p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-all", currentInventory === name ? "bg-primary/10 border-primary ring-1 ring-primary" : "bg-background hover:border-primary/50")} onClick={() => handleSwitchInventory(name)}>
                  <span className="font-bold flex items-center gap-2 text-foreground"><Warehouse className="h-4 w-4 text-primary" /> {name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { handleDeleteInventory(e, name); }} disabled={availableInventories.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Input placeholder="New Location..." value={newInvName} onChange={(e) => setNewInvName(e.target.value)} className="h-11 bg-background" />
              <Button variant="secondary" onClick={handleAddNewInventory} className="h-11 px-4"><Plus className="h-5 w-5" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="w-[95vw] rounded-2xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Items?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove these records from your account. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[95vw] rounded-2xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this item from your stock record?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">Delete Item</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
