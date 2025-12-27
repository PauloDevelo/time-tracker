import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { Contract } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';

@Component({
  selector: 'app-contract-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './contract-list.component.html',
  styleUrls: ['./contract-list.component.scss']
})
export class ContractListComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Output() addContract = new EventEmitter<void>();
  @Output() editContract = new EventEmitter<Contract>();
  @Output() deleteContract = new EventEmitter<Contract>();

  contracts: Contract[] = [];
  isLoading = false;
  displayedColumns = ['name', 'period', 'dailyRate', 'daysToCompletion', 'status', 'actions'];

  constructor(private contractService: ContractService) {}

  ngOnInit(): void {
    this.loadContracts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && !changes['customerId'].firstChange) {
      this.loadContracts();
    }
  }

  loadContracts(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.contractService.getContractsByCustomer(this.customerId).subscribe({
      next: (contracts) => {
        this.contracts = contracts;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading contracts:', error);
        this.isLoading = false;
      }
    });
  }

  onAdd(): void {
    this.addContract.emit();
  }

  onEdit(contract: Contract): void {
    this.editContract.emit(contract);
  }

  onDelete(contract: Contract): void {
    this.deleteContract.emit(contract);
  }

  isActive(contract: Contract): boolean {
    const now = new Date();
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    return now >= start && now <= end;
  }

  isExpired(contract: Contract): boolean {
    const now = new Date();
    const end = new Date(contract.endDate);
    return now > end;
  }

  formatPeriod(contract: Contract): string {
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }
}
