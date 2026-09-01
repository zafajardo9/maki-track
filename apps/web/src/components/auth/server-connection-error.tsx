import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ServerConnectionErrorProps = {
  isRetrying: boolean;
  onRetry: () => void;
};

export function ServerConnectionError({
  isRetrying,
  onRetry,
}: ServerConnectionErrorProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-6 space-y-3">
      <Alert variant="error">
        <AlertTitle>{t("common:error.title")}</AlertTitle>
        <AlertDescription>
          {t("common:error.messages.network")}
        </AlertDescription>
      </Alert>
      <Button
        className="w-full"
        loading={isRetrying}
        onClick={onRetry}
        size="sm"
        variant="outline"
      >
        {t("common:error.tryAgain")}
      </Button>
    </div>
  );
}
