
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

  const isPublicPage = pathname === "/" || pathname === "/login"
  const isSuperAdmin = user?.email === 'roshanismean@gmail.com'
  const isApproved = (profile?.approved === true) || isSuperAdmin

  // Redirect to login if user is not logged in and trying to access private page
  useEffect(() => {
    if (!isUserLoading && !user && !isPublicPage) {
      router.push("/login")
    }
  }, [user, isUserLoading, isPublicPage, router])

  // If user is logged in but not approved, and not on a public page
  if (user && !isUserLoading && !isProfileLoading && !isApproved && !isPublicPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 md:p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-200">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary font-headline tracking-tight">Pending Activation</h1>
            <p className="text-muted-foreground text-sm">
              Hello, {profile?.firstName || 'User'}. Your account for <strong>{profile?.companyName || 'your company'}</strong> has been created but requires administrator approval.
            </p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200/50">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">An email notification has been queued for the system administrator. Access will be granted shortly.</p>
          </div>
          <div className="space-y-3 pt-4">
            <Button 
              variant="outline" 
              className="w-full gap-2 h-12 font-bold" 
              onClick={() => {
                if (auth) {
                  signOut(auth).then(() => router.push("/"))
                }
              }}
            >
              <LogOut className="h-4 w-4" /> Return to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = pathname === "/" || pathname === "/login"

  return (
    <FirebaseClientProvider>
      <ApprovalWrapper>
        {isPublicPage ? (
          <main className="w-full min-h-screen bg-background">{children}</main>
        ) : (
          <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background">
              <AppSidebar />
              <SidebarInset className="bg-background flex flex-col min-w-0 w-full">
                <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:hidden bg-background/95 backdrop-blur sticky top-0 z-50">
                  <div className="flex items-center gap-3">
                    <SidebarTrigger className="-ml-1 h-10 w-10" />
                    <div className="flex items-center gap-2">
                       <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
                         <ArrowLeftRight className="h-5 w-5" />
                       </div>
                       <span className="font-bold text-base tracking-tight text-primary">MoonFlowPro</span>
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
