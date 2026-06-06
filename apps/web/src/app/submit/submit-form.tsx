'use client';
import React, { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useT } from '@/contexts/language-context';

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(64, 'Name too long'),
  host: z.string()
    .min(1, 'Host is required')
    .max(253, 'Host too long')
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/,
      'Invalid hostname. Use only letters, numbers, dots, and hyphens.',
    ),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  type: z.enum(['JAVA', 'BEDROCK']),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  discordUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

const INITIAL: FormData = {
  name: '',
  host: '',
  port: undefined,
  type: 'JAVA',
  websiteUrl: '',
  discordUrl: '',
  contactEmail: '',
};

export function SubmitForm() {
  const t = useT();
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState('');

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormData;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setStatus('loading');
    setApiError('');

    try {
      const payload: Record<string, unknown> = {
        name: result.data.name,
        host: result.data.host,
        type: result.data.type,
        website: honeypot,
      };
      if (result.data.port) payload.port = result.data.port;
      if (result.data.websiteUrl) payload.websiteUrl = result.data.websiteUrl;
      if (result.data.discordUrl) payload.discordUrl = result.data.discordUrl;
      if (result.data.contactEmail) payload.contactEmail = result.data.contactEmail;

      await apiClient.submissions.submit(payload as unknown as Parameters<typeof apiClient.submissions.submit>[0]);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setApiError(err instanceof Error ? err.message : t.submit.failedToSubmit);
    }
  }

  if (status === 'success') {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t.submit.successTitle}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t.submit.successMsg}</p>
          <Button variant="secondary" onClick={() => { setStatus('idle'); setData(INITIAL); }}>
            {t.submit.submitAnother}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardContent className="pt-6 space-y-5">
          <Field label={t.submit.serverName} error={errors.name} required>
            <Input
              placeholder="My Awesome Server"
              value={data.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={64}
              disabled={status === 'loading'}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label={t.submit.hostIp} error={errors.host} required>
                <Input
                  placeholder="play.example.com"
                  value={data.host}
                  onChange={(e) => set('host', e.target.value.trim())}
                  disabled={status === 'loading'}
                />
              </Field>
            </div>
            <Field label={t.submit.port} error={errors.port}>
              <Input
                type="number"
                placeholder="25565"
                value={data.port ?? ''}
                onChange={(e) => set('port', e.target.value ? Number(e.target.value) : undefined)}
                min={1}
                max={65535}
                disabled={status === 'loading'}
              />
            </Field>
          </div>

          <Field label={t.submit.edition} required>
            <Select
              value={data.type}
              onValueChange={(v) => set('type', v as 'JAVA' | 'BEDROCK')}
              disabled={status === 'loading'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JAVA">{t.submit.javaEdition}</SelectItem>
                <SelectItem value="BEDROCK">{t.submit.bedrockEdition}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-4">{t.submit.optionalSection}</p>

            <div className="space-y-4">
              <Field label={t.submit.websiteUrl} error={errors.websiteUrl}>
                <Input
                  type="url"
                  placeholder="https://yourserver.com"
                  value={data.websiteUrl ?? ''}
                  onChange={(e) => set('websiteUrl', e.target.value.trim())}
                  disabled={status === 'loading'}
                />
              </Field>

              <Field label={t.submit.discordInvite} error={errors.discordUrl}>
                <Input
                  type="url"
                  placeholder="https://discord.gg/..."
                  value={data.discordUrl ?? ''}
                  onChange={(e) => set('discordUrl', e.target.value.trim())}
                  disabled={status === 'loading'}
                />
              </Field>

              <Field label={t.submit.contactEmail} error={errors.contactEmail}>
                <Input
                  type="email"
                  placeholder="admin@yourserver.com"
                  value={data.contactEmail ?? ''}
                  onChange={(e) => set('contactEmail', e.target.value.trim())}
                  disabled={status === 'loading'}
                />
              </Field>
            </div>
          </div>

          {/* Honeypot — hidden from real users */}
          <div className="hidden" aria-hidden="true">
            <Label htmlFor="website_url">Website</Label>
            <input
              id="website_url"
              name="website_url"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {status === 'error' && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t.submit.disclaimer}</p>

          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{t.submit.submitting}</>
            ) : (
              t.submit.submitBtn
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
