import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { AuthLayout } from "@/components/auth/layout";
import { ServerConnectionError } from "@/components/auth/server-connection-error";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthToggle } from "@/components/auth/toggle";
import { Turnstile } from "@/components/auth/turnstile";
import PageTitle from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useGetConfig from "@/hooks/queries/config/use-get-config";
import useInstanceStatus from "@/hooks/queries/instance/use-instance-status";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;

const signUpSearchSchema = z.object({
  invitationId: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUp,
  validateSearch: signUpSearchSchema,
});

function SignUp() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/auth/sign-up" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);
  const captchaConfigured = Boolean(TURNSTILE_SITE_KEY);
  const {
    data: config,
    isError: isConfigError,
    isFetching: isConfigFetching,
    refetch: refetchConfig,
  } = useGetConfig();
  const {
    data: instanceStatus,
    isFetching: isInstanceStatusFetching,
    isError: isInstanceStatusError,
    refetch: refetchInstanceStatus,
  } = useInstanceStatus();

  const invitationId = search.invitationId;
  const prefillEmail = search.email;
  const isInstanceAdminSetup = instanceStatus?.hasUsers === false;

  if (isConfigError || isInstanceStatusError) {
    return (
      <>
        <PageTitle title={t("auth:signUp.pageTitle")} />
        <AuthLayout
          title={t("auth:signUp.title")}
          subtitle={t("auth:signUp.subtitleDefault")}
        >
          <ServerConnectionError
            isRetrying={isConfigFetching || isInstanceStatusFetching}
            onRetry={() => {
              void Promise.all([refetchConfig(), refetchInstanceStatus()]);
            }}
          />
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("auth:signUp.pageTitle")} />
      <AuthLayout
        title={
          isInstanceAdminSetup
            ? t("auth:signUp.instanceAdminTitle", {
                defaultValue: "Set up your Maki instance",
              })
            : t("auth:signUp.title")
        }
        subtitle={
          isInstanceAdminSetup
            ? t("auth:signUp.instanceAdminSubtitle", {
                defaultValue:
                  "This account becomes the instance administrator with full access.",
              })
            : invitationId
              ? t("auth:signUp.subtitleInvitation")
              : config?.disableRegistration
                ? t("auth:signUp.subtitleRegistrationDisabled")
                : t("auth:signUp.subtitleDefault")
        }
      >
        <div className="space-y-4 mt-6">
          {invitationId && (
            <Alert>
              <AlertDescription>
                {t("auth:signUp.invitationAlert")}
              </AlertDescription>
            </Alert>
          )}
          {config?.disableRegistration &&
            !invitationId &&
            !isInstanceAdminSetup && (
              <Alert>
                <AlertDescription>
                  {t("auth:signUp.registrationDisabledAlert")}
                </AlertDescription>
              </Alert>
            )}
          {(!config?.disableRegistration ||
            invitationId ||
            isInstanceAdminSetup) && (
            <SignUpForm
              invitationId={invitationId}
              defaultEmail={prefillEmail}
              turnstileToken={captchaConfigured ? turnstileToken : undefined}
            />
          )}
          {captchaConfigured && TURNSTILE_SITE_KEY && (
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              onError={handleTurnstileExpire}
            />
          )}
          {!isInstanceAdminSetup && (
            <AuthToggle
              message={t("auth:signUp.toggleMessage")}
              linkText={t("auth:signUp.toggleLink")}
              linkTo="/auth/sign-in"
            />
          )}
        </div>
      </AuthLayout>
    </>
  );
}
