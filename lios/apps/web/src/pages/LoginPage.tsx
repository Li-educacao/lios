import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }

    navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-black px-4">
      <div className="w-full max-w-sm rounded-xl border border-brand-blue-dark bg-white/[0.02] p-8 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-heading text-brand-blue tracking-tight">
            Carousel Creator
          </h1>
          <p className="text-sm font-subtitle text-brand-gray">
            Acesse sua conta
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="E-mail"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />

          <Input
            id="password"
            type="password"
            label="Senha"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <p className="text-sm text-center text-red-500">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <Link
            to="/forgot-password"
            className="block text-center text-sm text-brand-blue hover:underline"
          >
            Esqueci minha senha
          </Link>
        </form>
      </div>
    </div>
  );
}
