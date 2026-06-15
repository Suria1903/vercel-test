import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login').then((m) => m.Login) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell').then((m) => m.Shell),
    children: [
      { path: '', loadComponent: () => import('./features/home').then((m) => m.Home) },
      { path: 'feed', loadComponent: () => import('./features/feed').then((m) => m.Feed) },
      { path: 'article/:id', loadComponent: () => import('./features/article').then((m) => m.ArticleView) },
      { path: 'syllabus', loadComponent: () => import('./features/syllabus').then((m) => m.Syllabus) },
      { path: 'retention', loadComponent: () => import('./features/retention').then((m) => m.RetentionView) },
      { path: 'topics', loadComponent: () => import('./features/topic-map').then((m) => m.TopicMap) },
    ],
  },
  { path: '**', redirectTo: '' },
];
