import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, KeyRound } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { InlineAlert } from '@/components/ui/Feedback';
import { useAuthStore } from '@/store/auth';
import { errorMessage } from '@/api/client';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import { loginSchema, type LoginValues } from '@/lib/schemas';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setServerError(errorMessage(e, 'Sign in failed'));
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your evidence workspace."
      footer={
        <>
          New to ImpactLens?{' '}
          <Link to="/register" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {serverError && (
          <InlineAlert tone="error" title="Couldn’t sign you in">
            {serverError}
          </InlineAlert>
        )}
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@organization.org" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="mt-1 w-full">
          Sign in <ArrowRight />
        </Button>
      </form>

      <section aria-labelledby="demo-heading" className="mt-8 rounded-lg border border-dashed border-line-hover bg-surface p-4">
        <h2 id="demo-heading" className="flex items-center gap-2 font-sans text-meta font-semibold">
          <KeyRound className="size-4 text-ink-3" aria-hidden /> Demo accounts
        </h2>
        <p className="mt-1 text-label text-ink-3">Created by <code className="font-mono">npm run seed</code>. Pick one to fill the form.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setValue('email', a.email, { shouldValidate: true });
                setValue('password', a.password, { shouldValidate: true });
              }}
              className="touch-target rounded-md border border-line bg-surface px-2 py-2 text-left transition-colors hover:border-accent hover:bg-accent-soft"
            >
              <span className="block text-meta font-semibold">{a.label}</span>
              <span className="block text-label text-ink-3">{a.hint}</span>
            </button>
          ))}
        </div>
      </section>
    </AuthLayout>
  );
}
