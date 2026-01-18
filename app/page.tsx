import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/landing/Hero"
import { Problem } from "@/components/landing/Problem"
import { Solution } from "@/components/landing/Solution"
import { Features } from "@/components/landing/Features"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Stats } from "@/components/landing/Stats"
import { CTAFooter } from "@/components/landing/CTAFooter"

export default async function LandingPage() {
  const session = await getServerSession(authOptions)
  
  // If user is already logged in, redirect to summaries page
  if (session) {
    redirect("/summaries")
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <HowItWorks />
      <Stats />
      <CTAFooter />
    </main>
  )
}
