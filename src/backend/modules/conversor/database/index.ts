import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

const staticNodesDb = drizzle(
  new URL("./nodes.sqlite", import.meta.url).toString(),
  { schema }
)

export default staticNodesDb
export * from "./schema"
