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
    return JSON.parse(decodeURIComponent(encoded)) as SharedBoxDraft;
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
  const sharedBox = readSharedBox();
  const [name, setName] = useState(sharedBox?.name ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [price, setPrice] = useState(sharedBox?.price ?? "");
  const [items, setItems] = useState<BoxItem[]>(
    sharedBox?.items?.length ? sharedBox.items : [emptyItem()],
  );
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedBoxes, setSavedBoxes] = useState<SavedBox[]>([]);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
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
    setSimulation(null);
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
    setSimulation(null);
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
      return savedName;
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

  async function publishBox() {
    if (!editingId || !isValid) return;
    setIsSaving(true);
    try {
      const result = await apiRequest<{
        _id?: string;
        name?: string;
        status?: "DRAFT" | "LIVE";
      }>(`/api/boxes/${editingId}/publish`, {
        method: "POST",
      });

      setMessage(`${result.name || name || "Untitled Box"} box LIVE боллоо.`);
      await loadBoxes();
      return result;
    } catch (error) {
      const apiError = error as ApiError;
      setErrors(
        issueMessages(
          apiError.errors,
          apiError.message || "Box LIVE болгох боломжгүй байна.",
        ),
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteBox(boxId: string) {
    if (!boxId) return;
    if (!window.confirm("Энэ box-ийг устгах уу?")) return;

    const previousSavedBoxes = savedBoxes;
    const previousVersions = versions;
    const previousVersionsBoxId = versionsBoxId;
    const previousEditingId = editingId;

    setSavedBoxes((current) => current.filter((box) => box._id !== boxId));
    setVersions((current) => (versionsBoxId === boxId ? [] : current));
    setVersionsBoxId((current) => (current === boxId ? null : current));

    if (editingId === boxId) {
      startNewBox();
    }

    setMessage("Box устгагдлаа.");

    try {
      await apiRequest(`/api/boxes/${boxId}`, {
        method: "DELETE",
      });
      await loadBoxes();
    } catch (error) {
      setSavedBoxes(previousSavedBoxes);
      setVersions(previousVersions);
      setVersionsBoxId(previousVersionsBoxId);
      if (previousEditingId === boxId) {
        setEditingId(previousEditingId);
      }

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
    if (!editingId) return;
    setIsSimulating(true);
    try {
      setSimulation(
        await apiRequest<Simulation>(`/api/boxes/${editingId}/simulate`, {
          method: "POST",
        }),
      );
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
    const persistedName = await persistDraft();
    const params = new URLSearchParams({
      box: encodeURIComponent(JSON.stringify({ name, price, items })),
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage(
        persistedName
          ? `${persistedName} draft өөрчлөлт амжилттай хадгалагдлаа. URL clipboard-д хууллаа.`
          : "URL clipboard-д хууллаа.",
      );
    } catch {
      setMessage(
        persistedName
          ? `${persistedName} draft өөрчлөлт амжилттай хадгалагдлаа. ${shareUrl}`
          : shareUrl,
      );
    }
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
    publishBox,
    deleteBox,
    runSimulation,
    shareBox,
    versions,
    versionsBoxId,
    isLoadingVersions,
    viewVersions,
  };
}
