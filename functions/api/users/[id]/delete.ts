import type { EventContext } from "@cloudflare/workers-types";
import { isValidAdmin } from "../../_lib/auth";
import { tombstoneUser } from "../../_lib/ban";

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export async function onRequestDelete(context: EventContext<any, string, any>) {
  try {
    if (!(await isValidAdmin(context.env, context.request))) {
      return Response.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const id = paramStr(context.params.id);
    const db = context.env.DB;

    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    await tombstoneUser(db, id);
    await db
      .prepare("DELETE FROM listings WHERE json_extract(data, '$.userId') = ?")
      .bind(id)
      .run();

    return Response.json({ message: "User and their listings deleted" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
