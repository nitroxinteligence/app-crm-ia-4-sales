"use client"

import * as React from "react"
import { Loader2, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabaseClient } from "@/lib/supabase/client"

export default function RecuperarSenhaPage() {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isSuccess, setIsSuccess] = React.useState<boolean>(false)
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!email) {
      setError("Informe seu email.")
      setIsLoading(false)
      return
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const redirectTo = `${siteUrl}/atualizar-senha`

    const { error: authError } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    setIsSuccess(true)
    setIsLoading(false)
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-background">
      <div className="w-full h-screen grid lg:grid-cols-2">

        {/* Left Side - Visual & Branding */}
        <div className="relative hidden lg:flex h-full flex-col bg-sidebar-primary p-12 text-sidebar-primary-foreground dark:border-r">
          <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/20 via-sidebar-primary/10 to-transparent" />
          <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-10 mix-blend-overlay" />

          <div className="relative z-20 flex items-center text-lg font-bold tracking-tight">
            <div className="mr-2 h-8 w-8 rounded-lg bg-sidebar-primary-foreground text-sidebar-primary flex items-center justify-center">
              F
            </div>
            IA Four Sales
          </div>

          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-4">
              <p className="text-2xl font-medium leading-snug">
                &ldquo;Recupere o acesso à sua conta e continue sua jornada de vendas com inteligência.&rdquo;
              </p>
              <footer className="text-base font-normal opacity-80">
                CRM IA Four Sales 0.1
              </footer>
            </blockquote>
          </div>
        </div>

        {/* Right Side - Recovery Form */}
        <div className="relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[450px]">

            <Link
              href="/entrar"
              className="absolute top-4 left-4 md:top-8 md:left-8 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-sidebar-primary transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Link>

            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Recuperar Senha
              </h1>
              <p className="text-sm text-muted-foreground">
                Digite seu e-mail e enviaremos um link para redefinir sua senha
              </p>
            </div>

            <div className="grid gap-6">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-sidebar-primary/20 bg-sidebar-primary/5 p-6 text-center">
                  <div className="rounded-full bg-sidebar-primary/10 p-3">
                    <Mail className="h-6 w-6 text-sidebar-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-sidebar-primary">E-mail enviado!</h3>
                    <p className="text-sm text-muted-foreground">
                      Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                    </p>
                  </div>
                  <Button variant="outline" className="w-full border-sidebar-primary/20 hover:bg-sidebar-primary/5 hover:text-sidebar-primary" onClick={() => setIsSuccess(false)}>
                    Enviar novamente
                  </Button>
                </div>
              ) : (
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
                      Enviar link de recuperação
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
