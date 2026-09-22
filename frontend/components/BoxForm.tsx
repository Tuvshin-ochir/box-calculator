import { ChangeEvent, useState } from "react";
import { Download, Link, Plus, Trash2, Upload } from "lucide-react";
import { createItemsCsv, parseItemsCsv } from "../lib/csv";
import { BoxItem } from "../lib/types";
import { Button, buttonVariants } from "./ui/button";

type BoxFormProps = {
  name: string;
  price: string;
  items: BoxItem[];
  editingId: string | null;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onItemChange: (index: number, field: keyof BoxItem, value: string) => void;
  onAddItem: () => void;
  onReplaceItems: (items: BoxItem[]) => void;
  onRemoveItem: (index: number) => void;
  onShare: () => void;
};

const formatNumber = (value: string | number) => {
  const cleanValue = String(value).replace(/[^0-9]/g, "");
  return cleanValue ? Number(cleanValue).toLocaleString("en-US") : "";
};

const formatProbabilityPercent = (value: string | number) => {
  const ppm = Number(String(value).replace(/[^0-9]/g, ""));
  return `${(ppm / 10000).toFixed(2)}%`;
};

export default function BoxForm({
  name,
  price,
  items,
  editingId,
  isSaving,
  onNameChange,
  onPriceChange,
  onItemChange,
  onAddItem,
  onReplaceItems,
  onRemoveItem,
  onShare,
}: BoxFormProps) {
  const [csvItems, setCsvItems] = useState<BoxItem[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  function handleCsvSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseItemsCsv(String(reader.result || ""));
      setCsvItems(result.errors.length === 0 ? result.items : null);
      setCsvErrors(result.errors);
    };
    reader.readAsText(file);
  }

  function exportCsv() {
    const file = new Blob([createItemsCsv(items)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "box-items.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel editor-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">01 / BOX CONFIGURATION</p>
          <h2>Box-ийн үндсэн мэдээлэл</h2>
          <p className="panel-description">
            Үнэ болон шагналын магадлалыг оруулна. Backend бүх тооцооллыг
            автоматаар шалгана.
          </p>
        </div>
        <span className="currency-chip">MNT / PPM</span>
      </div>
      <div className="box-details">
        <label>
          Box нэр
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Жишээ: Founder’s First Drop"
          />
        </label>
        <label>
          Үнэ <small>MNT, бүхэл тоо</small>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(price)}
            onChange={(event) =>
              onPriceChange(event.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="100,000"
          />
        </label>
      </div>
      <section className="box-contents">
        <div className="items-heading">
          <div>
            <p className="section-kicker">BOX ДОТОРХ БАРААНУУД</p>
            <h2>Энэ box-ийн шагналууд</h2>
            <p className="field-help">
              Энд нэмсэн item бүр энэ box-ийн нийт магадлал, EV, RTP тооцоололд
              шууд орно. Нийт PPM нь <strong>1,000,000</strong> байх ёстой.
            </p>
          </div>
          <div className="item-actions">
            <label
              className={`${buttonVariants({ variant: "outline", size: "sm" })} file-button`}
            >
              <Upload size={15} />
              CSV оруулах
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvSelect}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={exportCsv}
            >
              <Download size={15} />
              CSV татах
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={onShare}>
              <Link size={15} />
              URL хуваалцах
            </Button>
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={onAddItem}
            >
              <Plus size={16} />
              Item нэмэх
            </Button>
          </div>
        </div>
        {csvErrors.length > 0 && (
          <div className="csv-errors">
            <strong>CSV import хийгдээгүй:</strong>
            {csvErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
        {csvItems && (
          <div className="csv-preview">
            <strong>{csvItems.length} item import хийхэд бэлэн</strong>
            <span>
              {csvItems
                .slice(0, 3)
                .map((item) => item.name || "Unnamed")
                .join(", ")}
              {csvItems.length > 3 ? " …" : ""}
            </span>
            <div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => {
                  onReplaceItems(csvItems);
                  setCsvItems(null);
                }}
              >
                Нэмэхийг зөвшөөрөх
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setCsvItems(null)}
              >
                Цуцлах
              </Button>
            </div>
          </div>
        )}
        <div className="item-table">
          <div className="table-head">
            <span>Шагналын нэр</span>
            <span>Үнэ (MNT)</span>
            <span>Магадлал (PPM)</span>
            <span />
          </div>
          {items.map((item, index) => (
            <div className="item-row" key={index}>
              <input
                aria-label={`Item ${index + 1} name`}
                value={item.name}
                onChange={(event) =>
                  onItemChange(index, "name", event.target.value)
                }
                placeholder="Шагналын нэр"
              />
              <input
                aria-label={`Item ${index + 1} value`}
                type="text"
                inputMode="numeric"
                value={formatNumber(item.value)}
                onChange={(event) =>
                  onItemChange(
                    index,
                    "value",
                    event.target.value.replace(/[^0-9]/g, ""),
                  )
                }
                placeholder="0"
              />
              <span className="probability-cell">
                <input
                  aria-label={`Item ${index + 1} probability`}
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(item.probabilityPpm)}
                  onChange={(event) =>
                    onItemChange(
                      index,
                      "probabilityPpm",
                      event.target.value.replace(/[^0-9]/g, ""),
                    )
                  }
                  placeholder="0"
                />
                <small className="probability-percent">
                  {formatProbabilityPercent(item.probabilityPpm)} chance
                </small>
              </span>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`${index + 1}-р item устгах`}
                title="Item устгах"
                onClick={() => onRemoveItem(index)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </section>
      <div className="action-row">
        <div>
          <strong>Хадгалахад бэлэн үү?</strong>
          <span>
            Тооцооны шалгалтын хариуг хараад draft хувилбараа хадгална.
          </span>
        </div>
        <Button
          className="primary-button"
          size="lg"
          type="submit"
          disabled={isSaving}
        >
          {isSaving
            ? "Хадгалж байна..."
            : editingId
              ? "Өөрчлөлт хадгалах"
              : "Draft хадгалах"}
        </Button>

      </div>
    </section>
  );
}
