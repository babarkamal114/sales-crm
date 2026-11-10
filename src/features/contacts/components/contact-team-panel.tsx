'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useTransition } from 'react';
import type { ContactProfile } from '@/domain/contacts/profile-view';
import type { TeamMemberOption } from '@/server/services/opportunities/opportunity-tasks';
import {
  setContactFollowersAction,
  setContactOwnerAction,
} from '@/server/actions/contacts/update-contact';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

async function fetchTeam() {
  const response = await fetch('/api/v1/org/members');
  if (!response.ok) return [];
  const data = (await response.json()) as { items: TeamMemberOption[] };
  return data.items;
}

export function ContactTeamPanel({
  profile,
  role,
  currentUserId,
  onUpdated,
  onRequestMember,
}: {
  profile: ContactProfile;
  role: string;
  currentUserId: string;
  onUpdated: () => void;
  onRequestMember: (memberId: string) => void;
}) {
  const { data: team = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: fetchTeam,
  });
  const [ownerId, setOwnerId] = useState(profile.owner.id);
  const [followerIds, setFollowerIds] = useState<string[]>(
    profile.followers.map((f) => f.id),
  );
  const [pending, startTransition] = useTransition();

  const canAssignAnyOwner = role === 'admin' || role === 'manager';
  const ownerOptions = useMemo(() => {
    if (canAssignAnyOwner) return team;
    return team.filter((m) => m.id === currentUserId || m.id === profile.owner.id);
  }, [canAssignAnyOwner, team, currentUserId, profile.owner.id]);

  const claimOwnership = () => {
    startTransition(async () => {
      const result = await setContactOwnerAction({
        contactId: profile.id,
        version: profile.version,
        ownerId: currentUserId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('You are now the owner');
      onUpdated();
    });
  };

  const saveOwner = () => {
    if (ownerId === profile.owner.id) return;
    startTransition(async () => {
      const result = await setContactOwnerAction({
        contactId: profile.id,
        version: profile.version,
        ownerId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Owner updated');
      onUpdated();
    });
  };

  const toggleFollower = (userId: string) => {
    setFollowerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const saveFollowers = () => {
    const sorted = [...followerIds].sort();
    const current = [...profile.followers.map((f) => f.id)].sort();
    if (sorted.join(',') === current.join(',')) return;

    startTransition(async () => {
      const result = await setContactFollowersAction({
        contactId: profile.id,
        version: profile.version,
        followerUserIds: followerIds,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Followers updated');
      onUpdated();
    });
  };

  return (
    <section className="rounded-2xl border border-line/70 bg-white p-4">
      <h2 className="text-[15px] font-extrabold text-ink-900">Team on this contact</h2>
      <p className="mt-1 text-[13px] text-ink-500">
        Owner, followers, and requests — everyone with access can leave notes on the Activity and
        Notes tabs.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[12px] font-semibold text-ink-500">Owner</span>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-10 min-w-[200px] flex-1 rounded-xl border border-line bg-soft/30 px-3 text-[13px] font-semibold text-ink-800"
              value={ownerId}
              disabled={!canAssignAnyOwner && ownerId !== profile.owner.id}
              onChange={(event) => setOwnerId(event.target.value)}
            >
              {ownerOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending || ownerId === profile.owner.id}
              onClick={saveOwner}
            >
              Save owner
            </Button>
          </div>
          {!canAssignAnyOwner && profile.owner.id !== currentUserId ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              disabled={pending}
              onClick={claimOwnership}
            >
              Assign to me
            </Button>
          ) : null}
        </label>

        <div>
          <span className="text-[12px] font-semibold text-ink-500">Followers</span>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line/60 p-2">
            {team.length === 0 ? (
              <li className="text-[12px] text-ink-500">Loading team…</li>
            ) : (
              team.map((member) => (
                <li key={member.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-soft">
                    <input
                      type="checkbox"
                      checked={followerIds.includes(member.id)}
                      onChange={() => toggleFollower(member.id)}
                    />
                    <span className="font-medium text-ink-800">{member.fullName}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={pending}
            onClick={saveFollowers}
          >
            Save followers
          </Button>
        </div>

        <div>
          <span className="text-[12px] font-semibold text-ink-500">Request a teammate</span>
          <p className="mt-1 text-[12px] text-ink-500">
            Creates a task assigned to them (shows on Tasks and updates next step when due).
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {team
              .filter((m) => m.id !== profile.owner.id)
              .slice(0, 6)
              .map((member) => (
                <Button
                  key={member.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onRequestMember(member.id)}
                >
                  Ask {member.fullName.split(' ')[0]}
                </Button>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
