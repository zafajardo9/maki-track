import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { AuthLayout } from "@/components/auth/layout";
import PageTitle from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";

const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
});

type FormValues = {
  newPassword: string;
  confirmPassword: string;
};

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPassword,
  validateSearch: searchSchema,
});

function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/reset-password" });
  const formSchema = z
    .object({
      newPassword: z.string().min(8, t("auth:resetPassword.tooShort")),
      confirmPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth:resetPassword.mismatch"),
    });
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const token = search.token;
  const invalidLink = Boolean(search.error || !token);

  const onSubmit = async ({ newPassword }: FormValues) => {
    if (!token) return;
    try {
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) throw new Error(error.message);
      toast.success(t("auth:resetPassword.success"));
      await navigate({ to: "/auth/sign-in" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("auth:resetPassword.error"),
      );
    }
  };

  return (
    <>
      <PageTitle title={t("auth:resetPassword.pageTitle")} />
      <AuthLayout
        title={t("auth:resetPassword.title")}
        subtitle={t("auth:resetPassword.subtitle")}
      >
        {invalidLink ? (
          <div className="mt-6 space-y-4">
            <Alert variant="error">
              <AlertDescription>
                {t("auth:resetPassword.invalidLink")}
              </AlertDescription>
            </Alert>
            <div className="text-center text-sm text-muted-foreground">
              <Link
                to="/auth/sign-in"
                className="underline underline-offset-4 hover:text-foreground"
              >
                {t("auth:resetPassword.backToSignIn")}
              </Link>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              className="mt-6 space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth:resetPassword.newPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("auth:resetPassword.confirmPassword")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                className="w-full"
                size="sm"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? t("auth:resetPassword.submitting")
                  : t("auth:resetPassword.submit")}
              </Button>
            </form>
          </Form>
        )}
      </AuthLayout>
    </>
  );
}
