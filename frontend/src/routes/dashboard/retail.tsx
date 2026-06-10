import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  stockQty: number;
  isActive: boolean;
};

export default function RetailPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    listRetailProducts()
      .then((res) => setProducts(res.data.data || []))
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load products.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
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

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="border-b border-stone-300/50 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Shelf</p>
          <h1 className="font-display text-3xl text-stone-900 sm:text-4xl">Retail</h1>
          <p className="mt-2 text-sm text-stone-600">
            Home-care and add-on products. Guests see active items; admins manage catalogue and stock.
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900">{error}</div>
        ) : null}

        {isAdmin ? (
          <section className="surface-card rounded-lg p-6 sm:p-8">
            <h2 className="font-display text-xl text-stone-900">Add product</h2>
            <form onSubmit={handleSubmit(onCreate)} className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input label="Name" {...register('name', { required: true })} />
              <Input label="Price" type="number" step="0.01" min={0} {...register('price', { valueAsNumber: true })} />
              <Input label="Stock qty" type="number" min={0} {...register('stockQty', { valueAsNumber: true })} />
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Description</label>
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

        <section>
          <h2 className="font-display text-xl text-stone-900">Catalogue</h2>
          {loading ? (
            <div className="mt-6 flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
            </div>
          ) : products.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600">No products listed yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {products.map((p) => (
                <div key={p.id} className={`surface-card rounded-lg p-5 ${!p.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg text-stone-900">{p.name}</h3>
                    {!p.isActive ? <span className="text-[10px] font-semibold uppercase text-stone-500">Inactive</span> : null}
                  </div>
                  {p.description ? <p className="mt-2 text-sm text-stone-600">{p.description}</p> : null}
                  <p className="mt-3 text-sm font-medium text-stone-800">${Number(p.price).toFixed(2)}</p>
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
