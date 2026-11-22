"use client";

import { useSetAtom } from "jotai";
import { useLayoutEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useImportWizard } from "@/hooks/useImportWizard";
import { emptyImportWizard, importWizardAtom } from "@/utils/atoms/import";
import { DoneStep } from "./DoneStep";
import { ImportSteps } from "./ImportSteps";
import { MapStep } from "./MapStep";
import { ReviewStep } from "./ReviewStep";
import { UploadStep } from "./UploadStep";

export function ImportWizard() {
  const setWizard = useSetAtom(importWizardAtom);
  const [visit, setVisit] = useState(0);
  useLayoutEffect(() => {
    setWizard(emptyImportWizard);
    setVisit((n) => n + 1);
  }, [setWizard]);
  return <Wizard key={visit} />;
}

function Wizard() {
  const controller = useImportWizard();
  const { wizard, error, summary } = controller;

  return (
    <>
      <ImportSteps step={wizard.step} />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {wizard.step === "upload" && <UploadStep readFile={controller.readFile} />}
      {wizard.step === "map" && <MapStep {...controller} />}
      {wizard.step === "preview" && wizard.preview && summary && (
        <ReviewStep {...controller} preview={wizard.preview} summary={summary} />
      )}
      {wizard.step === "done" && wizard.result && (
        <DoneStep result={wizard.result} reset={controller.reset} />
      )}
    </>
  );
}
