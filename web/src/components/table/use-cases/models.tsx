import { DataTable } from "@/src/components/table/data-table";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import { Button } from "@/src/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { useState } from "react";
import useColumnVisibility from "@/src/features/column-visibility/hooks/useColumnVisibility";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { api } from "@/src/utils/api";
import { usdFormatter } from "@/src/utils/numbers";
import { type Prisma, type Model } from "@langfuse/shared/src/db";
import Decimal from "decimal.js";
import { Trash } from "lucide-react";
import { useQueryParams, withDefault, NumberParam } from "use-query-params";
import { cn } from "@/src/utils/tailwind";
import { IOTableCell } from "@/src/components/ui/CodeJsonViewer";
import { useRowHeightLocalStorage } from "@/src/components/table/data-table-row-height-switch";
import { DataTableToolbar } from "@/src/components/table/data-table-toolbar";
import useColumnOrder from "@/src/features/column-visibility/hooks/useColumnOrder";

export type ModelTableRow = {
  modelId: string;
  maintainer: string;
  modelName: string;
  matchPattern: string;
  startDate?: Date;
  inputPrice?: Decimal;
  outputPrice?: Decimal;
  totalPrice?: Decimal;
  unit: string;
  tokenizerId?: string;
  config?: Prisma.JsonValue;
};

const modelConfigDescriptions = {
  modelName:
    "Standardized model name. Generations are assigned to this model name if they match the `matchPattern` upon ingestion.",
  matchPattern:
    "Regex pattern to match `model` parameter of generations to model pricing",
  startDate:
    "Date to start pricing model. If not set, model is active unless a more recent version exists.",
  inputPrice: "Price per 1000 units of input",
  outputPrice: "Price per 1000 units of output",
  totalPrice:
    "Price per 1000 units, for models that don't have input/output specific prices",
  unit: "Unit of measurement for generative model, can be TOKENS, CHARACTERS, SECONDS, MILLISECONDS, REQUESTS or IMAGES.",
  tokenizerId:
    "Tokenizer used for this model to calculate token counts if none are ingested. Pick from list of supported tokenizers.",
  config:
    "Some tokenizers require additional configuration (e.g. openai tiktoken). See docs for details.",
} as const;

