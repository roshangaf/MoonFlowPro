
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  UserPlus, 
  MoreVertical, 
  Loader2, 
  Trash2,
  AlertCircle,
  Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, doc, query, where } from "firebase/firestore"
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function CompanyManagementPage() {
  const router = useRouter()
  const { user: currentUser, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const [isInviteOpen, setIsInviteOpen] = useState(false)

  useEffect(() => {
    if (!isUserLoading && !currentUser) {
      router.push("/")
    }
  }, [currentUser, isUserLoading, router])

  const currentUserProfileRef = useMemoFirebase(() => {
    if (!db || !currentUser?.uid) return null
    return doc(db, "businessUsers", currentUser.uid)
  }, [db, currentUser?.uid])

  const { data: profile } = useDoc(currentUserProfileRef)
  
  const isSuperAdmin = currentUser?.email === 'roshanismean@gmail.com'
  const companyId = profile?.companyId

  const usersQuery = useMemoFirebase(() => {
    if (!db || !currentUser) return null
    // Super Admin sees ALL users for approval purposes
    if (isSuperAdmin) return collection(db, "businessUsers");
    // Regular admin only sees their company members
    if (!companyId) return null;
    return query(collection(db, "businessUsers"), where("companyId", "==", companyId))
  }, [db, currentUser, companyId, isSuperAdmin])

  const { data: users, isLoading: usersLoading } = useCollection(usersQuery)

  const isCurrentUserAdmin = isSuperAdmin || profile?.role === 'admin'

  const handleToggleApproval = (userId: string, currentApproved: boolean) => {
    if (!db) return
    if (!isCurrentUserAdmin) {
      toast({ title: "Permission Denied", variant: "destructive" })
      return
    }
    updateDocumentNonBlocking(doc(db, "businessUsers", userId), {
      approved: !currentApproved,
      updatedAt: new Date().toISOString()
    })
    toast({ 
      title: !currentApproved ? "Access Granted" : "Access Revoked", 
      variant: !currentApproved ? "default" : "destructive"
    })
  }

  const handleDeleteUser = (userId: string, userEmail?: string) => {
    if (!db || !isCurrentUserAdmin) return
    if (userId === currentUser?.uid || userEmail === 'roshanismean@gmail.com') return
    
    deleteDocumentNonBlocking(doc(db, "businessUsers", userId))
    toast({ title: "User Removed", variant: "destructive" })
  }

  const isLoading = isUserLoading || usersLoading
  
  const pendingUsers = (users || []).filter(u => !u.approved && u.email !== 'roshanismean@gmail.com')
  const activeUsers = (users || []).filter(u => u.approved || u.email === 'roshanismean@gmail.com')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Management Portal
          </h1>
          <p className="text-muted-foreground font-body">
            {isSuperAdmin ? "Global Access Approvals" : `Manage access for ${profile?.companyName || "Your Company"}.`}
          </p>
        </div>
        {isCurrentUserAdmin && (
          <Button className="bg-primary hover:bg-primary/90 shadow-lg" onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Invite Member
          </Button>
        )}
      </div>

      {isCurrentUserAdmin && pendingUsers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600 font-bold">
            <AlertCircle className="h-5 w-5" />
            <h2>Pending Registrations ({pendingUsers.length})</h2>
          </div>
          <div className="grid gap-3">
            {pendingUsers.map((user) => (
              <Card key={user.id} className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-amber-200">
                      <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-sm">{user.firstName} {user.lastName}</h3>
                      <p className="text-xs text-muted-foreground">{user.email} • {user.companyName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600" onClick={() => handleToggleApproval(user.id, false)}>Approve Access</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteUser(user.id)}>Reject</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-primary">Active Members</h2>
        <div className="grid gap-4">
          {activeUsers.map((user) => (
            <Card key={user.id} className="border-none shadow-sm group bg-card">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-secondary">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate text-foreground">{user.firstName} {user.lastName}</h3>
                    {(user.role === 'admin' || user.email === 'roshanismean@gmail.com') && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Admin</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email} • {user.companyName}</p>
                </div>
                {isCurrentUserAdmin && user.email !== 'roshanismean@gmail.com' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => handleToggleApproval(user.id, true)} className="text-destructive">Revoke Access</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteUser(user.id, user.email)} className="text-destructive">Remove Account</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          ))}
          {activeUsers.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center bg-muted/20 rounded-xl border-2 border-dashed">No active company members found.</p>}
        </div>
      </section>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Share this registration link with your team:</p>
            <code className="block p-3 bg-muted rounded-lg text-xs break-all border">{typeof window !== 'undefined' ? `${window.location.origin}/?mode=signup` : '/?mode=signup'}</code>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => {
              navigator.clipboard.writeText(window.location.origin + "/?mode=signup")
              toast({ title: "Link Copied" })
              setIsInviteOpen(false)
            }}>Copy Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
