"use client";

import { useActionState } from "react";
import { signInWithPassword, type LoginState } from "../actions";

export function DemoLoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signInWithPassword,
    {},
  );

  return (
    <form action={action} className="mt-3 space-y-3">
      <label className="block text-sm">
        Correo
        <input
          name="email"
          type="email"
          required
          placeholder="padre1@tuli.test"
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Contraseña
        <input
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-foreground px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar con cuenta demo"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-high">
          {state.error}
        </p>
      )}
    </form>
  );
}
