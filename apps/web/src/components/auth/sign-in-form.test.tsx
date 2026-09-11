import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./sign-in-form";

const mocks = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { email: mocks.signInEmail } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderForm() {
  const { container } = render(<SignInForm onSuccess={vi.fn()} />);

  // Queried by type rather than by label: the password input sits inside a
  // wrapper div (for the show/hide button), so the form-control id lands on
  // that div and the visible label is not associated with the input.
  const email = container.querySelector('input[type="email"]');
  const password = container.querySelector('input[type="password"]');
  if (!email || !password) {
    throw new Error("sign-in inputs were not rendered");
  }

  fireEvent.change(email, { target: { value: "ada@example.com" } });
  fireEvent.change(password, { target: { value: "correct-horse" } });

  return screen.getByRole("button", { name: "auth:signInForm.signIn" });
}

async function submit(submitButton: HTMLElement) {
  fireEvent.click(submitButton);
  await waitFor(() => expect(mocks.signInEmail).toHaveBeenCalled());
}

describe("SignInForm remember me", () => {
  // No automatic cleanup is configured in this repo, so a second render would
  // otherwise leave two forms in the document.
  afterEach(cleanup);

  beforeEach(() => {
    mocks.signInEmail.mockReset();
    mocks.signInEmail.mockResolvedValue({ error: null });
  });

  it("asks to be remembered by default", async () => {
    await submit(renderForm());

    expect(mocks.signInEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct-horse",
      rememberMe: true,
    });
  });

  it("sends rememberMe false when the box is cleared", async () => {
    const submitButton = renderForm();

    const checkbox = screen.getByRole("checkbox", {
      name: "auth:signInForm.rememberMe",
    });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    await submit(submitButton);

    expect(mocks.signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ rememberMe: false }),
    );
  });
});
