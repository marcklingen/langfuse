import { type Trace, type Score } from "@prisma/client";
import { ObservationTree } from "./ObservationTree";
import { ObservationPreview } from "./ObservationPreview";
import { TracePreview } from "./TracePreview";

import Header from "@/src/components/layouts/header";
import { Badge } from "@/src/components/ui/badge";
import { TraceAggUsageBadge } from "@/src/components/token-usage-badge";
import Decimal from "decimal.js";
import { StringParam, useQueryParam } from "use-query-params";
import { PublishTraceSwitch } from "@/src/components/publish-object-switch";
import { DetailPageNav } from "@/src/features/navigate-detail-pages/DetailPageNav";
import { useRouter } from "next/router";
import { type ObservationReturnType } from "@/src/server/api/routers/traces";
import { api } from "@/src/utils/api";
import { DeleteTrace } from "@/src/components/delete-trace";
import { StarTraceToggle } from "@/src/components/star-toggle";
import Link from "next/link";
import { NoAccessError } from "@/src/components/no-access";
import { TagPopOver } from "@/src/features/tag/components/TagPopOver";

export function Trace(props: {
  observations: Array<ObservationReturnType>;
  trace: Trace;
  scores: Score[];
  projectId: string;
}) {
  const [currentObservationId, setCurrentObservationId] = useQueryParam(
    "observation",
    StringParam,
  );

  return (
    <div className="grid h-full gap-4 md:grid-cols-3">
      <div className="md:col-span-2 md:h-full md:overflow-y-auto">
        {currentObservationId === undefined ||
        currentObservationId === "" ||
        currentObservationId === null ? (
          <TracePreview
            trace={props.trace}
            observations={props.observations}
            scores={props.scores}
          />
        ) : (
          <ObservationPreview
            observations={props.observations}
            scores={props.scores}
            projectId={props.projectId}
            currentObservationId={currentObservationId}
            traceId={props.trace.id}
          />
        )}
      </div>
      <div className="md:h-full md:overflow-y-auto">
        <ObservationTree
          observations={props.observations}
          trace={props.trace}
          scores={props.scores}
          currentObservationId={currentObservationId ?? undefined}
          setCurrentObservationId={setCurrentObservationId}
        />
      </div>
    </div>
  );
}

export function TracePage({ traceId }: { traceId: string }) {
  const router = useRouter();
  const trace = api.traces.byId.useQuery(
    { traceId },
    {
      retry(failureCount, error) {
        if (error.data?.code === "UNAUTHORIZED") return false;
        return failureCount < 3;
      },
    },
  );

  const traceFilterOptions = api.traces.filterOptions.useQuery(
    {
      projectId: trace.data?.projectId ?? "",
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      enabled: !!trace.data?.projectId && trace.isSuccess,
    },
  );

  const utils = api.useUtils();
  const mutTags = api.traces.updateTags.useMutation({
    onSuccess: () => {
      void utils.traces.filterOptions.invalidate();
      void utils.traces.all.invalidate();
      console.log("Success");
    },
  });

  const filterOptionTags = traceFilterOptions.data?.tags ?? [];
  const allTags = filterOptionTags.map((t) => t.value);
  const totalCost = trace.data?.observations.reduce(
    (acc, o) => {
      if (!o.price) return acc;

      return acc ? acc.plus(o.price) : new Decimal(0).plus(o.price);
    },
    undefined as Decimal | undefined,
  );
  if (trace.error?.data?.code === "UNAUTHORIZED") return <NoAccessError />;
  if (!trace.data) return <div>loading...</div>;

  return (
    <div className="flex flex-col overflow-hidden xl:container md:h-[calc(100vh-100px)] xl:h-[calc(100vh-40px)]">
      <Header
        title="Trace Detail"
        breadcrumb={[
          {
            name: "Traces",
            href: `/project/${router.query.projectId as string}/traces`,
          },
          { name: traceId },
        ]}
        actionButtons={
          <>
            <StarTraceToggle
              index={0}
              traceId={trace.data.id}
              projectId={trace.data.projectId}
              value={trace.data.bookmarked}
            />
            <PublishTraceSwitch
              traceId={trace.data.id}
              projectId={trace.data.projectId}
              isPublic={trace.data.public}
            />
            <DetailPageNav
              currentId={traceId}
              path={(id) =>
                `/project/${router.query.projectId as string}/traces/${id}`
              }
              listKey="traces"
            />
            <DeleteTrace
              traceId={trace.data.id}
              projectId={trace.data.projectId}
            />
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        {trace.data.sessionId ? (
          <Link
            href={`/project/${router.query.projectId as string}/sessions/${
              trace.data.sessionId
            }`}
          >
            <Badge>Session: {trace.data.sessionId}</Badge>
          </Link>
        ) : null}
        {trace.data.userId ? (
          <Link
            href={`/project/${router.query.projectId as string}/users/${
              trace.data.userId
            }`}
          >
            <Badge>User ID: {trace.data.userId}</Badge>
          </Link>
        ) : null}
        <TraceAggUsageBadge observations={trace.data.observations} />
        {totalCost ? (
          <Badge variant="outline">
            Total cost: {totalCost.toString()} USD
          </Badge>
        ) : undefined}
      </div>
      <div className="mt-5 rounded-lg border bg-card font-semibold text-card-foreground shadow-sm">
        <div className="flex flex-row items-center gap-3 p-2.5">
          Tags
          <TagPopOver
            index={0}
            tags={trace.data.tags}
            availableTags={allTags}
            onClick={(value) =>
              mutTags.mutateAsync({
                projectId: trace.data.projectId,
                traceId: trace.data.id,
                tags: value,
              })
            }
          />
        </div>
      </div>
      <div className="mt-5 flex-1 overflow-hidden border-t pt-5">
        <Trace
          key={trace.data.id}
          trace={trace.data}
          scores={trace.data.scores}
          projectId={trace.data.projectId}
          observations={trace.data.observations}
        />
      </div>
    </div>
  );
}
