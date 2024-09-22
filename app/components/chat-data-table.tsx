"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TooltipProvider, TooltipTrigger, TooltipContent,Tooltip } from "@/components/ui/tooltip"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onHighlightEnter: (text: string) => void
}

export function DataTableWithHighlight<TData, TValue>({
  columns,
  data,
  onHighlightEnter,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [highlightedText, setHighlightedText] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim() !== '') {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setHighlightedText(selection.toString().trim())
      setTooltipPosition({ x: rect.left, y: rect.top - 30 })
      setShowTooltip(true)
    } else {
      setShowTooltip(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && showTooltip) {
        onHighlightEnter(highlightedText)
        setShowTooltip(false)
      }
    }
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [showTooltip, highlightedText, onHighlightEnter])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center py-4">
        <Input
          placeholder="Search through current bills..."
          value={(table.getColumn("content")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("content")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border max-h-[80%] overflow-y-auto">
        {/* <div className="max-h-full overflow-y-auto"> */}
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="overflow-y-auto">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        {/* </div> */}
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
      {showTooltip && (
      <TooltipProvider>
      <Tooltip open={showTooltip}>
        <TooltipTrigger asChild>
          <div
            style={{
              position: 'fixed',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              width: '1px',
              height: '1px',
            }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Press Enter to Chat</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
      )}
    </div>
  )
}