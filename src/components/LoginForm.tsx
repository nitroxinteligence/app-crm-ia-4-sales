"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const validateEmail = (value: string) =>
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!validateEmail(email)) {
            setError("Formato de e‑mail inválido.");
            return;
        }
        if (password.length < 6) {
            setError("A senha deve ter ao menos 6 caracteres.");
            return;
        }
        // Simulação de login – redireciona para a página inicial
        router.push("/");
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 w-full max-w-sm mx-auto p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-md"
        >
            <h2 className="text-2xl font-semibold text-center mb-4">Login</h2>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <input
                type="email"
                placeholder="E‑mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
            />
            <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
            />
            <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded transition-colors"
            >
                Entrar
            </button>
        </form>
    );
}