export default function ModelTable({ projectId }: { projectId: string }) {
  const [paginationState, setPaginationState] = useQueryParams({
    pageIndex: withDefault(NumberParam, 0),
    pageSize: withDefault(NumberParam, 50),
  });
  const models = api.models.all.useQuery({
    page: paginationState.pageIndex,
    limit: paginationState.pageSize,
    projectId,
  });
  const totalCount = models.data?.totalCount ?? null;

  const [rowHeight, setRowHeight] = useRowHeightLocalStorage("models", "s");

  const columns: LangfuseColumnDef<ModelTableRow>[] = [
    {
      accessorKey: "maintainer",
      id: "maintainer",
      enableColumnFilter: true,
      header: "Maintainer",
      size: 100,
    },
    {
      accessorKey: "modelName",
      id: "modelName",
      header: "Model Name",
      headerTooltip: {
        description: modelConfigDescriptions.modelName,
      },
      size: 150,
    },
    {
      accessorKey: "startDate",
      id: "startDate",
      header: "Start Date",
      headerTooltip: {
        description: modelConfigDescriptions.startDate,
      },
      size: 100,
      cell: ({ row }) => {
        const value: Date | undefined = row.getValue("startDate");

        return value ? (
          <span className="text-xs">{value.toISOString().slice(0, 10)} </span>
        ) : (
          <span className="text-xs">-</span>
        );
      },
    },
    {
      accessorKey: "matchPattern",
      id: "matchPattern",
      headerTooltip: {
        description: modelConfigDescriptions.matchPattern,
      },
      header: "Match Pattern",
      size: 200,
      cell: ({ row }) => {
        const value: string = row.getValue("matchPattern");

        return value ? (
          <IOTableCell data={value} singleLine={rowHeight === "s"} />
        ) : null;
      },
    },
    {
      accessorKey: "inputPrice",
      id: "inputPrice",
      header: () => {
        return (
          <>
            Input Price{" "}
            <span className="text-xs text-muted-foreground">/ 1k units</span>
          </>
        );
      },
      headerTooltip: {
        description: modelConfigDescriptions.inputPrice,
      },
      size: 170,
      cell: ({ row }) => {
        const value: Decimal | undefined = row.getValue("inputPrice");

        return value ? (
          <span className="text-xs">
            {usdFormatter(value.toNumber() * 1000, 2, 8)}
          </span>
        ) : (
          <span className="text-xs">-</span>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "outputPrice",
      id: "outputPrice",
      headerTooltip: {
        description: modelConfigDescriptions.outputPrice,
      },
      header: () => {
        return (
          <>
            Output Price{" "}
            <span className="text-xs text-muted-foreground">/ 1k units</span>
          </>
        );
      },
      size: 170,
      cell: ({ row }) => {
        const value: Decimal | undefined = row.getValue("outputPrice");

        return value ? (
          <span className="text-xs">
            {usdFormatter(value.toNumber() * 1000, 2, 8)}
          </span>
        ) : (
          <span className="text-xs">-</span>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "totalPrice",
      id: "totalPrice",
      header: () => {
        return (
          <>
            Total Price{" "}
            <span className="text-xs text-muted-foreground">/ 1k units</span>
          </>
        );
      },
      headerTooltip: {
        description: modelConfigDescriptions.totalPrice,
      },
      size: 170,
      cell: ({ row }) => {
        const value: Decimal | undefined = row.getValue("totalPrice");

        return value ? (
          <span className="text-xs">
            {usdFormatter(value.toNumber() * 1000, 2, 8)}
          </span>
        ) : (
          <span className="text-xs">-</span>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "unit",
      id: "unit",
      header: "Unit",
      headerTooltip: {
        description: modelConfigDescriptions.unit,
      },
      enableHiding: true,
      size: 110,
    },
    {
      accessorKey: "tokenizerId",
      id: "tokenizerId",
      header: "Tokenizer",
      headerTooltip: {
        description: modelConfigDescriptions.tokenizerId,
      },
      enableHiding: true,
      size: 110,
    },
    {
      accessorKey: "config",
      id: "config",
      header: "Tokenizer Configuration",
      headerTooltip: {
        description: modelConfigDescriptions.config,
      },
      enableHiding: true,
      size: 200,
      cell: ({ row }) => {
        const value: Prisma.JsonValue | undefined = row.getValue("config");

        return value ? (
          <IOTableCell data={value} singleLine={rowHeight === "s"} />
        ) : null;
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      size: 70,
      cell: ({ row }) => {
        return (
          <DeleteModelButton
            projectId={projectId}
            modelId={row.original.modelId}
            isBuiltIn={row.original.maintainer === "Langfuse"}
          />
        );
      },
    },
  ];

  const [columnVisibility, setColumnVisibility] =
    useColumnVisibility<ModelTableRow>("modelsColumnVisibility", columns);

  const [columnOrder, setColumnOrder] = useColumnOrder<ModelTableRow>(
    "modelsColumnOrder",
    columns,
  );

  const convertToTableRow = (model: Model): ModelTableRow => {
    return {
      modelId: model.id,
      maintainer: model.projectId ? "User" : "Langfuse",
      modelName: model.modelName,
      matchPattern: model.matchPattern,
      startDate: model.startDate ? new Date(model.startDate) : undefined,
      inputPrice: model.inputPrice ? new Decimal(model.inputPrice) : undefined,
      outputPrice: model.outputPrice
        ? new Decimal(model.outputPrice)
        : undefined,
      totalPrice: model.totalPrice ? new Decimal(model.totalPrice) : undefined,
      unit: model.unit ?? "",
      tokenizerId: model.tokenizerId ?? undefined,
      config: model.tokenizerConfig,
    };
  };

  return (
    <>
      <DataTableToolbar
        columns={columns}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        columnOrder={columnOrder}
        setColumnOrder={setColumnOrder}
        rowHeight={rowHeight}
        setRowHeight={setRowHeight}
      />
      <DataTable
        columns={columns}
        data={
          models.isLoading
            ? { isLoading: true, isError: false }
            : models.isError
              ? {
                  isLoading: false,
                  isError: true,
                  error: models.error.message,
                }
              : {
                  isLoading: false,
                  isError: false,
                  data: models.data.models.map((t) => convertToTableRow(t)),
                }
        }
        pagination={{
          totalCount,
          onChange: setPaginationState,
          state: paginationState,
        }}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        rowHeight={rowHeight}
      />
    </>
  );
}

const DeleteModelButton = ({
  modelId,
  projectId,
  isBuiltIn,
}: {
  modelId: string;
  projectId: string;
  isBuiltIn?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useUtils();
  const capture = usePostHogClientCapture();
  const mut = api.models.delete.useMutation({
    onSuccess: () => {
      void utils.models.invalidate();
    },
  });

  const hasAccess = useHasProjectAccess({
    projectId,
    scope: "models:CUD",
  });

  return (
    <Popover open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          disabled={!hasAccess || isBuiltIn}
          title={
            isBuiltIn ? "Built-in models cannot be deleted" : "Delete model"
          }
          className={cn(
            isBuiltIn &&
              "disabled:pointer-events-auto disabled:cursor-not-allowed",
          )}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <h2 className="text-md mb-3 font-semibold">Please confirm</h2>
        <p className="mb-3 text-sm">
          This action permanently deletes this model definition.
        </p>
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="destructive"
            loading={mut.isLoading}
            onClick={() => {
              capture("models:delete_button_click");
              mut.mutateAsync({
                projectId,
                modelId,
              });

              setIsOpen(false);
            }}
          >
            Delete Model
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
