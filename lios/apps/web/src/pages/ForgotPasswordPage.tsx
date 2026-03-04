import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError('Não foi possível enviar o e-mail de recuperação. Verifique o endereço.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-black px-4">
      <div className="w-full max-w-sm rounded-xl border border-brand-blue-dark bg-white/[0.02] p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-heading text-brand-blue tracking-tight">
            Carousel Creator
          </h1>
          <p className="text-sm font-subtitle text-brand-gray">
            Recuperar senha
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-center text-green-400">
              E-mail de recuperação enviado! Verifique sua caixa de entrada.
            </p>
            <Link
              to="/login"
              className="block text-center text-sm text-brand-blue hover:underline"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
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
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>

            <Link
              to="/login"
              className="block text-center text-sm text-brand-blue hover:underline"
            >
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
