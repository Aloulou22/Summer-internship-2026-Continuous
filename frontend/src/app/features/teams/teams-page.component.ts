import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TeamsService } from '../../core/services/teams.service';
import { TeamDetail } from '../../core/models/team.model';

import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';

@Component({
  selector: 'tf-teams-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatTooltipModule, SkeletonComponent, EmptyStateComponent, AvatarComponent],
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
})
export class TeamsPageComponent {
  private readonly teamsService = inject(TeamsService);

  protected readonly loading = signal(true);
  protected readonly teams = signal<TeamDetail[]>([]);

  constructor() {
    this.teamsService.listAll().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
