
"use client"

import Link from "next/link"
import { ArrowRight, ArrowLeftRight, Package, BellRing, Users, BadgeDollarSign, Sparkles, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/firebase"

export default function LandingPage() {
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-background font-body overflow-x-hidden">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-primary font-headline">MoonFlowPro</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild className="bg-primary hover:bg-primary/90 font-bold shadow-md">
                <Link href="/dashboard">Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex font-bold">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 font-bold shadow-md">
                  <Link href="/login?mode=signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-40 overflow-hidden">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 bg-accent/10 text-accent border-accent/20 font-bold uppercase tracking-widest text-xs">
            Smart Reconditioning Management
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-primary font-headline max-w-4xl mx-auto leading-[1.1]">
            Scale Your Business with <span className="text-accent">Intelligent</span> Stock Control
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform for reconditioned products. Track inventory, manage repairs, and automate customer follow-ups with GenAI.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl gap-2">
              <Link href="/login?mode=signup">Start Free Trial <ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-14 px-8 text-lg font-bold shadow-sm">
              <Link href="/login">Live Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary font-headline">Enterprise-Grade Operations</h2>
          <p className="text-muted-foreground mt-4">Powerful tools designed specifically for reconditioning logistics.</p>
        </div>
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { 
              icon: Package, 
              title: "Inventory Isolation", 
              desc: "Complete multi-tenant separation. Your data is strictly your own, secured by enterprise rules." 
            },
            { 
              icon: BellRing, 
              title: "AI Reminders", 
              desc: "Automated service and warranty follow-ups crafted by GenAI to keep customers coming back." 
            },
            { 
              icon: BadgeDollarSign, 
              title: "Sales Intelligence", 
              desc: "Real-time revenue tracking and average sale metrics across your entire warehouse network." 
            },
            { 
              icon: Users, 
              title: "CRM Integration", 
              desc: "Maintain detailed customer histories and lifetime value profiles automatically." 
            },
            { 
              icon: Sparkles, 
              title: "Repair Logging", 
              desc: "Track every dollar invested in reconditioning to protect your margins and stock health." 
            },
            { 
              icon: ShieldCheck, 
              title: "Approval Workflow", 
              desc: "Secure staff onboarding with administrative oversight for every new account." 
            }
          ].map((feature, i) => (
            <Card key={i} className="border-none shadow-sm group hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="h-12 w-12 bg-primary/5 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="bg-primary rounded-[2.5rem] p-8 md:p-16 lg:p-20 text-center text-primary-foreground shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold font-headline tracking-tight max-w-3xl mx-auto mb-8">
                Ready to optimize your reconditioning workflow?
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="bg-white text-primary hover:bg-slate-100 font-bold h-14 px-10 text-lg shadow-xl">
                  <Link href="/login?mode=signup">Get Started Now</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary-foreground/20 text-primary-foreground hover:bg-white/10 font-bold h-14 px-10 text-lg">
                  <Link href="/login">Watch Overview</Link>
                </Button>
              </div>
              <div className="mt-12 flex items-center justify-center gap-8 text-primary-foreground/60 text-sm font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Instant Setup</span>
                <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Multi-Tenant</span>
                <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> AI Powered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-slate-50 dark:bg-background">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-primary">MoonFlowPro</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 MoonFlowPro Business Systems. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
