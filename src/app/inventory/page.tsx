
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
  ArrowLeftRight
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
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, doc, query, where } from "firebase/firestore"
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

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/")
    }
  }, [user, isUserLoading, router])

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
    purchaseCost: 0,
    serialNumber: "",
  })

  // Fetch Profile for Company Info
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "businessUsers", user.uid)
  }, [db, user?.uid])

  const { data: profile } = useDoc(profileRef)
  const availableInventories = profile?.inventoryLocations || DEFAULT_LOCATIONS
  const companyId = profile?.companyId

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user || !companyId) return null
    const colRef = collection(db, "products");
    // Super admins can see all, but filtered by current context usually
    if (user.email === 'roshanismean@gmail.com') return query(colRef);
    return query(colRef, where("companyId", "==", companyId))
  }, [db, user, companyId])

  const { data: products, isLoading: productsLoading } = useCollection(productsQuery)

  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch = (product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
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
    toast({
      title: "Switched Inventory",
      description: `Now viewing items in: ${target}`,
    })
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
    toast({ title: "Location Removed", description: `${name} has been deleted from your records.` })
  }

  const handleDelete = () => {
    if (deleteId && db) {
      deleteDocumentNonBlocking(doc(db, "products", deleteId))
      setDeleteId(null)
      toast({
        title: "Item Deleted",
        variant: "destructive"
      })
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
    toast({ title: "Items Removed", description: `${selectedIds.size} items have been deleted.` })
  }

  const handleAddProduct = () => {
    if (!newItem.name || !newItem.purchaseCost || !db || !companyId) return

    const productData = {
      name: newItem.name,
      lifecycleStatus: newItem.status,
      currentCondition: newItem.currentCondition,
      purchaseCost: Number(newItem.purchaseCost),
      serialNumber: newItem.serialNumber || `SN-${Math.floor(Math.random() * 100000)}`,
      location: currentInventory,
      companyId: companyId,
      purchaseDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addDocumentNonBlocking(collection(db, "products"), productData)
    setIsAddDialogOpen(false)
    setNewItem({ name: "", status: "Received", currentCondition: "Excellent", purchaseCost: 0, serialNumber: "" })
    toast({ title: "Item Added", description: `${newItem.name} has been added to ${currentInventory}.` })
  }

  const handleStatusChange = (productId: string, newStatus: ProductStatus) => {
    if (!db) return
    updateDocumentNonBlocking(doc(db, "products", productId), { 
      lifecycleStatus: newStatus,
      updatedAt: new Date().toISOString()
    })
    toast({ title: "Status Updated", description: `Item status changed to ${newStatus}.` })
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
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-2 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <Badge variant="outline" className="border-primary text-primary bg-primary/5 px-2 py-0.5 flex gap-1.5 items-center">
              <Warehouse className="h-3 w-3" />
              {currentInventory}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-headline">Inventory Management</h1>
          <p className="text-muted-foreground font-body text-sm md:text-base">Track your reconditioned items through their entire lifecycle.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isSelectionMode ? (
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
              <Button variant="ghost" onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()) }} className="gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button variant="destructive" disabled={selectedIds.size === 0} onClick={() => setIsBulkDeleteOpen(true)} className="gap-2 shadow-lg">
                <Trash2 className="h-4 w-4" /> Delete ({selectedIds.size})
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full md:w-auto">
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-2 shadow-sm" onClick={() => setIsSelectionMode(true)}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg gap-2" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4" /> New Item
              </Button>
              <Button variant="outline" className="col-span-2 sm:w-auto flex gap-2 shadow-sm border-primary text-primary hover:bg-primary/5" onClick={() => setIsSwitchDialogOpen(true)}>
                <ArrowLeftRight className="h-4 w-4" /> Switch Location
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={`Search in ${currentInventory}...`} 
            className="pl-10 h-10 border-input bg-background/50 focus:bg-background w-full" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={cn("flex gap-2 w-full sm:w-auto", statusFilter !== 'All' && "border-primary text-primary")}>
              <Filter className="h-4 w-4" /> 
              {statusFilter === 'All' ? 'Filters' : `Status: ${statusFilter}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {FILTER_STATUSES.map((status) => (
              <DropdownMenuCheckboxItem 
                key={status} 
                checked={statusFilter === status} 
                onCheckedChange={() => setStatusFilter(status)}
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {isSelectionMode && <TableHead className="w-[50px]"></TableHead>}
                <TableHead className="min-w-[220px] font-semibold text-foreground">Product Details</TableHead>
                <TableHead className="font-semibold text-center min-w-[150px] text-foreground">Lifecycle Status</TableHead>
                <TableHead className="font-semibold min-w-[130px] text-foreground">Condition</TableHead>
                <TableHead className="font-semibold text-right min-w-[150px] text-foreground">Acquisition Cost</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className={cn("group transition-colors", selectedIds.has(product.id) ? "bg-primary/5" : "hover:bg-muted/50")}>
                    {isSelectionMode && (
                      <TableCell>
                        <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelection(product.id)} />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground line-clamp-1">{product.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono mt-1 opacity-70">ID: {product.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="outline-none">
                            <Badge variant="outline" className={`${getStatusColor(product.lifecycleStatus)} px-3 py-1 font-medium border cursor-pointer`}>
                              {product.lifecycleStatus}
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-40">
                          <DropdownMenuLabel className="text-xs">Update Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {ALL_STATUSES.map((status) => (
                            <DropdownMenuItem key={status} onClick={() => handleStatusChange(product.id, status)}>
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-medium">{product.currentCondition}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      ${product.purchaseCost.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setDeleteId(product.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Switch Inventory Dialog */}
      <Dialog open={isSwitchDialogOpen} onOpenChange={setIsSwitchDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Inventory Locations
            </DialogTitle>
            <DialogDescription>
              Switch between different warehouses or showrooms.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6 overflow-y-auto px-1 flex-1">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Available Locations</Label>
              <div className="grid gap-2">
                {availableInventories.map((name: string) => (
                  <div 
                    key={name}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group",
                      currentInventory === name 
                        ? "bg-primary/5 border-primary ring-1 ring-primary/20" 
                        : "bg-card hover:bg-muted/50"
                    )}
                    onClick={() => handleSwitchInventory(name)}
                  >
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                      <Warehouse className={cn("h-4 w-4 shrink-0", currentInventory === name ? "text-primary" : "text-muted-foreground")} />
                      {invToEdit === name ? (
                        <Input 
                          autoFocus
                          className="h-8 py-0 w-full" 
                          value={editingInvName}
                          onChange={(e) => setEditingInvName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameInventory(name, editingInvName)
                            if (e.key === 'Escape') setInvToEdit(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className={cn("font-bold truncate text-foreground", currentInventory === name && "text-primary")}>{name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {invToEdit === name ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-emerald-600"
                          onClick={(e) => { e.stopPropagation(); handleRenameInventory(name, editingInvName) }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setInvToEdit(name); 
                            setEditingInvName(name); 
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        disabled={availableInventories.length <= 1}
                        onClick={(e) => handleDeleteInventory(e, name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Create New Location</Label>
              <div className="flex flex-col gap-2">
                <Input 
                  placeholder="e.g. Dallas Showroom" 
                  value={newInvName}
                  onChange={(e) => setNewInvName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewInventory()}
                  className="flex-1"
                />
                <Button variant="secondary" onClick={handleAddNewInventory} className="flex gap-2 w-full font-bold">
                  <PlusCircle className="h-4 w-4" /> Add location
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[450px] w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>
              Record a new acquisition for {currentInventory}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Name / Model</Label>
              <Input id="name" placeholder="e.g. iPhone 14 Pro" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Initial Status</Label>
                <Select value={newItem.status} onValueChange={(v: ProductStatus) => setNewItem({...newItem, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cost" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purchase Cost ($)</Label>
                <Input id="cost" type="number" value={newItem.purchaseCost} onChange={(e) => setNewItem({...newItem, purchaseCost: Number(e.target.value)})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="condition" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condition</Label>
              <Select value={newItem.currentCondition} onValueChange={(v: string) => setNewItem({...newItem, currentCondition: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90 w-full sm:w-auto font-bold shadow-lg">Add to Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="w-[95vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove these items from your records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
              Delete Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[95vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this product from your inventory records?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
