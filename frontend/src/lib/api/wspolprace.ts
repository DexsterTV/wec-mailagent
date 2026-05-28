import { apiClient } from './client'
import type {
  Brand,
  CollaborationType,
  Outlet,
  PriceListEntry,
  Collaboration,
  PriceType,
  CollaborationStatus,
} from '../../types'

export const wspolpraceApi = {
  // Brands (admin write)
  getBrands: () => apiClient.get<Brand[]>('/wspolprace/brands'),
  createBrand: (name: string) => apiClient.post<Brand>('/wspolprace/brands', { name }),
  updateBrand: (id: string, patch: Partial<Pick<Brand, 'name' | 'active'>>) =>
    apiClient.put<Brand>(`/wspolprace/brands/${id}`, patch),

  // Outlets (any user)
  getOutlets: () => apiClient.get<Outlet[]>('/wspolprace/outlets'),
  createOutlet: (name: string) => apiClient.post<Outlet>('/wspolprace/outlets', { name }),
  updateOutlet: (id: string, patch: Partial<Pick<Outlet, 'name' | 'active'>>) =>
    apiClient.put<Outlet>(`/wspolprace/outlets/${id}`, patch),

  // Collaboration types (admin write)
  getTypes: () => apiClient.get<CollaborationType[]>('/wspolprace/types'),
  createType: (input: { name: string; slug?: string; sortOrder?: number }) =>
    apiClient.post<CollaborationType>('/wspolprace/types', input),
  updateType: (id: string, patch: Partial<Pick<CollaborationType, 'name' | 'active' | 'sortOrder'>>) =>
    apiClient.put<CollaborationType>(`/wspolprace/types/${id}`, patch),

  // Price list (any user) — POST is upsert by (outletId, collaborationTypeId)
  getPriceList: () => apiClient.get<PriceListEntry[]>('/wspolprace/price-list'),
  upsertPriceEntry: (input: {
    outletId: string
    collaborationTypeId: string
    priceGrosze: number
    priceType: PriceType
    note?: string | null
  }) => apiClient.post<PriceListEntry>('/wspolprace/price-list', input),
  deletePriceEntry: (id: string) => apiClient.delete<void>(`/wspolprace/price-list/${id}`),

  // Collaborations (any user)
  getCollaborations: () => apiClient.get<Collaboration[]>('/wspolprace/collaborations'),
  createCollaboration: (input: {
    brandId: string
    outletId: string
    collaborationTypeId: string
    priceGrosze: number
    priceType: PriceType
    status: CollaborationStatus
    plannedDate?: string | null
    completedDate?: string | null
    link?: string | null
    note?: string | null
  }) => apiClient.post<Collaboration>('/wspolprace/collaborations', input),
  updateCollaboration: (id: string, input: {
    brandId: string
    outletId: string
    collaborationTypeId: string
    priceGrosze: number
    priceType: PriceType
    status: CollaborationStatus
    plannedDate?: string | null
    completedDate?: string | null
    link?: string | null
    note?: string | null
  }) => apiClient.put<Collaboration>(`/wspolprace/collaborations/${id}`, input),
}
