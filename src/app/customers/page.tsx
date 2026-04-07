
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  ShoppingBag, 
  ChevronRight,
  Trash2,
  X,
  UserPlus,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, doc, query, where, limit } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function CustomersPage() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "businessUsers", user.uid)
  }, [db, user?.uid])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)
  
  const isSuperAdmin = user?.email === 'roshanismean@gmail.com'
  const isApproved = profile?.approved === true || isSuperAdmin
  const companyId = profile?.companyId || (isSuperAdmin ? "system" : user?.uid)

  const [searchQuery, setSearchQuery] = useState("")
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  })

  const customersQuery = useMemoFirebase(() => {
    if (!db || !user || !isApproved || !companyId) return null
    if (isSuperAdmin) return query(collection(db, "customers"), limit(1000))
    return query(
      collection(db, "customers"), 
      where("companyId", "==", companyId),
      limit(1000)
    )
  }, [db, user, companyId, isSuperAdmin, isApproved])

  const { data: customers, isLoading: customersLoading } = useCollection(customersQuery)

  const filteredCustomers = (customers || []).filter(customer => 
    `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = () => {
    if (!db) return
    selectedIds.forEach(id => {
      deleteDocumentNonBlocking(doc(db, "customers", id))
    })
    const count = selectedIds.size
    setSelectedIds(new Set())
    setIsSelectionMode(false)
    setIsBulkDeleteOpen(false)
    toast({
      title: "Profiles Removed",
      description: `${count} customer profiles have been deleted.`,
      variant: "destructive"
    })
  }

  const handleAddCustomer = () => {
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and email for the new profile.",
        variant: "destructive"
      })
      return
    }

    if (!db || !companyId) return

    const customerData = {
      firstName: newCustomer.firstName,
      lastName: newCustomer.lastName,
      email: newCustomer.email,
      phoneNumber: newCustomer.phoneNumber || "Not provided",
      companyId: companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalSpent: 0
    }

    addDocumentNonBlocking(collection(db, "customers"), customerData)
    setIsAddDialogOpen(false)
    setNewCustomer({ firstName: "", lastName: "", email: "", phoneNumber: "" })

    toast({
      title: "Profile Created",
      description: `${newCustomer.firstName} ${newCustomer.lastName} has been added to your customer records.`,
    })
  }

  const isLoading = isUserLoading || isProfileLoading || (isApproved && customersLoading)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !isApproved) return null

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Customer Relationships</h1>
          <p className="text-muted-foreground">Manage your customer base and view their transaction histories.</p>
        </div>
        <div className="flex items-center gap-3">
          {isSelectionMode ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedIds(new Set())
                }}
                className="flex gap-2"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button 
                variant="destructive" 
                disabled={selectedIds.size === 0}
                onClick={() => setIsBulkDeleteOpen(true)}
                className="flex gap-2 shadow-lg"
              >
                <Trash2 className="h-4 w-4" /> Delete Selected ({selectedIds.size})
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="border-destructive text-destructive hover:bg-destructive/10 flex gap-2 shadow-sm"
                onClick={() => setIsSelectionMode(true)}
              >
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex gap-2"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4" /> New Customer Profile
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search customers..." 
            className="pl-10 h-10 border-input bg-background/50 focus:bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {filteredCustomers.map((customer) => (
          <Card 
            key={customer.id} 
            className={cn(
              "border-none shadow-sm transition-all group overflow-hidden relative",
              selectedIds.has(customer.id) && "ring-2 ring-primary bg-primary/5"
            )}
          >
            {isSelectionMode && (
              <div className="absolute top-4 left-4 z-10">
                <Checkbox 
                  checked={selectedIds.has(customer.id)}
                  onCheckedChange={() => toggleSelection(customer.id)}
                />
              </div>
            )}
            <CardContent className="p-0">
              <div className={cn("flex flex-col sm:flex-row p-6 items-start gap-5", isSelectionMode && "pl-14")}>
                <Avatar className="h-16 w-16 border-2 border-secondary shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                    {customer.firstName[0]}{customer.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 w-full space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors text-foreground">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                        ID: {customer.id}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 w-fit shrink-0">
                      Active Account
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary/60 shrink-0" />
                      <span className="truncate max-w-[180px]">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary/60 shrink-0" />
                      <span>{customer.phoneNumber}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-secondary rounded-lg flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-primary/60" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Lifetime Revenue</span>
                        <span className="text-lg font-bold text-primary">${(customer.totalSpent || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    {!isSelectionMode && (
                      <Button variant="outline" size="sm" className="group/btn h-10 px-4 font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm" asChild>
                        <Link href={`/reminders?customerId=${customer.id}`}>
                          Create Reminder <ChevronRight className="ml-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full h-40 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border-2 border-dashed">
             <Users className="h-8 w-8 opacity-20 mb-2" />
             <p className="font-medium">No customers found matching your criteria.</p>
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              New Customer Profile
            </DialogTitle>
            <DialogDescription>
              Create a new entry in your CRM. You can later associate sales and reminders with this profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cust-fname">First Name</Label>
                <Input 
                  id="cust-fname" 
                  placeholder="e.g. John" 
                  value={newCustomer.firstName} 
                  onChange={(e) => setNewCustomer({...newCustomer, firstName: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cust-lname">Last Name</Label>
                <Input 
                  id="cust-lname" 
                  placeholder="e.g. Smith" 
                  value={newCustomer.lastName} 
                  onChange={(e) => setNewCustomer({...newCustomer, lastName: e.target.value})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-email">Email Address</Label>
              <Input 
                id="cust-email" 
                type="email"
                placeholder="john@example.com" 
                value={newCustomer.email} 
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-phone">Phone Number</Label>
              <Input 
                id="cust-phone" 
                placeholder="555-0000" 
                value={newCustomer.phoneNumber} 
                onChange={(e) => setNewCustomer({...newCustomer, phoneNumber: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCustomer} className="bg-primary hover:bg-primary/90">Create Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Customer Profiles?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove these customer records from your CRM. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Profiles
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
