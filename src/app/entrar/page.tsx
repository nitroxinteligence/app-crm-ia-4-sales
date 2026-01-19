"use client"

import * as React from "react"
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { supabaseClient } from "@/lib/supabase/client"

export default function EntrarPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [showPassword, setShowPassword] = React.useState<boolean>(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/app/painel")
      }
    })
  }, [router])

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!email || !password) {
      setError("Preencha email e senha.")
      setIsLoading(false)
      return
    }

    const { error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    router.push("/app/painel")
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

          <div className="relative z-20 flex items-center text-lg font-bold tracking-tight">
            <div className="mr-2 h-8 w-8 rounded-lg bg-sidebar-primary-foreground text-sidebar-primary flex items-center justify-center">
              F
            </div>
            IA Four Sales
          </div>

          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-4">
              <p className="text-2xl font-medium leading-snug">
                &ldquo;A inteligência que faltava para escalar suas vendas e conectar sua equipe com eficiência máxima.&rdquo;
              </p>
              <footer className="text-base font-normal opacity-80">
                CRM IA Four Sales 0.1
              </footer>
            </blockquote>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[450px]">

            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Bem-vindo de volta
              </h1>
              <p className="text-sm text-muted-foreground">
                Entre com suas credenciais para acessar o painel
              </p>
            </div>

            <div className="grid gap-6">
              <form onSubmit={onSubmit}>
                <div className="grid gap-5">

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
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                        Senha
                      </label>
                      <Link
                        href="/recuperar-senha"
                        className="text-xs font-medium text-sidebar-primary hover:text-sidebar-primary/80 transition-colors"
                      >
                        Esqueceu sua senha?
                      </Link>
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <Input
                        id="password"
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        autoCapitalize="none"
                        autoComplete="current-password"
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

                  {/* Remember Me */}
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" className="rounded-[4px] border-input/60 data-[state=checked]:bg-sidebar-primary data-[state=checked]:border-sidebar-primary" />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground select-none"
                    >
                      Lembrar de mim por 30 dias
                    </label>
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
                    Entrar na Plataforma
                  </Button>
                </div>
              </form>

              <div className="relative flex justify-center text-sm">
                <span className="text-muted-foreground">
                  Não tem uma conta?{" "}
                  <Link href="/cadastro" className="font-medium text-sidebar-primary hover:text-sidebar-primary/80 transition-colors">
                    Cadastre-se
                  </Link>
                </span>
              </div>

              <p className="px-8 text-center text-sm text-muted-foreground">
                Ao clicar em entrar, você concorda com nossos{" "}
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
