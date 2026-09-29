import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { InlineAlert } from '@/components/ui/Feedback';
import { useAuthStore } from '@/store/auth';
import { errorMessage } from '@/api/client';
import { registerSchema, type RegisterValues } from '@/lib/schemas';

export default function RegisterPage() {
  const registerUser = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '', confirm: '' } });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setServerError(null);
    try {
      await registerUser(name, email, password);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setServerError(errorMessage(e, 'Registration failed'));
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Organize field media into traceable evidence."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-3.5">
        {serverError && (
          <InlineAlert tone="error" title="Couldn’t create the account">
            {serverError}
          </InlineAlert>
        )}
        <Field label="Full name" error={errors.name?.message}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Work email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Password" error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </Field>
          <Field label="Confirm password" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirm')} />
          </Field>
        </div>
        {!errors.password && <p className="-mt-1.5 text-meta text-ink-3">8+ characters with upper- and lowercase letters and a number.</p>}
        <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="mt-1 w-full">
          Create account
        </Button>
        <p className="flex gap-1.5 text-meta text-ink-3">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          The first account becomes an administrator; later accounts join as read-only viewers.
        </p>
      </form>
    </AuthLayout>
  );
}
