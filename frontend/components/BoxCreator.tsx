"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import BoxForm from "./BoxForm";
import BoxReview from "./BoxReview";
import SavedBoxes from "./SavedBoxes";
import SavedBoxMenu from "./SavedBoxMenu";
import { Button } from "./ui/button";
import { useBoxCreator } from "../hooks/useBoxCreator";

export default function BoxCreator() {
  const editor = useBoxCreator();
  const savedBoxesRef = useRef<HTMLElement>(null);

  function selectSavedBox(box: Parameters<typeof editor.editBox>[0]) {
    editor.editBox(box);
    savedBoxesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BOX OPERATIONS / CREATOR</p>
          <h1>Box үүсгэх хяналтын самбар</h1>
          <p className="page-intro">
            1. Шагналуудаа оруул · 2. PPM болон ашигт ажиллагааг шалга · 3.
            Draft хувилбараа хадгал.
          </p>
          <div className="workflow-steps">
            <span>1. Configure</span>
            <span>2. Validate</span>
            <span>3. Save draft</span>
          </div>
          <SavedBoxMenu boxes={editor.savedBoxes} onSelect={editor.editBox} />
        </div>
        <Button
          variant="secondary"
          className="new-box-button"
          type="button"
          onClick={editor.startNewBox}
        >
          <Plus size={16} />
          Шинэ box
        </Button>
      </header>
      {editor.message && (
        <div className="toast" role="status" aria-live="polite">
          {editor.message}
        </div>
      )}
      <form className="editor-grid" onSubmit={editor.saveDraft}>
        <BoxForm
          {...editor}
          isValid={editor.isValid}
          onNameChange={editor.setName}
          onPriceChange={editor.setPrice}
          onItemChange={editor.updateItem}
          onAddItem={editor.addItem}
          onReplaceItems={editor.replaceItems}
          onRemoveItem={editor.removeItem}
          onPublish={editor.publishBox}
          onShare={editor.shareBox}
        />
        <BoxReview
          metrics={editor.metrics}
          errors={editor.errors}
          warnings={editor.warnings}
          isValid={editor.isValid}
          simulation={editor.simulation}
          isSimulating={editor.isSimulating}
          canSimulate={Boolean(editor.editingId)}
          onSimulate={editor.runSimulation}
        />
      </form>
      <SavedBoxes
        boxes={editor.savedBoxes}
        onSelect={selectSavedBox}
        onDelete={editor.deleteBox}
        versions={editor.versions}
        versionsBoxId={editor.versionsBoxId}
        sectionRef={savedBoxesRef}
      />
    </main>
  );
}
