
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Package, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ChevronRight,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"

export default function DashboardPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()

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
  
  const isSuperAdmin = user?.email === 'roshanismean@gmail.com'
  const isApproved = profile?.approved === true || isSuperAdmin
  const companyId = profile?.companyId || (isSuperAdmin ? "system" : user?.uid)

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user || !isApproved || !companyId) return null
    if (isSuperAdmin) return collection(db, "products")
    return query(collection(db, "products"), where("companyId", "==", companyId))
  }, [db, user, companyId, isApproved, isSuperAdmin])

  const customersQuery = useMemoFirebase(() => {
    if (!db || !user || !isApproved || !companyId) return null
    if (isSuperAdmin) return collection(db, "customers")
    return query(collection(db, "customers"), where("companyId", "==", companyId))
  }, [db, user, companyId, isApproved, isSuperAdmin])

  const salesQuery = useMemoFirebase(() => {
    if (!db || !user || !isApproved || !companyId) return null
    if (isSuperAdmin) return collection(db, "sales")
    return query(collection(db, "sales"), where("companyId", "==", companyId))
  }, [db, user, companyId, isApproved, isSuperAdmin])

  const { data: products, isLoading: productsLoading } = useCollection(productsQuery)
  const { data: customers, isLoading: customersLoading } = useCollection(customersQuery)
  const { data: sales, isLoading: salesLoading } = useCollection(salesQuery)

  const activeInventory = (products || []).filter(p => p.lifecycleStatus !== 'Sold').length
  const totalSalesValue = (sales || []).reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  const totalCustomers = (customers || []).length

  const isLoading = isUserLoading || isProfileLoading || (isApproved && (productsLoading || customersLoading || salesLoading))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !isApproved) return null

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Overview Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.firstName}. Here is what is happening with {profile?.companyName || "your company"} today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-card overflow-hidden group hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/5 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="secondary" className="font-medium">Live</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Active Inventory</p>
              <h3 className="text-2xl font-bold text-foreground">{activeInventory} Items</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden group hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-accent/5 rounded-lg">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <Badge variant="secondary" className="font-medium">Company Total</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Sales Volume</p>
              <h3 className="text-2xl font-bold text-foreground">${totalSalesValue.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden group hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/5 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="secondary" className="font-medium">Total</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Customers</p>
              <h3 className="text-2xl font-bold text-foreground">{totalCustomers} Profiles</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden group hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-accent/5 rounded-lg">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <Badge variant="secondary" className="font-medium">Active</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">System Status</p>
              <h3 className="text-2xl font-bold text-foreground">Healthy</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Transactions</CardTitle>
              <CardDescription>View latest company activity.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sales">View All <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(sales || []).slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary text-xs">
                      #{sale.id.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Sale Recorded</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">${(sale.totalAmount || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{sale.paymentStatus}</p>
                  </div>
                </div>
              ))}
              {(sales || []).length === 0 && <p className="text-center text-muted-foreground text-sm py-10">No recent transactions found.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Stock Breakdown</CardTitle>
            <CardDescription>Company lifecycle distribution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Active Inventory</span>
                <span className="text-muted-foreground">{activeInventory} items</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${(activeInventory / Math.max(products?.length || 1, 1)) * 100}%` }}></div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                <Link href="/inventory" className="flex items-center justify-center gap-2">
                  Stock Overview <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
