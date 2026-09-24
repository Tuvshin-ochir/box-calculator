import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, toBoxPayload } from "../lib/api";
import {
  BoxItem,
  BoxVersion,
  Metrics,
  SavedBox,
  Simulation,
} from "../lib/types";

const emptyItem = (): BoxItem => ({ name: "", value: "", probabilityPpm: "" });
type ApiIssue = { message?: string } | string;
type ApiError = Error & {
  code?: string;
  errors?: ApiIssue[];
  warnings?: ApiIssue[];
  calculations?: Metrics;
};

type SharedBoxDraft = {
  name?: string;
  price?: string;
  items?: BoxItem[];
};

function readSharedBox(): SharedBoxDraft | null {
  if (typeof window === "undefined") return null;
  const encoded = new URLSearchParams(window.location.search).get("box");
  if (!encoded) return null;
  try {
    let parsed;
    try { parsed = JSON.parse(encoded); }
    catch { parsed = JSON.parse(decodeURIComponent(encoded)); }
    if (typeof parsed?.name !== "string" || typeof parsed?.price !== "string" ||
      !Array.isArray(parsed.items) || !parsed.items.every((item: BoxItem) =>
        item && typeof item.name === "string" && typeof item.value === "string" && typeof item.probabilityPpm === "string")) return null;
    return parsed as SharedBoxDraft;
  } catch {
    return null;
  }
}

function issueMessages(issues: ApiIssue[] | undefined, fallback: string) {
  const messages = (issues || [])
    .map((issue) => (typeof issue === "string" ? issue : issue.message))
    .filter((message): message is string => Boolean(message));
  return messages.length > 0 ? messages : fallback ? [fallback] : [];
}

function validationConnectionMessage(error: ApiError) {
  if (error.code === "BACKEND_UNAVAILABLE")
    return "Тооцооны сервертэй холбогдож чадсангүй. Backend server-ээ асаана уу.";
  if (error.code === "INVALID_SERVER_RESPONSE")
    return "Тооцооны сервер ойлгомжгүй хариу буцаалаа.";
  return error.message || "Тооцоог шалгах явцад алдаа гарлаа.";
}

