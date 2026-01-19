"use client"

import * as React from "react"
import { Eye, EyeOff, Loader2, Lock, Mail, User, Building } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabaseClient } from "@/lib/supabase/client"

export default function CadastroPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [showPassword, setShowPassword] = React.useState<boolean>(false)

  const [name, setName] = React.useState("")
  const [company, setCompany] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (!name || !company || !email || !password) {
      setError("Preencha todos os campos.")
      setIsLoading(false)
      return
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin

    const { data, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          workspace_name: company,
        },
        emailRedirectTo: `${siteUrl}/onboarding`,
      },
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    if (!data.session) {
      setSuccess("Conta criada! Verifique seu email para confirmar o acesso.")
      setIsLoading(false)
      return
    }

    router.push("/onboarding")
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-background">
      <div className="w-full h-screen grid lg:grid-cols-2">

        {/* Left Side - Visual & Branding */}
        <div className="relative hidden lg:flex h-full flex-col bg-sidebar-primary p-12 text-sidebar-primary-foreground dark:border-r">
          <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/20 via-sidebar-primary/10 to-transparent" />
          <div
            className="absolute inset-0 opacity-10 mix-blend-overlay"
            style={{ backgroundImage: "url(/pattern-bg.svg)" }}
          />

          <div className="relative z-20 flex items-center">
            <Image
              src="/logo-ia-four-sales-white.svg"
              alt="IA Four Sales"
              width={160}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </div>

          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-4">
              <p className="text-2xl font-medium leading-snug">
                &ldquo;Junte-se à revolução em vendas. Inteligência, eficiência e resultados em um só lugar.&rdquo;
              </p>
              <footer className="text-base font-normal opacity-80">
                CRM IA Four Sales 0.1
              </footer>
            </blockquote>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[450px]">

            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Crie sua conta
              </h1>
              <p className="text-sm text-muted-foreground">
                Preencha os dados abaixo para começar
              </p>
            </div>

            <div className="grid gap-6">
              {success ? (
                <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                  <div className="rounded-full bg-emerald-500/10 p-3">
                    <Mail className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-emerald-700">Conta criada com sucesso!</h3>
                    <p className="text-sm text-emerald-600/80">
                      {success}
                    </p>
                  </div>
                  <Link href="/entrar">
                    <Button variant="outline" className="w-full border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-700 mt-4">
                      Ir para o login
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={onSubmit}>
                  <div className="grid gap-5">

                    {/* Name Input */}
                    <div className="grid gap-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="name">
                        Nome completo
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground">
                          <User className="h-4 w-4" />
                        </div>
                        <Input
                          id="name"
                          placeholder="Seu nome"
                          type="text"
                          autoCapitalize="words"
                          autoComplete="name"
                          autoCorrect="off"
                          disabled={isLoading}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-9 h-11 bg-background/50 border-input/60 focus:border-sidebar-primary/50 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Company Input (Added for feature parity) */}
                    <div className="grid gap-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="company">
                        Nome da empresa
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground">
                          <Building className="h-4 w-4" />
                        </div>
                        <Input
                          id="company"
                          placeholder="Sua empresa"
                          type="text"
                          autoCapitalize="words"
                          autoComplete="organization"
                          autoCorrect="off"
                          disabled={isLoading}
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className="pl-9 h-11 bg-background/50 border-input/60 focus:border-sidebar-primary/50 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="grid gap-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                        Email
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                        </div>
                        <Input
                          id="email"
                          placeholder="nome@empresa.com"
                          type="email"
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect="off"
                          disabled={isLoading}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 h-11 bg-background/50 border-input/60 focus:border-sidebar-primary/50 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="grid gap-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                        Senha
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground">
                          <Lock className="h-4 w-4" />
                        </div>
                        <Input
                          id="password"
                          placeholder="••••••••"
                          type={showPassword ? "text" : "password"}
                          autoCapitalize="none"
                          autoComplete="new-password"
                          disabled={isLoading}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9 pr-9 h-11 bg-background/50 border-input/60 focus:border-sidebar-primary/50 transition-all duration-200"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:bg-transparent hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">Toggle password visibility</span>
                        </Button>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="text-sm text-destructive font-medium text-center bg-destructive/10 p-2 rounded-md">
                        {error}
                      </div>
                    )}

                    <Button disabled={isLoading} className="h-11 font-medium bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2">
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Criar conta
                    </Button>
                  </div>
                </form>
              )}

              {!success && (
                <div className="relative flex justify-center text-sm">
                  <span className="text-muted-foreground">
                    Já tem uma conta?{" "}
                    <Link href="/entrar" className="font-medium text-sidebar-primary hover:text-sidebar-primary/80 transition-colors">
                      Entrar
                    </Link>
                  </span>
                </div>
              )}

              <p className="px-8 text-center text-sm text-muted-foreground">
                Ao criar uma conta, você concorda com nossos{" "}
                <Link
                  href="/terms"
                  className="underline underline-offset-4 hover:text-sidebar-primary transition-colors"
                >
                  Termos de Serviço
                </Link>{" "}
                e{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-sidebar-primary transition-colors"
                >
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
