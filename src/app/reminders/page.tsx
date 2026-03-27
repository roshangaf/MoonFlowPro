
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Sparkles, 
  Send, 
  Copy, 
  Loader2, 
  Calendar,
  AlertCircle,
  Mail
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { generateAutomatedReminders, GenerateReminderOutput } from "@/ai/flows/generate-automated-reminders"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"

export default function RemindersPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
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

  // Fetch Customers
  const customersQuery = useMemoFirebase(() => {
    if (!db || !companyId || !isApproved) return null
    return query(collection(db, "customers"), where("companyId", "==", companyId))
  }, [db, companyId, isApproved])

  // Fetch Products
  const productsQuery = useMemoFirebase(() => {
    if (!db || !companyId || !isApproved) return null
    return query(collection(db, "products"), where("companyId", "==", companyId))
  }, [db, companyId, isApproved])

  const { data: customers, isLoading: customersLoading } = useCollection(customersQuery)
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery)

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [reminderResult, setReminderResult] = useState<GenerateReminderOutput | null>(null)

  const handleGenerate = async () => {
    if (!selectedCustomerId || !selectedProductId) {
      toast({
        title: "Missing Information",
        description: "Please select both a customer and a product.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    try {
      const customer = customers?.find(c => c.id === selectedCustomerId)
      const product = products?.find(p => p.id === selectedProductId)

      if (!customer || !product) throw new Error("Data not found")

      const result = await generateAutomatedReminders({
        currentDate: new Date().toISOString().split('T')[0],
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        productName: product.name,
        productId: product.id,
        purchaseDate: product.purchaseDate || new Date().toISOString().split('T')[0],
        warrantyEndDate: product.warrantyEndDate || new Date(Date.now() + 31536000000).toISOString().split('T')[0], // +1 year
        lastServiceDate: product.purchaseDate,
        nextServiceDate: product.nextServiceDate || new Date(Date.now() + 15552000000).toISOString().split('T')[0], // +6 months
        paymentDueDate: product.paymentDueDate
      })

      setReminderResult(result)
    } catch (error) {
      console.error(error)
      toast({
        title: "Generation Failed",
        description: "The AI was unable to generate a reminder at this time.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (reminderResult) {
      navigator.clipboard.writeText(`${reminderResult.reminderSubject}\n\n${reminderResult.reminderText}`)
      toast({
        title: "Copied to Clipboard",
        description: "Reminder content has been copied successfully."
      })
    }
  }

  const isLoading = isUserLoading || isProfileLoading || customersLoading || productsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !isApproved) return null

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline flex items-center gap-3">
          AI Follow-up Generator
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 font-bold uppercase tracking-widest text-[10px]">Powered by GenAI</Badge>
        </h1>
        <p className="text-muted-foreground">Automatically craft professional, personalized follow-ups for your clients.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Generator Configuration</CardTitle>
            <CardDescription>Select the records you want to analyze for the reminder.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary">Target Customer</label>
              <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Search or select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {(customers || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-primary">Associated Product</label>
              <Select onValueChange={setSelectedProductId} value={selectedProductId} disabled={!selectedCustomerId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a product record" />
                </SelectTrigger>
                <SelectContent>
                  {(products || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} [SN: {p.serialNumber}]</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-secondary/50 rounded-xl border border-secondary">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-accent mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">AI Analysis Protocol</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Our AI will evaluate purchase dates, warranty expirations, and service intervals to determine the most effective follow-up strategy.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 shadow-lg gap-2 text-base"
              onClick={handleGenerate}
              disabled={isGenerating || !selectedCustomerId || !selectedProductId}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Analyzing Records...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" /> Generate Personalized Reminder
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          {!reminderResult && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl opacity-60">
              <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary/40" />
              </div>
              <h3 className="font-bold text-xl mb-2">Ready for Analysis</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Configure the customer and product details on the left to generate a tailored follow-up reminder.
              </p>
            </div>
          ) : isGenerating ? (
            <Card className="border-none shadow-sm animate-pulse">
               <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 text-accent animate-spin" />
                  <p className="font-medium text-muted-foreground">Drafting follow-up correspondence...</p>
               </div>
            </Card>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden animate-in zoom-in-95 duration-300 bg-card">
              <div className="bg-primary px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary-foreground/80" />
                  <span className="font-bold text-primary-foreground">Reminder Draft</span>
                </div>
                <Badge className="bg-accent text-accent-foreground border-none font-bold">
                  {reminderResult.reminderType.toUpperCase()}
                </Badge>
              </div>
              <CardContent className="p-8 space-y-6 bg-card">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subject Line</p>
                  <p className="text-lg font-bold text-primary leading-snug">{reminderResult.reminderSubject}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Message Body</p>
                  <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">
                    {reminderResult.reminderText}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 border-t p-6 gap-3 flex-col sm:flex-row">
                <Button variant="outline" className="w-full sm:flex-1 h-11 gap-2" onClick={handleCopy}>
                  <Copy className="h-4 w-4" /> Copy Content
                </Button>
                <Button className="w-full sm:flex-1 h-11 bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm gap-2">
                  <Send className="h-4 w-4" /> Finalize & Send
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
