'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  EditSmartListDialog,
  type EditSmartListTarget,
} from '@/features/contacts/components/edit-smart-list-dialog';
import {
  deleteSmartListAction,
  reorderSmartListsAction,
} from '@/server/actions/contacts/smart-lists';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type SavedListTab = {
  id: string;
  name: string;
  isShared: boolean;
  canDelete: boolean;
  canEdit: boolean;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  columns: unknown[];
};

function SortableSavedTab({
  item,
  active,
  onSelect,
  onDeleted,
  onEdit,
}: {
  item: SavedListTab;
  active: boolean;
  onSelect: () => void;
  onDeleted: () => void;
  onEdit: (target: EditSmartListTarget) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [pending, startTransition] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteSmartListAction({ smartListId: item.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Smart list deleted');
      onDeleted();
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1 rounded-xl pl-3.5 pr-1 text-[13px] font-semibold transition-colors',
        active
          ? 'border border-line bg-white text-ink-900 shadow-sm'
          : 'text-ink-500 hover:bg-white/60 hover:text-ink-900',
        isDragging && 'opacity-70',
      )}
    >
      <button
        type="button"
        aria-selected={active}
        className="inline-flex items-center gap-2"
        onClick={onSelect}
        {...attributes}
        {...listeners}
      >
        {item.name}
        {item.isShared ? (
          <span className="rounded-full bg-soft px-1.5 text-[10px] font-bold uppercase text-ink-500">
            Team
          </span>
        ) : null}
      </button>
      {item.canEdit || item.canDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid size-7 place-items-center rounded-lg text-ink-500 hover:bg-soft"
              aria-label={`Actions for ${item.name}`}
              disabled={pending}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {item.canEdit ? (
              <DropdownMenuItem
                onClick={() =>
                  onEdit({
                    id: item.id,
                    name: item.name,
                    isShared: item.isShared,
                    filters: item.filters,
                    sort: item.sort,
                    columns: item.columns,
                  })
                }
              >
                Rename or share…
              </DropdownMenuItem>
            ) : null}
            {item.canDelete ? (
              <DropdownMenuItem className="text-rose-700" onClick={remove}>
                Delete list
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export function ContactsSmartListTabs({
  savedLists,
  activeSavedId,
  onSelectSaved,
  onReordered,
  canShareTeamLists,
}: {
  savedLists: SavedListTab[];
  activeSavedId: string | null;
  onSelectSaved: (id: string) => void;
  onReordered: () => void;
  canShareTeamLists: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [, startTransition] = useTransition();
  const [editTarget, setEditTarget] = useState<EditSmartListTarget | null>(null);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = savedLists.map((item) => item.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...ids];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved!);
    startTransition(async () => {
      const result = await reorderSmartListsAction({ orderedIds: next });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      onReordered();
    });
  };

  if (savedLists.length === 0) return null;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={savedLists.map((item) => item.id)} strategy={horizontalListSortingStrategy}>
          {savedLists.map((item) => (
            <SortableSavedTab
              key={item.id}
              item={item}
              active={activeSavedId === item.id}
              onSelect={() => onSelectSaved(item.id)}
              onDeleted={onReordered}
              onEdit={setEditTarget}
            />
          ))}
        </SortableContext>
      </DndContext>
      <EditSmartListDialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        target={editTarget}
        canShare={canShareTeamLists}
        onSaved={() => {
          setEditTarget(null);
          onReordered();
        }}
      />
    </>
  );
}
