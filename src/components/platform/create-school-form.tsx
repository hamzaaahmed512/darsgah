"use client";

import { useActionState } from "react";
import { createSchoolAction } from "@/app/(platform)/platform/actions";
import { normalizeEmail } from "@/lib/email";
import { sanitizeEnglishNameInput } from "@/lib/validation/names";

const initialState = { ok: false, error: "", errors: {} as Record<string, string[]> };

export function CreateSchoolForm() {
  const [state, action, pending] = useActionState(createSchoolAction, initialState);

  return (
    <form action={action} className="max-w-3xl rounded-[20px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
      {state.error && <div className="mb-6 rounded-xl bg-danger-soft p-4 text-sm font-bold text-danger">{state.error}</div>}
      
      <Section title="School details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="School name" name="name" placeholder="The Learning School" errors={state.errors?.name} />
          <Field label="URL slug" name="slug" placeholder="the-learning-school" hint="Spaces and capitals are converted automatically." errors={state.errors?.slug} />
          <Field label="Primary contact" name="contactName" placeholder="Contact name" errors={state.errors?.contactName} />
          <Field label="Contact email" name="contactEmail" type="email" placeholder="admin@school.edu" errors={state.errors?.contactEmail} />
          
          <label className="grid gap-2 text-xs font-bold text-ink">
            Timezone
            <select name="timezone" defaultValue="Asia/Karachi" className="platform-input">
              <option value="Asia/Karachi">Asia/Karachi</option>
              <option value="UTC">UTC</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Europe/London">Europe/London</option>
            </select>
            {state.errors?.timezone && <span className="text-danger">{state.errors.timezone[0]}</span>}
          </label>
        </div>
      </Section>
      
      <Section title="Initial principal account">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Principal name" name="principalName" placeholder="Full name" errors={state.errors?.principalName} />
          <Field label="Principal email" name="principalEmail" type="email" placeholder="principal@school.edu" errors={state.errors?.principalEmail} />
          
          <label className="grid gap-2 text-xs font-bold text-ink sm:col-span-2">
            <span>Temporary password<span className="ml-0.5 text-danger" aria-hidden="true">*</span></span>
            <input className="platform-input" required aria-required="true" minLength={12} name="temporaryPassword" type="password" autoComplete="new-password" placeholder="At least 12 characters" />
            <span className="font-normal text-muted">The principal must change this password on first sign-in.</span>
            {state.errors?.temporaryPassword && <span className="text-danger">{state.errors.temporaryPassword[0]}</span>}
          </label>
        </div>
      </Section>
      
      <Section title="Subscription">
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Initial access" name="platformStatus" options={[["trial", "Trial"], ["active", "Active"]]} />
          <Select label="Plan" name="subscriptionPlan" options={[["school", "Darsgah School"], ["network", "Darsgah Network"], ["custom", "Custom"]]} />
          <Select label="Billing status" name="billingStatus" options={[["trialing", "Trialing"], ["active", "Active"]]} />
          
          <label className="grid gap-2 text-xs font-bold text-ink">
            End or renewal date
            <input className="platform-input" name="subscriptionEndsAt" type="date" />
          </label>
        </div>
      </Section>
      
      <div className="flex justify-end border-t border-slate-200 pt-6">
        <button disabled={pending} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-button disabled:opacity-50">
          {pending ? "Creating..." : "Create school and principal"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-5 text-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, name, placeholder, type = "text", hint, errors }: { label: string; name: string; placeholder: string; type?: string; hint?: string; errors?: string[] }) {
  const required = ["name", "slug", "principalName", "principalEmail"].includes(name);
  return (
    <label className="grid gap-2 text-xs font-bold text-ink">
      <span>{label}{required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}</span>
      <input
        className="platform-input"
        required={required}
        aria-required={required}
        name={name}
        type={type}
        placeholder={placeholder}
        onChange={
          type === "email"
            ? (event) => {
                event.currentTarget.value = normalizeEmail(event.currentTarget.value);
              }
            : name === "contactName" || name === "principalName"
              ? (event) => {
                  event.currentTarget.value = sanitizeEnglishNameInput(event.currentTarget.value);
                }
              : undefined
        }
      />
      {errors && errors.length > 0 && <span className="text-danger">{errors[0]}</span>}
      {hint && !errors ? <span className="font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[][] }) {
  return (
    <label className="grid gap-2 text-xs font-bold text-ink">
      {label}
      <select className="platform-input" name={name}>
        {options.map(([value, text]) => (
          <option value={value} key={value}>{text}</option>
        ))}
      </select>
    </label>
  );
}
