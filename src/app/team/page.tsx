"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  MoreVertical, 
  Loader2, 
  Mail, 
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function TeamPage() {
  const router = useRouter()
  const { user: currentUser, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const [isInviteOpen, setIsInviteOpen] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !currentUser) {
      router.push("/")
    }
  }, [currentUser, isUserLoading, router])

  const usersQuery = useMemoFirebase(() => {
    if (!db || !currentUser) return null
    return collection(db, "businessUsers")
  }, [db, currentUser])

  const adminsQuery = useMemoFirebase(() => {
    if (!db || !currentUser) return null
    return collection(db, "admins")
  }, [db, currentUser])

  const { data: users, isLoading: usersLoading } = useCollection(usersQuery)
  const { data: admins, isLoading: adminsLoading } = useCollection(adminsQuery)

  // Explicit check for current user's admin role
  const adminDocRef = useMemoFirebase(() => {
    if (!db || !currentUser?.uid) return null
    return doc(db, "admins", currentUser.uid)
  }, [db, currentUser?.uid])
  
  const { data: adminDoc } = useDoc(adminDocRef)

  const checkIsAdmin = (userId: string, email?: string) => {
    if (email === 'roshanismean@gmail.com') return true
    return (admins || []).some(admin => admin.id === userId)
  }

  const isCurrentUserAdmin = (currentUser?.email === 'roshanismean@gmail.com') || !!adminDoc

  const handleToggleAdmin = (userId: string, currentStatus: boolean, userEmail?: string) => {
    if (!db) return
    if (!isCurrentUserAdmin) {
      toast({ title: "Permission Denied", description: "Only administrators can change roles.", variant: "destructive" })
      return
    }
    
    // Prevent removing super admin status
    if (userEmail === 'roshanismean@gmail.com') {
      toast({ title: "Action Restricted", description: "Primary administrator roles cannot be modified.", variant: "destructive" })
      return
    }

    const adminRef = doc(db, "admins", userId)
    
    if (currentStatus) {
      deleteDocumentNonBlocking(adminRef)
      toast({ title: "Role Updated", description: "Administrator privileges removed." })
    } else {
      setDocumentNonBlocking(adminRef, { createdAt: new Date().toISOString() }, { merge: true })
      toast({ title: "Role Updated", description: "User promoted to Administrator." })
    }
  }

  const handleToggleApproval = (userId: string, currentApproved: boolean) => {
    if (!db) return
    if (!isCurrentUserAdmin) {
      toast({ title: "Permission Denied", description: "Only administrators can approve users.", variant: "destructive" })
      return
    }
    updateDocumentNonBlocking(doc(db, "businessUsers", userId), {
      approved: !currentApproved,
      updatedAt: new Date().toISOString()
    })
    toast({ 
      title: !currentApproved ? "User Approved" : "Access Revoked", 
      description: !currentApproved ? "The user now has full system access." : "The user's access has been suspended.",
      variant: !currentApproved ? "default" : "destructive"
    })
  }

  const handleDeleteUser = (userId: string, userEmail?: string) => {
    if (!db) return
    if (!isCurrentUserAdmin) {
      toast({ title: "Permission Denied", description: "Only administrators can remove staff.", variant: "destructive" })
      return
    }
    if (userId === currentUser?.uid || userEmail === 'roshanismean@gmail.com') {
      toast({ title: "Action Restricted", description: "You cannot delete this profile.", variant: "destructive" })
      return
    }
    deleteDocumentNonBlocking(doc(db, "businessUsers", userId))
    if (checkIsAdmin(userId)) deleteDocumentNonBlocking(doc(db, "admins", userId))

    toast({ title: "User Removed", description: "The staff profile has been deleted.", variant: "destructive" })
  }

  const isLoading = isUserLoading || usersLoading || adminsLoading
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Team Management</h1>
          <p className="text-muted-foreground font-body">Manage staff access levels and system permissions.</p>
        </div>
        {isCurrentUserAdmin && (
          <Button className="bg-primary hover:bg-primary/90 shadow-lg gap-2" onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite New Staff
          </Button>
        )}
      </div>

      {isCurrentUserAdmin ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 font-bold">
              <AlertCircle className="h-5 w-5" />
              <h2>Pending Approvals ({pendingUsers.length})</h2>
            </div>
            {pendingUsers.length === 0 && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                <Check className="h-3 w-3 mr-1" /> All profiles approved
              </Badge>
            )}
          </div>
          
          <div className="grid gap-4">
            {pendingUsers.length > 0 ? (
              pendingUsers.map((user) => (
                <Card key={user.id} className="border-amber-200 bg-amber-50/30 shadow-sm overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border border-amber-200">
                        <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                          {(user.firstName?.[0] || "") + (user.lastName?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-sm">{user.firstName} {user.lastName}</h3>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        onClick={() => handleToggleApproval(user.id, false)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve Access
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground text-sm italic">
                No staff members are currently waiting for approval.
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="p-4 bg-secondary/30 rounded-xl border flex gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground italic">
            You are currently viewing the team directory as a Staff Member. Administrative controls for approvals and role management are hidden.
          </p>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-primary">Active Team Members</h2>
        <div className="grid gap-6">
          {activeUsers?.map((user) => (
            <Card key={user.id} className="border-none shadow-sm overflow-hidden group">
              <CardContent className="p-0">
                <div className="flex items-center p-6 gap-4">
                  <Avatar className="h-12 w-12 border-2 border-secondary">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {(user.firstName?.[0] || "") + (user.lastName?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg truncate">{user.firstName} {user.lastName}</h3>
                      {checkIsAdmin(user.id, user.email) ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1 px-2 py-0">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Staff Member</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {user.email}
                      </div>
                      <div className="text-xs font-mono bg-secondary/30 px-1.5 py-0.5 rounded">
                        UID: {user.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                  
                  {isCurrentUserAdmin && (
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Permissions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleToggleAdmin(user.id, checkIsAdmin(user.id, user.email), user.email)}>
                            {checkIsAdmin(user.id, user.email) ? (
                              <><Shield className="h-4 w-4 mr-2" /> Revoke Admin Role</>
                            ) : (
                              <><ShieldCheck className="h-4 w-4 mr-2" /> Promote to Admin</>
                            )}
                          </DropdownMenuItem>
                          {user.email !== 'roshanismean@gmail.com' && (
                            <DropdownMenuItem onClick={() => handleToggleApproval(user.id, true)} className="text-amber-600">
                              <XCircle className="h-4 w-4 mr-2" /> Revoke System Access
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {user.email !== 'roshanismean@gmail.com' && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id, user.email)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Remove from Team
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite New Staff Member
            </DialogTitle>
            <DialogDescription>
              New staff can register using the link below. Their access will remain suspended until you approve them.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-sm font-medium text-primary mb-2">Registration Link</p>
              <div className="flex items-center gap-2 p-2 bg-background border rounded-lg font-mono text-xs select-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/?mode=signup` : '/?mode=signup'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Workflow:</strong> 1. Share link &rarr; 2. Staff registers &rarr; 3. You approve them in "Pending Approvals" &rarr; 4. They get access.
            </p>
          </div>
          <DialogFooter>
            <Button className="w-full gap-2" onClick={() => {
              const link = typeof window !== 'undefined' ? `${window.location.origin}/?mode=signup` : '/?mode=signup'
              navigator.clipboard.writeText(link)
              toast({ title: "Link Copied", description: "Share this link with your team." })
              setIsInviteOpen(false)
            }}>
              <ExternalLink className="h-4 w-4" /> Copy Invite Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
