import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  listRetailProducts,
  createRetailProduct,
  updateRetailProduct,
  deleteRetailProduct,
  type RetailProductPayload,
} from '@/lib/api/retail';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { formatCurrency, CURRENCY_PREFIX } from '@/lib/utils/currency';

// ─── Types ───

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  stockQty: number;
  isActive: boolean;
};

// ─── Constants ───

const LOW_STOCK_THRESHOLD = 5;

// ─── Exports ───

export default function RetailPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const shelfSalonId = searchParams.get('salonId')?.trim() || undefined;
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'active' | 'inactive' | 'low'>('all');

  const load = useCallback(() => {
    setLoading(true);
    listRetailProducts({ salonId: shelfSalonId })
      .then((res) => setProducts(res.data.data || []))
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load products.')))
      .finally(() => setLoading(false));
  }, [shelfSalonId]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<RetailProductPayload>({
    defaultValues: { name: '', description: '', price: 0, stockQty: 0, isActive: true },
  });

  const onCreate = async (data: RetailProductPayload) => {
    setError('');
    try {
      await createRetailProduct({
        ...data,
        price: Number(data.price),
        stockQty: data.stockQty != null ? Number(data.stockQty) : 0,
      });
      reset({ name: '', description: '', price: 0, stockQty: 0, isActive: true });
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not create product.'));
    }
  };

  const bumpStock = async (p: Product, delta: number) => {
    if (!isAdmin) return;
    setError('');
    try {
      await updateRetailProduct(p.id, { stockQty: Math.max(0, Number(p.stockQty) + delta) });
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not update stock.'));
    }
  };

  const toggleActive = async (p: Product) => {
    setError('');
    try {
      await updateRetailProduct(p.id, { isActive: !p.isActive });
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not update product.'));
    }
  };

  const remove = async (id: string) => {
    if (!isAdmin || !window.confirm('Delete this product?')) return;
    setError('');
    try {
      await deleteRetailProduct(id);
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not delete.'));
    }
  };

  const visibleProducts = useMemo(() => {
    let list = products;
    if (isAdmin) {
      if (catalogFilter === 'active') list = list.filter((p) => p.isActive);
      else if (catalogFilter === 'inactive') list = list.filter((p) => !p.isActive);
      else if (catalogFilter === 'low') list = list.filter((p) => Number(p.stockQty) < LOW_STOCK_THRESHOLD);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, catalogFilter, search, isAdmin]);

  const catalogScopeButtons = (
    [
      { id: 'all' as const, label: 'All SKUs' },
      { id: 'active' as const, label: 'Active' },
      { id: 'inactive' as const, label: 'Inactive' },
      { id: 'low' as const, label: `Low stock (<${LOW_STOCK_THRESHOLD})` },
    ] as const
  );

  return (
    <AuthGuard>
      <div className="page-shell-spacious">
        <header className="page-header">
          <p className="page-eyebrow">Shelf</p>
          <h1 className="page-title">Retail</h1>
          <p className="page-lede">
            Home-care and add-on products. Staff manage catalogue and stock; everyone else sees{' '}
            <strong className="font-medium text-stone-800 dark:text-stone-200">active</strong> items for the salon
            (default tenant unless a salon is specified).
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900">{error}</div>
        ) : null}

        {isAdmin ? (
          <section className="surface-card rounded-lg p-6 sm:p-8" aria-label="Add product">
            <h2 className="font-display text-xl text-stone-900">Add product</h2>
            <form onSubmit={handleSubmit(onCreate)} className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input label="Name" {...register('name', { required: true })} />
              <Input label={`Price (${CURRENCY_PREFIX})`} type="number" step="0.01" min={0} {...register('price', { valueAsNumber: true })} />
              <Input label="Stock qty" type="number" min={0} {...register('stockQty', { valueAsNumber: true })} />
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="section-label">Description</label>
                <textarea rows={2} className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus-ring" {...register('description')} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" loading={isSubmitting}>
                  Create
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        <section aria-label="Product catalogue">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="font-display text-xl text-stone-900 dark:text-stone-50">Catalogue</h2>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or description…"
                className="w-full rounded-md border border-stone-300 bg-[#fffefb] py-2 pl-9 pr-3 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                aria-label="Search products"
              />
            </div>
          </div>
          {isAdmin ? (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Catalogue scope">
              {catalogScopeButtons.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCatalogFilter(id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    catalogFilter === id
                      ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                      : 'border-stone-300 bg-[#fffefb] text-stone-700 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {loading ? (
            <div className="mt-6 flex justify-center py-12" role="status" aria-label="Loading products">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-600 dark:border-t-stone-200" aria-hidden />
            </div>
          ) : products.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">No products listed yet.</p>
          ) : visibleProducts.length === 0 ? (
            <p className="mt-4 rounded-lg border border-stone-200/80 bg-[#faf7f2] px-4 py-6 text-center text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300">
              Nothing matches your search or filters.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {visibleProducts.map((p) => (
                <div key={p.id} className={`surface-card rounded-lg p-5 ${!p.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg text-stone-900">{p.name}</h3>
                    {!p.isActive ? <span className="text-[10px] font-medium text-stone-500">Inactive</span> : null}
                  </div>
                  {p.description ? <p className="mt-2 text-sm text-stone-600">{p.description}</p> : null}
                  <p className="mt-3 text-sm font-medium text-stone-800">{formatCurrency(p.price)}</p>
                  <p className="text-xs text-stone-500">In stock: {p.stockQty}</p>
                  {isAdmin ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => void bumpStock(p, 1)}>
                        +1
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void bumpStock(p, -1)}>
                        −1
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void toggleActive(p)}>
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void remove(p.id)}>
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
