import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/track";
import { getRecaptchaToken } from "@/lib/recaptcha";

const leadSchema = z.object({
  name: z.string().min(1, "Please enter your name").max(120),
  email: z.string().email("Please enter a valid email address").max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal("")),
  message: z.string().min(10, "Please add a few details (10+ characters)").max(5000),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

type Status = "idle" | "submitting" | "success" | "error";

export function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", email: "", phone: "", company: "", message: "" },
  });

  async function onSubmit(values: LeadFormValues) {
    setStatus("submitting");
    setErrorMessage("");
    try {
      const recaptchaToken = await getRecaptchaToken("contact");
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          recaptchaToken,
          sourcePage: typeof window !== "undefined" ? window.location.pathname : undefined,
          referrer: typeof document !== "undefined" ? document.referrer : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        // Fire conversion events to all configured trackers (GA4, Google
        // Ads, Meta Pixel, GTM dataLayer). Inert until env vars are set.
        track({ type: "lead_form_submit" });
        setStatus("success");
        reset();
      } else {
        setStatus("error");
        setErrorMessage(data?.error ?? `Server responded ${res.status}`);
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Network error — please try again");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-green-200 bg-green-50 p-6 text-green-900"
      >
        <h3 className="text-lg font-semibold">Thanks — we've got it</h3>
        <p className="mt-2 text-sm">
          A member of the team will be in touch within one business day. For anything urgent, give us
          a call on the number below.
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-medium underline"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-name">Name *</Label>
          <Input
            id="lead-name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lead-email">Email *</Label>
          <Input
            id="lead-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lead-phone">Phone</Label>
          <Input
            id="lead-phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lead-company">Company</Label>
          <Input
            id="lead-company"
            autoComplete="organization"
            aria-invalid={!!errors.company}
            {...register("company")}
          />
          {errors.company && (
            <p className="mt-1 text-sm text-destructive">{errors.company.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="lead-message">How can we help? *</Label>
        <Textarea
          id="lead-message"
          rows={6}
          aria-invalid={!!errors.message}
          {...register("message")}
        />
        {errors.message && (
          <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      {status === "error" && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Couldn't send your message — {errorMessage}. Please try again, or call us directly.
        </div>
      )}

      <Button type="submit" size="lg" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send message"}
      </Button>

      <p className="text-xs text-muted-foreground">
        By submitting, you consent to Interactive Displays Ireland storing your details to respond
        to your enquiry.
      </p>
    </form>
  );
}
