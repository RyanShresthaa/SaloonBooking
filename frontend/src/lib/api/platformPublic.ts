import api from '../axios';

export type PlatformServiceCategory = {
  id: string;
  name: string;
  sortOrder?: number;
};

export function listPublicPlatformCategories() {
  return api.get<{ success: boolean; data: PlatformServiceCategory[] }>('/public/platform/categories');
}
