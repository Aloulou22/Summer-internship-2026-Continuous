// Mirrors project-service's Project/Category/ProjectMember entities.
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectMemberRole = 'owner' | 'admin' | 'member';

export interface Category {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: ProjectStatus;
  deadline?: string; // ISO date string, or undefined if unset
  category?: Category;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

// Only present on GET /projects/:id, not on the GET /projects list.
export interface ProjectDetail extends Project {
  members: ProjectMember[];
  columns: BoardColumn[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: string;
}

export interface BoardColumn {
  id: string;
  projectId: string;
  name: string;
  position: number;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  categoryId?: string;
  deadline?: string;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: ProjectStatus;
}

export interface AddMemberRequest {
  userId: string;
  role?: ProjectMemberRole;
}
