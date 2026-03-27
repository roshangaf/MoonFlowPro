
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Warehouse,
  PlusCircle,
  Pencil,
  Loader2,
  Trash2,
  X,
  Check,
  ArrowLeftRight,
  Wrench,
  History,
  DollarSign,
  Package
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
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
import { collection, doc, query, where, orderBy } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

type ProductStatus = 'Received' | 'In Repair' | 'Tested' | 'Listed' | 'Sold';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Received': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800';
    case 'In Repair': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900';
    case 'Tested': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
    case 'Listed': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
    case 'Sold': return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground';
    default: return 'bg-gray-100 dark:bg-gray-800';
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

  const [currentInventory, setCurrentInventory] = useState("Main Warehouse")
  const [isSwitchDialogOpen, setIsSwitchDialogOpen] = useState(false)
  const [newInvName, setNewInvName] = useState("")
  const [invToEdit, setInvToEdit] = useState<string | null>(null)
  const [editingInvName, setEditingInvName] = useState("")
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

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/")
    }
  }, [user, isUserLoading, router])

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "businessUsers", user.uid)
  }, [db, user?.uid])

  const { data: profile } = useDoc(profileRef)
  const companyId = profile?.companyId
  const availableInventories = profile?.inventoryLocations || DEFAULT_LOCATIONS
  const isSuperAdmin = user?.email === 'roshanismean@gmail.com'

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    if (isSuperAdmin) return collection(db, "products");
    if (!companyId) return null;
    return query(collection(db, "products"), where("companyId", "==", companyId))
  }, [db, user, companyId, isSuperAdmin])

  const { data: products, isLoading: productsLoading } = useCollection(productsQuery)

  const repairLogsQuery = useMemoFirebase(() => {
    if (!db || !selectedProductForRepair?.id) return null
    return query(
      collection(db, "products", selectedProductForRepair.id, "repairLogs"),
      orderBy("date", "desc")
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

  const updateProfileLocations = (newLocations: string[]) => {
    if (!profileRef) return
    updateDocumentNonBlocking(profileRef, {
      inventoryLocations: newLocations,
      updatedAt: new Date().toISOString()
    })
  }

  const handleSwitchInventory = (target: string) => {
    setCurrentInventory(target)
    setIsSwitchDialogOpen(false)
    toast({ title: "Switched Inventory", description: `Now viewing items in: ${target}` })
  }

  const handleAddNewInventory = () => {
    if (!newInvName.trim()) return
    if (availableInventories.includes(newInvName)) {
      toast({ title: "Error", description: "Inventory name already exists.", variant: "destructive" })
      return
    }
    const updated = [...availableInventories, newInvName.trim()]
    updateProfileLocations(updated)
    setNewInvName("")
    toast({ title: "Location Added", description: `${newInvName} is now available.` })
  }

  const handleRenameInventory = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim()
    if (!trimmedNewName || oldName === trimmedNewName) {
      setInvToEdit(null)
      return
    }
    const updated = availableInventories.map((n: string) => n === oldName ? trimmedNewName : n)
    updateProfileLocations(updated)
    if (currentInventory === oldName) setCurrentInventory(trimmedNewName)
    setInvToEdit(null)
    toast({ title: "Location Renamed", description: `Changed ${oldName} to ${trimmedNewName}` })
  }

  const handleDeleteInventory = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    if (availableInventories.length <= 1) {
      toast({ title: "Cannot Delete", description: "You must have at least one inventory location.", variant: "destructive" })
      return
    }
    const updated = availableInventories.filter((n: string) => n !== name)
    updateProfileLocations(updated)
    if (currentInventory === name) setCurrentInventory(updated[0])
    toast({ title: "Location Removed", description: `${name} has been deleted.` })
  }

  const handleDelete = () => {
    if (deleteId && db) {
      deleteDocumentNonBlocking(doc(db, "products", deleteId))
      setDeleteId(null)
      toast({ title: "Item Deleted", variant: "destructive" })
    }
  }

  const handleBulkDelete = () => {
    if (!db) return
    selectedIds.forEach(id => {
      deleteDocumentNonBlocking(doc(db, "products", id))
    })
    setIsBulkDeleteOpen(false)
    setIsSelectionMode(false)
    setSelectedIds(new Set())
    toast({ title: "Items Removed", description: `${selectedIds.size} items deleted.` })
  }

  const handleAddProduct = () => {
    if (!newItem.name) {
      toast({ title: "Required Field", description: "Please enter a product name.", variant: "destructive" });
      return;
    }

    if (!db) return;

    const finalCompanyId = companyId || (isSuperAdmin ? 'system' : user?.uid);

    if (!finalCompanyId) {
      toast({ title: "Error", description: "Company profile not found. Please refresh.", variant: "destructive" });
      return;
    }

    const productData = {
      name: newItem.name,
      lifecycleStatus: newItem.status,
      currentCondition: newItem.currentCondition,
      purchaseCost: newItem.purchaseCost === "" ? 0 : Number(newItem.purchaseCost),
      totalRepairCost: 0,
      serialNumber: newItem.serialNumber || `SN-${Math.floor(Math.random() * 100000)}`,
      location: currentInventory,
      companyId: finalCompanyId,
      purchaseDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addDocumentNonBlocking(collection(db, "products"), productData);
    setIsAddDialogOpen(false);
    setNewItem({ name: "", status: "Received", currentCondition: "Excellent", purchaseCost: "", serialNumber: "" });
    toast({ title: "Item Added", description: `${newItem.name} added to stock.` });
  }

  const handleStatusChange = (productId: string, newStatus: ProductStatus) => {
    if (!db) return
    updateDocumentNonBlocking(doc(db, "products", productId), { 
      lifecycleStatus: newStatus,
      updatedAt: new Date().toISOString()
    })
    toast({ title: "Status Updated", description: `Item is now ${newStatus}.` })
  }

  const handleAddRepair = async () => {
    if (!selectedProductForRepair || !repairDescription || !db) {
      toast({ title: "Missing Info", description: "Enter repair details.", variant: "destructive" });
      return;
    }

    const costNum = repairCost === "" ? 0 : Number(repairCost);

    const logData = {
      description: repairDescription,
      cost: costNum,
      date: new Date().toISOString(),
      performedBy: user?.email || "Unknown"
    }

    const colRef = collection(db, "products", selectedProductForRepair.id, "repairLogs")
    await addDocumentNonBlocking(colRef, logData)

    const newTotalRepairCost = (selectedProductForRepair.totalRepairCost || 0) + costNum
    updateDocumentNonBlocking(doc(db, "products", selectedProductForRepair.id), {
      totalRepairCost: newTotalRepairCost,
      updatedAt: new Date().toISOString()
    })

    setRepairDescription("")
    setRepairCost("")
    toast({ title: "Repair Added", description: `Recorded $${costNum} for ${selectedProductForRepair.name}.` })
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const isLoading = isUserLoading || productsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-primary text-primary bg-primary/5 px-2 py-0.5 flex gap-1.5 items-center">
              <Warehouse className="h-3 w-3" />
              {currentInventory}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-headline">Inventory Management</h1>
          <p className="text-muted-foreground text-sm font-body">Manage your reconditioned stock and repair logs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSelectionMode ? (
            <>
              <Button variant="ghost" onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()) }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button variant="destructive" disabled={selectedIds.size === 0} onClick={() => setIsBulkDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete ({selectedIds.size})
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="border-destructive text-destructive" onClick={() => setIsSelectionMode(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
              <Button variant="outline" onClick={() => setIsSwitchDialogOpen(true)}>
                <ArrowLeftRight className="h-4 w-4 mr-1" /> Switch
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
            className="pl-9 h-10" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table View */}
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
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No items found.</TableCell>
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
                          <Badge variant="outline" className={cn("cursor-pointer", getStatusColor(product.lifecycleStatus))}>
                            {product.lifecycleStatus}
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map((product) => {
          const totalInvest = (product.purchaseCost || 0) + (product.totalRepairCost || 0);
          return (
            <Card key={product.id} className={cn("overflow-hidden border-none shadow-sm relative", selectedIds.has(product.id) && "ring-2 ring-primary")}>
              {isSelectionMode && (
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelection(product.id)} />
                </div>
              )}
              <CardContent className={cn("p-4 flex flex-col gap-4", isSelectionMode && "pl-12")}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground leading-tight">{product.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">SN: {product.serialNumber}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0", getStatusColor(product.lifecycleStatus))}>
                        {product.lifecycleStatus}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {ALL_STATUSES.map(s => <DropdownMenuItem key={s} onClick={() => handleStatusChange(product.id, s)}>{s}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Investment</span>
                    <span className="text-lg font-bold text-primary">${totalInvest.toLocaleString()}</span>
                    {product.totalRepairCost > 0 && <span className="text-[9px] text-muted-foreground font-medium">Incl. ${product.totalRepairCost} Repairs</span>}
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Condition</span>
                    <span className="text-sm font-semibold">{product.currentCondition}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={() => setSelectedProductForRepair(product)}>
                    <Wrench className="h-3 w-3" /> Repair Logs
                  </Button>
                  <Button variant="ghost" size="sm" className="w-10 text-destructive" onClick={() => setDeleteId(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filteredProducts.length === 0 && (
          <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">No items matching filters.</div>
        )}
      </div>

      {/* Dialogs remain similar but ensure proper responsiveness */}
      <Dialog open={!!selectedProductForRepair} onOpenChange={(open) => !open && setSelectedProductForRepair(null)}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Repair Management
            </DialogTitle>
            <DialogDescription className="mt-1">
              Tracking maintenance for <strong>{selectedProductForRepair?.name}</strong>.
            </DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
              <Label className="text-[10px] font-bold uppercase text-primary">Add New Log</Label>
              <div className="space-y-3">
                <Input placeholder="Description of work..." value={repairDescription} onChange={(e) => setRepairDescription(e.target.value)} />
                <div className="flex gap-2">
                  <Input type="number" placeholder="Cost ($)" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} />
                  <Button onClick={handleAddRepair} className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                <span>History</span>
                <span className="text-primary">${selectedProductForRepair?.totalRepairCost || 0} Total</span>
              </Label>
              <div className="space-y-2">
                {repairsLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /> : repairLogs?.map(log => (
                  <div key={log.id} className="flex justify-between p-3 rounded-lg border bg-card text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold">{log.description}</p>
                      <p className="text-muted-foreground opacity-70">{new Date(log.date).toLocaleDateString()} • {log.performedBy}</p>
                    </div>
                    <span className="font-bold text-primary">+${log.cost}</span>
                  </div>
                ))}
                {!repairsLoading && (!repairLogs || repairLogs.length === 0) && <p className="text-center py-4 text-xs text-muted-foreground italic">No repairs recorded yet.</p>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New Bike to Stock</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input placeholder="e.g. Yamaha R15 V3" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Cost ($)</Label>
                <Input type="number" value={newItem.purchaseCost} onChange={(e) => setNewItem({...newItem, purchaseCost: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={newItem.currentCondition} onValueChange={(v) => setNewItem({...newItem, currentCondition: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Serial / Chassis No.</Label>
              <Input placeholder="Optional" value={newItem.serialNumber} onChange={(e) => setNewItem({...newItem, serialNumber: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-bold h-12" onClick={handleAddProduct}>Add to Inventory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSwitchDialogOpen} onOpenChange={setIsSwitchDialogOpen}>
        <DialogContent className="sm:max-w-[450px] w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Switch Warehouse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              {availableInventories.map(name => (
                <div key={name} className={cn("p-3 rounded-lg border flex justify-between items-center cursor-pointer", currentInventory === name ? "bg-primary/10 border-primary" : "bg-card")} onClick={() => handleSwitchInventory(name)}>
                  <span className="font-bold flex items-center gap-2"><Warehouse className="h-4 w-4" /> {name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDeleteInventory(e, name)} disabled={availableInventories.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Input placeholder="New Location..." value={newInvName} onChange={(e) => setNewInvName(e.target.value)} />
              <Button variant="secondary" onClick={handleAddNewInventory}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[95vw] rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Confirm Removal</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
