import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SavedBox } from "../lib/types";
import { Button } from "./ui/button";

type SavedBoxMenuProps = {
  boxes: SavedBox[];
  onSelect: (box: SavedBox) => void;
};

export default function SavedBoxMenu({ boxes, onSelect }: SavedBoxMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  function selectBox(box: SavedBox) {
    onSelect(box);
    setIsOpen(false);
  }

  return (
    <div className="saved-box-menu">
      <Button
        variant="outline"
        size="sm"
        className="saved-menu-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        Saved boxes <span>{boxes.length}</span>
        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </Button>
      {isOpen && (
        <div className="saved-menu-dropdown">
          {boxes.length === 0 ? (
            <p className="saved-menu-empty">Одоогоор хадгалсан box алга.</p>
          ) : (
            boxes.map((box) => (
              <Button
                variant="ghost"
                className="saved-menu-item"
                key={box._id}
                onClick={() => selectBox(box)}
              >
                <span>{box.name || "Untitled Box"}</span>
              </Button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
