import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { AuthLayout } from "@/components/auth/layout";
import PageTitle from "@/components/page-title";
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

const formSchema = z.object({ email: z.email() });
type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const { t } = useTranslation();
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: FormValues) => {
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw new Error(error.message);
      toast.success(t("auth:forgotPassword.success"));
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("auth:forgotPassword.error"),
      );
    }
  };

  return (
    <>
      <PageTitle title={t("auth:forgotPassword.pageTitle")} />
      <AuthLayout
        title={t("auth:forgotPassword.title")}
        subtitle={t("auth:forgotPassword.subtitle")}
      >
        <Form {...form}>
          <form
            className="mt-6 space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth:forms.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder={t("auth:forms.emailPlaceholder")}
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
                ? t("auth:forgotPassword.submitting")
                : t("auth:forgotPassword.submit")}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              <Link
                to="/auth/sign-in"
                className="underline underline-offset-4 hover:text-foreground"
              >
                {t("auth:forgotPassword.backToSignIn")}
              </Link>
            </div>
          </form>
        </Form>
      </AuthLayout>
    </>
  );
}
