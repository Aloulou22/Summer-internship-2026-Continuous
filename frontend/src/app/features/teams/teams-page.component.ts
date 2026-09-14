import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../core/services/auth.service';
import { TeamsService } from '../../core/services/teams.service';
import { ToastService } from '../../core/services/toast.service';
import { CreateTeamRequest, TeamDetail } from '../../core/models/team.model';
import { Profile } from '../../core/models/profile.model';
import { openConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { TeamFormDialogComponent, TeamFormDialogData } from './team-form-dialog/team-form-dialog.component';
import {
  AddTeamMemberDialogComponent,
  AddTeamMemberDialogData,
} from './add-team-member-dialog/add-team-member-dialog.component';

import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';

@Component({
  selector: 'tf-teams-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    SkeletonComponent,
    EmptyStateComponent,
    AvatarComponent,
  ],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
})
export class TeamsPageComponent {
  private readonly teamsService = inject(TeamsService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly teams = signal<TeamDetail[]>([]);
  // Team CRUD is admin-only server-side (teams.controller.ts) — manager is
  // deliberately excluded, same line as user/role management.
  protected readonly canManage = computed(() => this.auth.user()?.role === 'admin');

  constructor() {
    this.teamsService.listAll().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  createTeam(): void {
    const ref = this.dialog.open<TeamFormDialogComponent, TeamFormDialogData, CreateTeamRequest>(
      TeamFormDialogComponent,
      { data: { mode: 'create' }, width: '440px' },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.teamsService.create(result).subscribe((team) => {
        this.teams.update((all) => [...all, { ...team, members: [] }]);
        this.toast.success(`${team.name} created`);
      });
    });
  }

  editTeam(team: TeamDetail): void {
    const ref = this.dialog.open<TeamFormDialogComponent, TeamFormDialogData, CreateTeamRequest>(
      TeamFormDialogComponent,
      { data: { mode: 'edit', team }, width: '440px' },
    );
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.teamsService.update(team.id, result).subscribe((updated) => {
        this.teams.update((all) =>
          all.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
        );
        this.toast.success('Team updated');
      });
    });
  }

  deleteTeam(team: TeamDetail): void {
    openConfirmDialog(this.dialog, {
      title: 'Delete team?',
      message: `"${team.name}" will be permanently deleted. Members keep their profiles but lose this team.`,
      confirmLabel: 'Delete',
      danger: true,
    })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.teamsService.remove(team.id).subscribe(() => {
          this.teams.update((all) => all.filter((t) => t.id !== team.id));
          this.toast.success('Team deleted');
        });
      });
  }

  addMember(team: TeamDetail): void {
    const ref = this.dialog.open<AddTeamMemberDialogComponent, AddTeamMemberDialogData, string>(
      AddTeamMemberDialogComponent,
      {
        data: { teamName: team.name, existingUserIds: team.members.map((m) => m.userId) },
        width: '440px',
      },
    );
    ref.afterClosed().subscribe((userId) => {
      if (!userId) return;
      this.teamsService.addMember(team.id, userId).subscribe((updated) => {
        // One team per user: joining this team removed them from any other,
        // so drop them from every other card too.
        this.teams.update((all) =>
          all.map((t) =>
            t.id === updated.id
              ? updated
              : { ...t, members: t.members.filter((m) => m.userId !== userId) },
          ),
        );
        const name = updated.members.find((m) => m.userId === userId)?.fullName ?? 'Member';
        this.toast.success(`${name} added to ${updated.name}`);
      });
    });
  }

  removeMember(team: TeamDetail, member: Profile): void {
    openConfirmDialog(this.dialog, {
      title: 'Remove member?',
      message: `${member.fullName} will be removed from "${team.name}".`,
      confirmLabel: 'Remove',
      danger: true,
    })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.teamsService.removeMember(team.id, member.userId).subscribe((updated) => {
          this.teams.update((all) => all.map((t) => (t.id === updated.id ? updated : t)));
          this.toast.success(`${member.fullName} removed from ${updated.name}`);
        });
      });
  }
}
