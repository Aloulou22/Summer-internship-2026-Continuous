import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, 'tf-toast--success');
  }

  error(message: string): void {
    this.show(message, 'tf-toast--error');
  }

  info(message: string): void {
    this.show(message, 'tf-toast--info');
  }

  private show(message: string, variant: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: ['tf-toast', variant],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
