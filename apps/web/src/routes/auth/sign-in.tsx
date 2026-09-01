import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import PageTitle from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useGetConfig from "@/hooks/queries/config/use-get-config";
import useInstanceStatus from "@/hooks/queries/instance/use-instance-status";
import { AuthLayout } from "../../components/auth/layout";
import { ServerConnectionError } from "../../components/auth/server-connection-error";
import { SignInForm } from "../../components/auth/sign-in-form";
import { SignInFormSkeleton } from "../../components/auth/sign-in-form-skeleton";
import { AuthToggle } from "../../components/auth/toggle";

const signInSearchSchema = z.object({
  invitationId: z.string().optional(),
  email: z.string().optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth/sign-in")({
  component: SignIn,
  validateSearch: signInSearchSchema,
});

function SignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/sign-in" });
  const {
    data: config,
    isError: isConfigError,
    isFetching: isConfigFetching,
    isLoading: isConfigLoading,
    refetch: refetchConfig,
  } = useGetConfig();
  const {
    data: instanceStatus,
    isFetching: isInstanceStatusFetching,
    isLoading: isInstanceStatusLoading,
    isError: isInstanceStatusError,
    refetch: refetchInstanceStatus,
  } = useInstanceStatus();

  useEffect(() => {
    if (instanceStatus && instanceStatus.hasUsers === false) {
      navigate({ to: "/auth/sign-up", replace: true });
    }
  }, [instanceStatus, navigate]);

  const invitationId = search.invitationId;
  const defaultEmail = search.email;

  const getSafeRedirectPath = useCallback(() => {
    const redirectPath = search.redirect;
    if (redirectPath?.startsWith("/") && !redirectPath.includes("//")) {
      return redirectPath;
    }
    return undefined;
  }, [search.redirect]);

  const handleSignInSuccess = () => {
    const redirectPath = getSafeRedirectPath();
    if (redirectPath) {
      navigate({ to: redirectPath });
    } else if (invitationId) {
      navigate({ to: `/invitation/accept/${invitationId}` });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  const handleServerRetry = () => {
    void Promise.all([refetchConfig(), refetchInstanceStatus()]);
  };

  if (isConfigError || isInstanceStatusError) {
    return (
      <>
        <PageTitle title={t("auth:signIn.pageTitle")} />
        <AuthLayout
          title={t("auth:signIn.title")}
          subtitle={t("auth:signIn.subtitle")}
        >
          <ServerConnectionError
            isRetrying={isConfigFetching || isInstanceStatusFetching}
            onRetry={handleServerRetry}
          />
        </AuthLayout>
      </>
    );
  }

  // Treat "no users yet" as still loading so the skeleton stays visible
  // while the useEffect above redirects to /auth/sign-up. Otherwise the
  // form briefly paints before the redirect fires.
  if (
    isConfigLoading ||
    isInstanceStatusLoading ||
    instanceStatus?.hasUsers === false
  ) {
    return (
      <>
        <PageTitle title={t("auth:signIn.pageTitle")} />
        <AuthLayout
          title={t("auth:signIn.title")}
          subtitle={t("auth:signIn.subtitle")}
        >
          <SignInFormSkeleton />
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("auth:signIn.pageTitle")} />
      <AuthLayout
        title={t("auth:signIn.title")}
        subtitle={
          invitationId
            ? t("auth:signIn.invitationSubtitle")
            : t("auth:signIn.subtitle")
        }
      >
        <div className="mt-6">
          {invitationId && (
            <Alert className="mb-4">
              <AlertDescription>
                {t("auth:signIn.invitationAlert")}
              </AlertDescription>
            </Alert>
          )}

          <SignInForm
            defaultEmail={defaultEmail}
            onSuccess={handleSignInSuccess}
          />
          {config?.disableRegistration ? (
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                {t("auth:signIn.registrationDisabled")}
              </p>
            </div>
          ) : (
            <AuthToggle
              message={t("auth:signIn.toggleMessage")}
              linkText={t("auth:signIn.toggleLink")}
              linkTo="/auth/sign-up"
            />
          )}
        </div>
      </AuthLayout>
    </>
  );
}