export function useBoxCreator() {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [items, setItems] = useState<BoxItem[]>(
    [emptyItem()],
  );
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedBoxes, setSavedBoxes] = useState<SavedBox[]>([]);
  const [simulationResult, setSimulationResult] = useState<{ input: string; data: Simulation } | null>(null);
  const currentInput = JSON.stringify(toBoxPayload(name, price, items));
  const simulation = simulationResult?.input === currentInput ? simulationResult.data : null;
  const [isSimulating, setIsSimulating] = useState(false);
  const [versions, setVersions] = useState<BoxVersion[]>([]);
  const [versionsBoxId, setVersionsBoxId] = useState<string | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const validationRequest = useRef(0);
  const toastTimerRef = useRef<number | null>(null);

  const probabilityTotal = metrics?.totalPpm ?? 0;
  const isValid = errors.length === 0 && probabilityTotal === 1000000;
  const hasDraftInput = Boolean(
    name.trim() ||
    price.trim() ||
    items.some((item) =>
      [item.name, item.value, item.probabilityPpm].some((value) =>
        value.trim(),
      ),
    ),
  );

  useEffect(() => {
    void loadBoxes();
    async function loadShared() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      try {
        if (id) {
          const version = params.get("version");
          const box = await apiRequest<SavedBox>(`/api/boxes/${encodeURIComponent(id)}${version ? `?version=${encodeURIComponent(version)}` : ""}`);
          setEditingId(box._id);
          setName(box.name || "");
          setPrice(String(box.priceMnt));
          setItems(box.items.map((item) => ({ name: item.name, value: String(item.valueMnt), probabilityPpm: String(item.probabilityPpm) })));
          const history = await apiRequest<BoxVersion[]>(`/api/boxes/${encodeURIComponent(id)}/versions`);
          setVersions(history);
          setVersionsBoxId(id);
        } else {
          const shared = readSharedBox();
          if (shared) { setName(shared.name || ""); setPrice(shared.price || ""); setItems(shared.items || [emptyItem()]); }
        }
      } catch { setErrors(["Хуваалцсан box эсвэл хувилбарыг олсонгүй."]); }
    }
    void loadShared();
  }, []);

  useEffect(() => {
    if (!message) return;

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setMessage("");
    }, 2000);

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [message]);

  const validate = useCallback(async () => {
    const requestId = ++validationRequest.current;
    if (!hasDraftInput) {
      setMetrics(null);
      setErrors([]);
      setWarnings([]);
      return;
    }
    try {
      const result = await apiRequest<{
        calculations?: Metrics;
        errors?: { message: string }[];
        warnings?: { message: string }[];
      }>("/api/boxes/validate", {
        method: "POST",
        body: JSON.stringify(toBoxPayload(name, price, items)),
      });
      if (requestId !== validationRequest.current) return;
      setMetrics(result.calculations || null);
      setErrors(issueMessages(result.errors, ""));
      setWarnings(issueMessages(result.warnings, ""));
    } catch (error) {
      if (requestId !== validationRequest.current) return;
      const apiError = error as ApiError;
      setMetrics(apiError.calculations || null);
      setErrors(
        issueMessages(apiError.errors, validationConnectionMessage(apiError)),
      );
      setWarnings(issueMessages(apiError.warnings, ""));
    }
  }, [hasDraftInput, items, name, price]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void validate();
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [validate]);

  async function loadBoxes() {
    try {
      setSavedBoxes(await apiRequest<SavedBox[]>("/api/boxes"));
    } catch {
      // Validation communicates backend availability in the editor.
    }
  }

  function startNewBox() {
    setEditingId(null);
    setVersions([]);
    setVersionsBoxId(null);
    setName("");
    setPrice("");
    setItems([emptyItem()]);
    setMetrics(null);
    setErrors([]);
    setWarnings([]);
    setMessage("");
    setSimulationResult(null);
  }

  function editBox(box: SavedBox) {
    setEditingId(box._id);
    setName(box.name || "");
    setPrice(String(box.priceMnt));
    setItems(
      box.items.map((item) => ({
        name: item.name,
        value: String(item.valueMnt),
        probabilityPpm: String(item.probabilityPpm),
      })),
    );
    setMessage(`${box.name || "Untitled Box"} box-ийг засаж байна.`);
    setSimulationResult(null);
    void viewVersions(box._id);
  }

  async function viewVersions(boxId: string) {
    setIsLoadingVersions(true);
    try {
      setVersions(
        await apiRequest<BoxVersion[]>(`/api/boxes/${boxId}/versions`),
      );
      setVersionsBoxId(boxId);
    } catch (error) {
      const apiError = error as ApiError;
      setErrors(issueMessages(apiError.errors, "Хувилбаруудыг авч чадсангүй."));
    } finally {
      setIsLoadingVersions(false);
    }
  }

  function updateItem(index: number, field: keyof BoxItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
  }

  function replaceItems(importedItems: BoxItem[]) {
    setItems(importedItems);
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function persistDraft() {
    setMessage("");
    setIsSaving(true);
    try {
      const path = `/api/boxes${editingId ? `/${editingId}` : ""}`;
      const result = await apiRequest<{
        _id?: string;
        name?: string;
        currentVersion?: number;
        box?: { _id?: string; name?: string };
      }>(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(toBoxPayload(name, price, items)),
      });
      const savedId = result._id || result.box?._id;
      if (savedId) {
        setEditingId(savedId);
        setVersionsBoxId(savedId);
        void viewVersions(savedId);
      }
      const savedName =
        result.name || result.box?.name || name || "Untitled Box";
      setMessage(`${savedName} draft өөрчлөлт амжилттай хадгалагдлаа.`);
      await loadBoxes();
      return { name: savedName, id: savedId, version: result.currentVersion };
    } catch (error) {
      const apiError = error as ApiError;
      setErrors(
        issueMessages(
          apiError.errors,
          apiError.message || "Box хадгалагдсангүй.",
        ),
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    await persistDraft();
  }

  async function deleteBox(boxId: string) {
    if (!boxId) return;
    if (!window.confirm("Энэ box-ийг устгах уу?")) return;

    try {
      await apiRequest(`/api/boxes/${boxId}`, {
        method: "DELETE",
      });
      if (editingId === boxId) startNewBox();
      if (versionsBoxId === boxId) { setVersions([]); setVersionsBoxId(null); }
      setMessage("Box устгагдлаа.");
      await loadBoxes();
    } catch (error) {
      const apiError = error as ApiError;
      setErrors(
        issueMessages(
          apiError.errors,
          apiError.message || "Box устгагдсангүй.",
        ),
      );
    }
  }

  async function runSimulation() {
    setIsSimulating(true);
    try {
      const data = await apiRequest<Simulation>("/api/boxes/simulate", {
        method: "POST", body: currentInput,
      });
      setSimulationResult({ input: currentInput, data });
    } catch (error) {
      const apiError = error as ApiError;
      setErrors(
        issueMessages(
          apiError.errors,
          apiError.message || "Simulation ажиллуулж чадсангүй.",
        ),
      );
    } finally {
      setIsSimulating(false);
    }
  }

  async function shareBox() {
    const saved = await persistDraft();
    if (!saved?.id) return;
    await copyShareUrl(saved.id, saved.version);
  }

  async function copyShareUrl(id: string, version?: number) {
    const params = new URLSearchParams({ id });
    if (version) params.set("version", String(version));
    const url = `${window.location.origin}/?${params}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Хувилбарын URL clipboard-д хууллаа.");
    } catch { setMessage(url); }
  }

  function selectVersion(box: SavedBox, version: BoxVersion) {
    editBox({ ...box, ...version });
    setMessage(`v${version.versionNumber} хувилбарыг нээлээ. Хадгалбал шинэ хувилбар үүснэ.`);
  }

  return {
    name,
    price,
    items,
    editingId,
    metrics,
    errors,
    warnings,
    message,
    isSaving,
    savedBoxes,
    isValid,
    probabilityTotal,
    simulation,
    isSimulating,
    setName,
    setPrice,
    updateItem,
    addItem,
    replaceItems,
    removeItem,
    startNewBox,
    editBox,
    saveDraft,
    deleteBox,
    runSimulation,
    shareBox,
    copyShareUrl,
    selectVersion,
    versions,
    versionsBoxId,
    isLoadingVersions,
    viewVersions,
  };
}
