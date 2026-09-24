import { RefObject } from "react";
import { BoxVersion, SavedBox } from "../lib/types";
import { Button } from "./ui/button";

type SavedBoxesProps = {
  boxes: SavedBox[];
  onSelect: (box: SavedBox) => void;
  onDelete: (boxId: string) => void;
  onSelectVersion: (box: SavedBox, version: BoxVersion) => void;
  onShareVersion: (id: string, version: number) => void;
  versions: BoxVersion[];
  versionsBoxId: string | null;
  sectionRef?: RefObject<HTMLElement | null>;
};

export default function SavedBoxes({
  boxes,
  onSelect,
  onDelete,
  onSelectVersion,
  onShareVersion,
  versions,
  versionsBoxId,
  sectionRef,
}: SavedBoxesProps) {
  return (
    <section ref={sectionRef} className="panel saved-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">04 / SAVED BOXES</p>
          <h2>Хадгалсан box-ууд</h2>
        </div>
        <span className="muted-label">{boxes.length} хадгалсан</span>
      </div>
      {boxes.length === 0 ? (
        <p className="empty-state">
          Одоогоор хадгалсан box алга. Дээрх талбарыг бөглөж draft хадгална уу.
        </p>
      ) : (
        <div className="saved-list">
          {boxes.map((box) => (
            <div key={box._id}>
              <div className="saved-box-row">
                <Button
                  variant="outline"
                  className="saved-box"
                  type="button"
                  onClick={() => onSelect(box)}
                >
                  <span>
                    <strong>{box.name || "Untitled Box"}</strong>
                    <small>
                      {box.priceMnt.toLocaleString()} MNT · {box.items.length}{" "}
                      item
                    </small>
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="saved-box-delete"
                  onClick={() => onDelete(box._id)}
                  aria-label={`${box.name || "Untitled Box"} устгах`}
                >
                  Устгах
                </Button>
              </div>
              {versionsBoxId === box._id && (
                <div className="version-list">
                  {versions.map((version) => (
                    <div className="version-row" key={version.versionNumber}>
                      <div className="version-info">
                        <div className="version-heading">
                          <strong className="version-badge">v{version.versionNumber}</strong>
                          <span>{version.priceMnt.toLocaleString()} ₮ · {version.items.length} item</span>
                        </div>
                        <div className="version-metrics">
                          <span>EV <b>{version.calculations?.expectedValueMnt?.toLocaleString() ?? "--"} ₮</b></span>
                          <span>RTP <b>{version.calculations?.rtpPercent ?? "--"}%</b></span>
                        </div>
                        {version.createdAt && (
                          <time className="version-date" dateTime={version.createdAt}>
                            {new Date(version.createdAt).toLocaleString("mn-MN", {
                              year: "numeric", month: "2-digit", day: "2-digit",
                              hour: "2-digit", minute: "2-digit", hour12: false,
                            })}
                          </time>
                        )}
                      </div>
                      <div className="version-actions">
                        <Button size="sm" variant="outline" onClick={() => onSelectVersion(box, version)} aria-label={`v${version.versionNumber} нээх`}>Нээх</Button>
                        <Button size="sm" variant="secondary" onClick={() => onShareVersion(box._id, version.versionNumber)} aria-label={`v${version.versionNumber} URL хуулах`}>URL хуулах</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
