import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
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
import useChangePassword from "@/hooks/mutations/use-change-password";
import { toast } from "@/lib/toast";

type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ChangePasswordCard() {
  const { t } = useTranslation();
  const { mutateAsync: changePassword, isPending } = useChangePassword();
  const [showPassword, setShowPassword] = useState(false);

  const passwordSchema = z
    .object({
      currentPassword: z
        .string()
        .min(
          1,
          t("settings:informationPage.changePassword.validation.required"),
        ),
      newPassword: z.string().min(8, {
        message: t(
          "settings:informationPage.changePassword.validation.tooShort",
        ),
      }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("settings:informationPage.changePassword.validation.mismatch"),
    });

  const form = useForm<ChangePasswordValues>({
    resolver: standardSchemaResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.reset();
      toast.success(t("settings:informationPage.changePassword.success"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:informationPage.changePassword.error"),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-md font-medium">
          {t("settings:informationPage.changePassword.sectionTitle")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("settings:informationPage.changePassword.sectionSubtitle")}
        </p>
      </div>

      <div className="space-y-4 border border-border rounded-md p-4 bg-sidebar">
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <FormLabel className="text-sm font-medium">
                      {t(
                        "settings:informationPage.changePassword.currentPassword",
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="w-full sm:w-48"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <FormLabel className="text-sm font-medium">
                      {t("settings:informationPage.changePassword.newPassword")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="w-full sm:w-48"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <FormLabel className="text-sm font-medium">
                      {t(
                        "settings:informationPage.changePassword.confirmPassword",
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="w-full sm:w-48"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
              >
                {t(
                  showPassword
                    ? "settings:informationPage.changePassword.hide"
                    : "settings:informationPage.changePassword.show",
                )}
              </Button>
              <Button size="sm" type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending
                  ? t("settings:informationPage.changePassword.updating")
                  : t("settings:informationPage.changePassword.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
