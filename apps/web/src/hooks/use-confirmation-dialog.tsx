import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Confirmation = {
  title: string;
  description: string;
  action: string;
  destructive?: boolean;
};

export function useConfirmationDialog() {
  const { t } = useTranslation();
  const [request, setRequest] = useState<Confirmation | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const settle = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setRequest(null);
  }, []);
  useEffect(
    () => () => {
      resolveRef.current?.(false);
    },
    [],
  );
  const confirm = useCallback(
    (options: Confirmation) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setRequest(options);
      }),
    [],
  );
  const confirmationDialog = (
    <AlertDialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {request?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            {t("common:actions.cancel")}
          </AlertDialogClose>
          <Button
            type="button"
            variant={request?.destructive ? "destructive" : "default"}
            onClick={() => settle(true)}
          >
            {request?.action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
  return { confirm, confirmationDialog };
}
