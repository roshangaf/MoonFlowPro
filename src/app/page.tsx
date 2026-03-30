
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftRight, Lock, Mail, Loader2, UserPlus, LogIn, AlertCircle, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login"
import { doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

function LoginPageContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  
  const [isSignUp, setIsSignUp] = useState(mode === 'signup')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()

  useEffect(() => {
    // Standard authenticated redirect logic
    if (user && !isUserLoading) {
      router.push("/dashboard")
    }
  }, [user, isUserLoading, router])

  useEffect(() => {
    if (mode === 'signup') setIsSignUp(true)
  }, [mode])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) return
    
    setIsSubmitting(true)

    if (isSignUp) {
      initiateEmailSignUp(auth, email, password)
        .then((cred) => {
          if (db && cred.user) {
            const isSuperAdmin = email === 'roshanismean@gmail.com'
            const companyId = cred.user.uid;

            setDocumentNonBlocking(doc(db, "businessUsers", cred.user.uid), {
              id: cred.user.uid,
              firstName,
              lastName,
              email,
              companyName: isSuperAdmin ? "MoonFlowPro System" : companyName,
              companyId: isSuperAdmin ? "system" : companyId,
              role: isSuperAdmin ? "super-admin" : "admin",
              approved: isSuperAdmin,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, { merge: true })
            
            if (isSuperAdmin) {
              setDocumentNonBlocking(doc(db, "admins", cred.user.uid), {
                createdAt: new Date().toISOString()
              }, { merge: true })
            }

            toast({
              title: "Registration Successful",
              description: isSuperAdmin 
                ? "Admin profile created. Accessing global dashboard." 
                : "Your company profile is created. Please wait for admin activation.",
            })
          }
        })
        .catch((error: any) => {
          setIsSubmitting(false)
          handleAuthError(error)
        })
    } else {
      initiateEmailSignIn(auth, email, password)
        .catch((error: any) => {
          setIsSubmitting(false)
          handleAuthError(error)
        })
    }
  }

  const handleAuthError = (error: any) => {
    console.error("Auth failed:", error)
    let message = "Please check your credentials and try again."
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      message = "No account found with these credentials."
    } else if (error.code === 'auth/email-already-in-use') {
      message = "This email is already registered."
    }

    toast({
      title: "Authentication Failed",
      description: message,
      variant: "destructive"
    })
  }

  if (isUserLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden font-body">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl mb-4">
            <ArrowLeftRight className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">MoonFlowPro</h1>
          <p className="text-muted-foreground font-medium">Business Management Portal</p>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-card">
            <CardTitle className="text-xl flex items-center gap-2">
              {isSignUp ? <><UserPlus className="h-5 w-5" /> Company Registration</> : <><LogIn className="h-5 w-5" /> Business Sign In</>}
            </CardTitle>
            <CardDescription>
              {isSignUp ? "Register your business and create your admin profile." : "Enter your credentials to access your company dashboard."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4 pt-6">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="companyName" placeholder="Acme Corp" className="pl-10" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fname">First Name</Label>
                      <Input id="fname" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lname">Last Name</Label>
                      <Input id="lname" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@example.com" 
                    className="pl-10"
                    value={email}
                    onChange={(emailValue) => setEmail(emailValue.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    className="pl-10"
                    value={password}
                    onChange={(passValue) => setPassword(passValue.target.value)}
                    required
                  />
                </div>
              </div>

              {isSignUp && email !== 'roshanismean@gmail.com' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/50 flex gap-3 mt-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-tight">
                    By registering, you agree that your company account will remain pending until verified.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-8">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 h-11 text-base shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isSignUp ? "Registering..." : "Authenticating..."}
                  </>
                ) : (
                  isSignUp ? "Create Company Account" : "Sign In to Dashboard"
                )}
              </Button>
              <Button 
                variant="ghost" 
                type="button" 
                className="text-primary font-bold" 
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Already registered? Sign In" : "New business? Register Company"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
