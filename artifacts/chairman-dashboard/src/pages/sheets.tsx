import { useState, useEffect } from "react";
import { useSheetsList, useSheetData } from "@/lib/useGoogleSheets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Sheets() {
  const { data: sheetsList, isLoading: sheetsListLoading } = useSheetsList();
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  useEffect(() => {
    if (sheetsList?.sheets && sheetsList.sheets.length > 0 && !selectedSheet) {
      setSelectedSheet(sheetsList.sheets[0]);
    }
  }, [sheetsList, selectedSheet]);

  const { data: sheetData, isLoading: sheetDataLoading, isFetching: sheetDataFetching } = useSheetData(selectedSheet);

  const isLoading = sheetDataLoading || sheetDataFetching || sheetsListLoading;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Raw Data Intelligence</h1>
          <p className="text-muted-foreground mt-2">Direct access to the underlying spreadsheet tabs.</p>
        </div>
        <div className="w-[280px]">
          {sheetsListLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedSheet ?? ""} onValueChange={setSelectedSheet}>
              <SelectTrigger className="w-full bg-card/50 border-border/50">
                <SelectValue placeholder="Select a sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheetsList?.sheets.map((sheet) => (
                  <SelectItem key={sheet} value={sheet}>
                    {sheet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Data Explorer
            {!isLoading && sheetData && (
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {sheetData.totalRows} rows
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {selectedSheet ? `Viewing raw data from tab: ${selectedSheet}` : 'Select a sheet to view data'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-lg border-t border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableHead key={i}><Skeleton className="h-4 w-[120px]" /></TableHead>
                      ))
                    ) : sheetData?.headers.map((header, i) => (
                      <TableHead key={i} className="whitespace-nowrap font-semibold text-muted-foreground">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 15 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-[100px]" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : sheetData?.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      {row.map((cell, j) => (
                        <TableCell key={j} className="whitespace-nowrap text-sm font-mono text-muted-foreground">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!isLoading && sheetData?.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={sheetData.headers.length || 1} className="h-32 text-center text-muted-foreground">
                        No data found in this sheet.
                      </TableCell>
                    </TableRow>
                  )}
                  {!selectedSheet && !isLoading && (
                    <TableRow>
                      <TableCell className="h-32 text-center text-muted-foreground">
                        Select a sheet from the dropdown above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
