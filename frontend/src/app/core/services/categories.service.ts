import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Category } from '../models/project.model';

export interface CreateCategoryRequest {
  name: string;
  color?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/categories`;

  /** GET /categories — open to any authenticated user. */
  listAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.base);
  }

  /** POST /categories — admin only (enforced server-side; UI only offers this to admins). */
  create(dto: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.base, dto);
  }
}
