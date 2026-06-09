"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";

import {
  PIPELINE_STAGES,
  RECOMMENDATION_BADGE_CLASS,
  STAGE_LABELS,
  type ApplicationStage,
} from "@/lib/applications";

import type { ApplicantRow } from "./applicants-view";

export function PipelineBoard({
  jobId,
  applicants,
  onMove,
  busy,
}: {
  jobId: string;
  applicants: ApplicantRow[];
  onMove: (id: string, stage: ApplicationStage) => void;
  busy: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const target = event.over?.id as ApplicationStage | undefined;
    if (!target) return;
    const card = applicants.find((a) => a.id === id);
    if (!card || card.stage === target) return;
    onMove(id, target);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {PIPELINE_STAGES.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            jobId={jobId}
            cards={applicants.filter((a) => a.stage === stage)}
            busy={busy}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  stage,
  cards,
  jobId,
  busy,
}: {
  stage: ApplicationStage;
  cards: ApplicantRow[];
  jobId: string;
  busy: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 p-2 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border bg-white"
      }`}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs font-semibold">{STAGE_LABELS[stage]}</span>
        <span className="text-muted text-xs tabular-nums">{cards.length}</span>
      </div>
      <div className="min-h-16 space-y-2">
        {cards.map((card) => (
          <Card key={card.id} card={card} jobId={jobId} disabled={busy} />
        ))}
      </div>
    </div>
  );
}

function Card({
  card,
  jobId,
  disabled,
}: {
  card: ApplicantRow;
  jobId: string;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id, disabled });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`border-border bg-background touch-none rounded-lg border-2 p-2 text-sm ${
        isDragging ? "opacity-50" : "cursor-grab"
      }`}
    >
      <p className="truncate font-semibold">{card.applicantName}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {card.aiRecommendation ? (
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${RECOMMENDATION_BADGE_CLASS[card.aiRecommendation]}`}
          >
            {card.aiScore ?? "-"}
          </span>
        ) : (
          <span className="text-muted text-[10px]">unscored</span>
        )}
        <Link
          href={`/jobs/${jobId}/applicants/${card.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-primary ml-auto text-[10px] font-semibold hover:underline"
        >
          view
        </Link>
      </div>
    </div>
  );
}
