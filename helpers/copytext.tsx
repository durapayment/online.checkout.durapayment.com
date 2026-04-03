import { addToast } from "@heroui/toast";

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    addToast?.({ title: "Copied to clipboard!", color: "success" });
  } catch {
    addToast?.({ title: "Failed to copy", color: "danger" });
  }
};
