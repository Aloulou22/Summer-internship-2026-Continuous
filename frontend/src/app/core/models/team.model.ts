import { Profile } from './profile.model';

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// user-service's TeamsService.findAll()/findOne() both load the `members`
// relation eagerly (Profile[], full profiles — not just userIds), so both
// GET /teams and GET /teams/:id already return this shape.
export interface TeamDetail extends Team {
  members: Profile[];
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export type UpdateTeamRequest = Partial<CreateTeamRequest>;
