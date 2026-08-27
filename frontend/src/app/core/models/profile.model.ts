import { Team } from './team.model';

// Mirrors user-service's Profile entity. Note userId (Auth-issued id) is
// distinct from id (this profile row's own id) — everything cross-service
// (project membership, task assignee/reporter, comment author) references
// userId, never this row's id.
export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  jobTitle?: string;
  bio?: string;
  avatarUrl?: string;
  team?: Team;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  jobTitle?: string;
  bio?: string;
  avatarUrl?: string;
}
