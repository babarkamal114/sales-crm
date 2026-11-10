export type ContactNoteView = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    initials: string;
  };
};

export type ContactTaskView = {
  id: string;
  title: string;
  kind: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string };
};
