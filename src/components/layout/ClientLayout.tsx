
"use client"

import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase"
import { doc } from "firebase/firestore"
import { useEffect } from "react"
import { Loader2, ShieldAlert, LogOut, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { useAuth } from "@/firebase"

function ApprovalWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "businessUsers", user.uid)
  }, [db, user?.uid])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const isLoginPage = pathname === "/"
  
  // Specific hardcoded check for the super admin email
  const isSuperAdmin = user?.email === 'roshanismean@gmail.com'
  const isApproved = (profile?.approved === true) || isSuperAdmin

  // If user is logged in but not approved (and not an admin), and not on the login page
  if (user && !isUserLoading && !isProfileLoading && !isApproved && !isLoginPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 md:p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary font-headline">Pending Approval</h1>
            <p className="text-muted-foreground">
              Hello, {profile?.firstName || 'User'}. Your account for <strong>{profile?.companyName || 'your company'}</strong> has been created but requires administrator approval.
            </p>
          </div>
          <div className="p-4 bg-secondary/50 rounded-xl border">
            <p className="text-sm font-medium">An email notification has been queued for the system administrator. Access will be granted shortly.</p>
          </div>
          <div className="space-y-3 pt-4">
            <Button 
              variant="outline" 
              className="w-full gap-2 h-11" 
              onClick={() => {
                if (auth) {
                  signOut(auth).then(() => router.push("/"))
                }
              }}
            >
              <LogOut className="h-4 w-4" /> Sign Out & Return Home
            </Button>
            
            <div className="mt-8 pt-6 border-t space-y-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Admin Note
              </p>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-muted-foreground">User ID:</span>
                <code className="bg-slate-100 p-2 rounded text-[10px] font-mono break-all select-all w-full">
                  {user.uid}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If loading user or profile
  if (user && (isUserLoading || isProfileLoading)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">Authenticating...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/"

  return (
    <FirebaseClientProvider>
      <ApprovalWrapper>
        {isLoginPage ? (
          <main className="w-full min-h-screen">{children}</main>
        ) : (
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <SidebarInset className="bg-background flex flex-col">
                <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:hidden bg-background sticky top-0 z-20">
                  <div className="flex items-center gap-3">
                    <SidebarTrigger className="-ml-1" />
                    <div className="flex items-center gap-2">
                       <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
                         <ArrowLeftRight className="h-5 w-5" />
                       </div>
                       <span className="font-bold text-sm tracking-tight">MoonFlowPro</span>
                    </div>
                  </div>
                </header>
                <main className="flex-1 px-4 py-6 md:px-10 lg:px-12 max-w-7xl mx-auto w-full">
                  {children}
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
        )}
      </ApprovalWrapper>
    </FirebaseClientProvider>
  )
}
