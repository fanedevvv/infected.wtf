import { unlink } from "fs/promises";
import path from "path";

export const LINK_ICON_DIR = "uploads/link-icons";

/** Delete a custom link logo from disk; ignores anything outside the link-icons folder. */
export async function removeLinkIconFile(relPath: string | null | undefined) {
  if (!relPath?.startsWith(`${LINK_ICON_DIR}/`)) return;
  await unlink(path.join(process.cwd(), "public", relPath)).catch(() => {});
}
