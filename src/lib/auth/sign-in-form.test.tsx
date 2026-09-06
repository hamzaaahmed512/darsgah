import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SignInPage from "@/app/(auth)/sign-in/page";

const { signIn, replace, refresh } = vi.hoisted(() => ({ signIn: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/app/(auth)/sign-in/actions", () => ({ signInAction: signIn }));
vi.stubGlobal("React", React);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("keeps sign-in fields available for retry after rejected credentials", async () => {
  signIn.mockResolvedValue({ error: "Invalid login credentials" });
  render(<SignInPage />);
  const email = screen.getByLabelText("Email address") as HTMLInputElement;
  const password = screen.getByLabelText("Password") as HTMLInputElement;
  fireEvent.change(email, { target: { value: "Teacher@Example.com" } });
  fireEvent.change(password, { target: { value: "example-password" } });
  const form = email.closest("form")!;
  expect(fireEvent.submit(form)).toBe(false);
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Invalid login credentials"));
  expect(email.value).toBe("teacher@example.com");
  expect(password.value).toBe("example-password");
  expect(replace).not.toHaveBeenCalled();
  await waitFor(() => expect((screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement).disabled).toBe(false));
  signIn.mockResolvedValue({ destination: "/dashboard" });
  fireEvent.change(password, { target: { value: "corrected-password" } });
  fireEvent.submit(form);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  expect(signIn.mock.lastCall?.[0].password).toBe("corrected-password");
  expect(refresh).toHaveBeenCalled();
});
