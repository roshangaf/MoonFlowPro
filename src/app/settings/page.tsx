"use client"

import { useState, useEffect } from "react"
import { 
  User, 
  Building2, 
  Bell, 
  ShieldCheck, 
  CreditCard,
  Save,
  Globe,
  Mail,
  Palette,
  Monitor,
  Layout,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useSidebar } from "@/components/ui/sidebar"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function SettingsPage() {
  const { toast } = useToast()
  const { setOpen } = useSidebar()
  const { user } = useUser()
  const db = useFirestore()
  const [isSaving, setIsSaving] = useState(false)
  
  // Persistence States
  const [theme, setTheme] = useState<string>("system")
  const [isCompactSidebar, setIsCompactSidebar] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)

  // Form State
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [address, setAddress] = useState("")
  const [currency, setCurrency] = useState("usd")

  // Fetch Profile Data
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "businessUsers", user.uid)
  }, [db, user?.uid])

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  // Initialize form from profile data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "")
      setLastName(profile.lastName || "")
      setEmail(profile.email || "")
      setBusinessName(profile.businessName || "")
      setAddress(profile.address || "")
      setCurrency(profile.currency || "usd")
    }
  }, [profile])

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "system"
    const savedCompact = localStorage.getItem("compact-sidebar") === "true"
    const savedContrast = localStorage.getItem("high-contrast") === "true"
    
    setTheme(savedTheme)
    setIsCompactSidebar(savedCompact)
    setIsHighContrast(savedContrast)
  }, [])

  const applyTheme = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    
    const root = document.documentElement
    if (newTheme === "dark") {
      root.classList.add("dark")
    } else if (newTheme === "light") {
      root.classList.remove("dark")
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
  }

  const toggleCompactSidebar = (enabled: boolean) => {
    setIsCompactSidebar(enabled)
    localStorage.setItem("compact-sidebar", String(enabled))
    setOpen(!enabled)
  }

  const toggleHighContrast = (enabled: boolean) => {
    setIsHighContrast(enabled)
    localStorage.setItem("high-contrast", String(enabled))
    
    const root = document.documentElement
    if (enabled) {
      root.classList.add("high-contrast")
    } else {
      root.classList.remove("high-contrast")
    }
  }

  const handleSave = () => {
    if (!profileRef || !db) return

    setIsSaving(true)
    
    updateDocumentNonBlocking(profileRef, {
      firstName,
      lastName,
      email,
      businessName,
      address,
      currency,
      updatedAt: new Date().toISOString()
    })

    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Settings Saved",
        description: `Your profile and business settings have been updated.`,
      })
    }, 500)
  }

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">System Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences, business details, and integrations.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white dark:bg-card p-1 h-12 shadow-sm border">
          <TabsTrigger value="profile" className="flex gap-2 h-10 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="business" className="flex gap-2 h-10 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" /> Business
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex gap-2 h-10 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="h-4 w-4" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex gap-2 h-10 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex gap-2 h-10 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and how others see you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input 
                    id="first-name" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input 
                    id="last-name" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Account Role</Label>
                  <Input id="role" defaultValue="Business User" disabled className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Preferred Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>Public information about your reconditioning business.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="biz-name">Business Name</Label>
                  <Input 
                    id="biz-name" 
                    value={businessName} 
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-id">Tax ID / VAT Number</Label>
                  <Input id="tax-id" defaultValue="TX-99283-X" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input 
                    id="address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Base Currency</Label>
                  <Select onValueChange={setCurrency} value={currency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                      <SelectItem value="npr">NPR (रू)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="utc-6">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc-5">Eastern Time (ET)</SelectItem>
                      <SelectItem value="utc-6">Central Time (CT)</SelectItem>
                      <SelectItem value="utc-8">Pacific Time (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Interface Customization</CardTitle>
              <CardDescription>Customize how MoonFlowPro looks on your device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Color Theme</Label>
                    <Select value={theme} onValueChange={applyTheme}>
                      <SelectTrigger id="theme">
                        <SelectValue placeholder="Select Theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" /> Light Mode
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" /> Dark Mode
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" /> System Preference
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="font-size">Interface Scale</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger id="font-size">
                        <SelectValue placeholder="Select Scale" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (90%)</SelectItem>
                        <SelectItem value="medium">Default (100%)</SelectItem>
                        <SelectItem value="large">Large (110%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-secondary transition-colors hover:bg-secondary/30">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Layout className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-primary">Compact Sidebar</p>
                        <p className="text-sm text-muted-foreground">Always keep the navigation sidebar in a collapsed state.</p>
                      </div>
                    </div>
                    <Switch checked={isCompactSidebar} onCheckedChange={toggleCompactSidebar} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-secondary transition-colors hover:bg-secondary/30">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Monitor className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-primary">High Contrast Mode</p>
                        <p className="text-sm text-muted-foreground">Increase contrast for better accessibility.</p>
                      </div>
                    </div>
                    <Switch checked={isHighContrast} onCheckedChange={toggleHighContrast} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Email & App Notifications</CardTitle>
              <CardDescription>Control when and how you receive updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-secondary">
                  <div className="space-y-1">
                    <p className="font-bold text-primary">Sales Alerts</p>
                    <p className="text-sm text-muted-foreground">Receive a summary of daily sales and revenue performance.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-secondary">
                  <div className="space-y-1">
                    <p className="font-bold text-primary">Inventory Low-Stock</p>
                    <p className="text-sm text-muted-foreground">Get notified when specific item categories are running low.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-secondary">
                  <div className="space-y-1">
                    <p className="font-bold text-primary">AI Reminder Ready</p>
                    <p className="text-sm text-muted-foreground">Get an alert when AI has prepared automated follow-ups for review.</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and authentication methods.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="current-pass">Current Password</Label>
                    <Input id="current-pass" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-pass">New Password</Label>
                    <Input id="new-pass" type="password" />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-primary">Two-Factor Authentication (2FA)</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button 
          className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px] h-12 shadow-lg gap-2"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving Changes..." : (
            <><Save className="h-4 w-4" /> Save System Settings</>
          )}
        </Button>
      </div>
    </div>
  )
}
