import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { CustomerListComponent } from './customer-list/customer-list.component';
import { CustomerDetailComponent } from './customer-detail/customer-detail.component';
import { CustomerCreateComponent } from './customer-create/customer-create.component';
import { CustomerEditComponent } from './customer-edit/customer-edit.component';

export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    component: CustomerListComponent,
    canActivate: [authGuard],
    title: 'Customers - Time Tracker'
  },
  {
    path: 'new',
    component: CustomerCreateComponent,
    canActivate: [authGuard],
    title: 'Add Customer - Time Tracker'
  },
  {
    path: ':id',
    component: CustomerDetailComponent,
    canActivate: [authGuard],
    title: 'Customer Details - Time Tracker'
  },
  {
    path: ':id/edit',
    component: CustomerEditComponent,
    canActivate: [authGuard],
    title: 'Edit Customer - Time Tracker'
  }
]; 