"use client"

import { ColumnDef } from "@tanstack/react-table"

export type Timestamp = {
  time: string
  content: string
}

export const columns: ColumnDef<Timestamp>[] = [
  {
    accessorKey: "time",
    header: "Time",
  },
  {
    accessorKey: "content",
    header: "Content",
  },
]