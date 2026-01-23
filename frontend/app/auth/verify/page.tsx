"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Mail, CheckCircle2, XCircle, ArrowLeft, RotateCw, ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')
  const [userRole, setUserRole] = useState<'candidate' | 'recruiter' | null>(null)

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Check for URL hash parameters first (Supabase email verification)
        const hash = window.location.hash
        if (hash.includes('access_token=') && hash.includes('type=signup')) {
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const type = params.get('type')

          if (accessToken && type === 'signup') {
            // Store the session data
            localStorage.setItem("access_token", accessToken)

            const payload = JSON.parse(atob(accessToken.split('.')[1]))
            const user = {
              id: payload.sub,
              email: payload.email,
              role: payload.user_metadata?.role || 'candidate',
              fullName: payload.user_metadata?.full_name || 'User'
            }

            localStorage.setItem("user", JSON.stringify(user))
            localStorage.setItem('from_email_verification', 'true')

            setStatus('success')
            setMessage('Email verified successfully!')
            setUserRole(user.role)

            setTimeout(() => {
              if (user.role === 'candidate') {
                router.push('/candidate/profile/setup')
              } else if (user.role === 'recruiter') {
                router.push('/recruiter/profile/setup')
              }
            }, 2000)
            return
          }
        }

        // Fallback to URL parameters (manual verification)
        const token = searchParams.get('token')
        const type = searchParams.get('type')

        if (!token || type !== 'signup') {
          setStatus('verifying')
          setMessage('Please check your email and click the verification link')
          return
        }

        const response = await authAPI.verifyEmail(token)

        if (response.data.user) {
          setStatus('success')
          setMessage('Email verified successfully!')

          localStorage.setItem("access_token", response.data.session.access_token)
          localStorage.setItem("user", JSON.stringify(response.data.user))

          const role = response.data.user.role
          setUserRole(role)

          setTimeout(() => {
            if (role === 'candidate') {
              router.push('/candidate/profile/setup')
            } else if (role === 'recruiter') {
              router.push('/recruiter/profile/setup')
            }
          }, 2000)
        }
      } catch (error: any) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage(error.response?.data?.message || 'Verification failed')
      }
    }

    verifyEmail()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Top Controls */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => router.push('/')}
          className="p-2 rounded-full bg-background/50 hover:bg-background border border-border transition-colors backdrop-blur-sm"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-full bg-background/50 hover:bg-background border border-border transition-colors backdrop-blur-sm"
          aria-label="Refresh"
        >
          <RotateCw className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <main className="w-full max-w-md animate-scale-in z-10">
        <Card className="glass-card border-white/20 dark:border-white/10 p-8 shadow-2xl text-center space-y-6">
          {status === 'verifying' && (
            <>
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                <Mail className="w-10 h-10 text-primary" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Check Your Email</h1>
                <p className="text-muted-foreground">
                  {message || "Please check your email and click the verification link"}
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 text-sm text-left border border-border/50">
                <p className="font-medium mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Next Steps:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex gap-2"><div className="w-5 h-5 rounded-full bg-background border flex items-center justify-center text-[10px] font-bold">1</div> Check your inbox (and spam)</li>
                  <li className="flex gap-2"><div className="w-5 h-5 rounded-full bg-background border flex items-center justify-center text-[10px] font-bold">2</div> Click the verification link</li>
                  <li className="flex gap-2"><div className="w-5 h-5 rounded-full bg-background border flex items-center justify-center text-[10px] font-bold">3</div> Complete your profile</li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => router.push('/auth/signup')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Sign Up
                </Button>

                <div className="text-sm">
                  <span className="text-muted-foreground">Already verified? </span>
                  <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                    Log In
                  </Link>
                </div>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-500">Email Verified!</h1>
                <p className="text-muted-foreground">
                  {message}
                </p>
              </div>

              <div className="py-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to setup...
                </div>

                <Button
                  onClick={() => {
                    if (userRole === 'candidate') {
                      router.push('/candidate/profile/setup')
                    } else if (userRole === 'recruiter') {
                      router.push('/recruiter/profile/setup')
                    }
                  }}
                  className="w-full shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700 text-white border-none"
                >
                  Continue Now
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-destructive">Verification Failed</h1>
                <p className="text-muted-foreground">
                  {message}
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => router.push('/auth/signup')}
                  className="w-full"
                >
                  Try Signing Up Again
                </Button>

                <div className="text-sm">
                  <span className="text-muted-foreground">Already have an account? </span>
                  <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                    Log In
                  </Link>
                </div>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
