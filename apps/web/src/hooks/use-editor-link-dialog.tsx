import type { Editor } from "@tiptap/react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type LinkRequest = {
  editor: Editor;
  from: number;
  to: number;
  doc: Editor["state"]["doc"];
};

export function useEditorLinkDialog(editor: Editor | null, canEdit: boolean) {
  const { t } = useTranslation();
  const [request, setRequest] = useState<LinkRequest | null>(null);
  const [url, setUrl] = useState("");
  const openLinkDialog = useCallback(
    (prefilledUrl?: string) => {
      if (!canEdit || !editor || editor.isDestroyed) return;
      setUrl(prefilledUrl || editor.getAttributes("link").href || "");
      setRequest({
        editor,
        from: editor.state.selection.from,
        to: editor.state.selection.to,
        doc: editor.state.doc,
      });
    },
    [canEdit, editor],
  );
  const linkDialog = (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open) setRequest(null);
      }}
    >
      <DialogPopup
        finalFocus={() =>
          editor && !editor.isDestroyed ? editor.view.dom : false
        }
      >
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            // A remote replacement must not apply the link to stale selection offsets.
            if (
              request &&
              canEdit &&
              editor === request.editor &&
              !editor.isDestroyed &&
              editor.state.doc.eq(request.doc)
            ) {
              const chain = editor
                .chain()
                .focus()
                .setTextSelection({ from: request.from, to: request.to })
                .extendMarkRange("link");
              if (url.trim()) chain.setLink({ href: url.trim() }).run();
              else chain.unsetLink().run();
            }
            setRequest(null);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("common:editorLink.title")}</DialogTitle>
            <DialogDescription>
              {t("common:editorLink.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <Input
              aria-label={t("common:editorLink.url")}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              autoComplete="url"
            />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("common:actions.cancel")}
            </DialogClose>
            <Button type="submit" disabled={!canEdit}>
              {t("common:editorLink.apply")}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
  return { openLinkDialog, linkDialog };
}
