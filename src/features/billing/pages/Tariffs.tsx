import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { formatCurrency } from '@/shared/utils/utils';
import type { Tariff } from '@/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Textarea } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { tariffsApi } from '@/features/billing/api/billing';
import { extractError } from '@/core/api/client';

const tariffSchema = z.object({
  name: z.string().min(2, 'Name required'),
  description: z.string().optional(),
  billingCycle: z.enum(['monthly', 'bi_monthly', 'quarterly']),
  standingCharge: z.number().min(0),
  minimumCharge: z.number().min(0),
  penaltyRate: z.number().min(0).max(100),
  blocks: z.array(z.object({
    fromUnits: z.number().min(0),
    toUnits: z.union([z.number().min(0), z.null()]),
    ratePerUnit: z.number().min(0),
  })).min(1, 'At least one rate block required'),
});
type TariffForm = z.infer<typeof tariffSchema>;

const TariffFormComponent = ({
  onSuccess,
  onCancel,
  defaultValues,
  editingId,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  defaultValues?: Partial<TariffForm>;
  editingId?: string;
}) => {
  const [apiError, setApiError] = useState('');
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<TariffForm>({
    resolver: zodResolver(tariffSchema),
    defaultValues: {
      billingCycle: 'monthly', standingCharge: 250, minimumCharge: 500, penaltyRate: 5,
      blocks: [{ fromUnits: 0, toUnits: null, ratePerUnit: 58 }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'blocks' });

  const onSubmit = async (data: TariffForm) => {
    setApiError('');
    try {
      if (editingId) {
        await tariffsApi.update(editingId, data);
      } else {
        await tariffsApi.create(data);
      }
      onSuccess();
    } catch (err) {
      setApiError(extractError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Tariff Name" {...register('name')} error={errors.name?.message} placeholder="Domestic Tier 1" />
        <Select label="Billing Cycle" {...register('billingCycle')} options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'bi_monthly', label: 'Bi-Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
        ]} />
        <Input label="Standing Charge (KES)" {...register('standingCharge', { valueAsNumber: true })} type="number" />
        <Input label="Minimum Charge (KES)" {...register('minimumCharge', { valueAsNumber: true })} type="number" />
        <Input label="Late Penalty Rate (%)" {...register('penaltyRate', { valueAsNumber: true })} type="number" step="0.1" />
      </div>
      <Textarea label="Description" {...register('description')} placeholder="Brief description of this tariff plan" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Rate Blocks (IBT Tiers)</h4>
          <Button variant="secondary" size="sm" type="button" onClick={() => append({ fromUnits: 0, toUnits: null, ratePerUnit: 0 })}>
            <Plus className="w-3.5 h-3.5" /> Add Block
          </Button>
        </div>
        <div className="space-y-3">
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-end gap-3 p-3 bg-gray-50 rounded-xl">
              <Input
                label="From (m³)"
                {...register(`blocks.${i}.fromUnits`, { valueAsNumber: true })}
                type="number" step="0.001"
              />
              <Input
                label="To (m³)"
                {...register(`blocks.${i}.toUnits`, { valueAsNumber: true, setValueAs: (v) => v === '' || v === null ? null : Number(v) })}
                type="number" step="0.001"
                placeholder="∞"
              />
              <Input
                label="Rate/m³ (KES)"
                {...register(`blocks.${i}.ratePerUnit`, { valueAsNumber: true })}
                type="number" step="0.01"
              />
              {fields.length > 1 && (
                <Button variant="ghost" size="sm" type="button" onClick={() => remove(i)} className="text-red-500 hover:bg-red-50 mb-0">
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Save Tariff</Button>
      </div>
    </form>
  );
};

const TariffCard = ({ tariff, onEdit }: { tariff: Tariff; onEdit: (t: Tariff) => void }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base">{tariff.name}</h3>
            <Badge label={tariff.billingCycle} variant="badge-blue" />
          </div>
          {tariff.description && <p className="text-sm text-gray-500 mt-1">{tariff.description}</p>}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
            <span>Standing: <strong>{formatCurrency(tariff.standingCharge)}/mo</strong></span>
            <span>Min Charge: <strong>{formatCurrency(tariff.minimumCharge)}</strong></span>
            <span>Penalty: <strong>{tariff.penaltyRate}%</strong></span>
            <span className="text-blue-600">Connections: <strong>{tariff.connectionCount ?? 0}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="btn-ghost btn-sm" onClick={() => onEdit(tariff)}><Edit2 className="w-4 h-4" /></button>
          <button className="btn-ghost btn-sm"><Copy className="w-4 h-4" /></button>
          <button className="btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rate Blocks</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase">
                <th className="text-left pb-1">From (m³)</th>
                <th className="text-left pb-1">To (m³)</th>
                <th className="text-right pb-1">Rate per m³</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tariff.blocks.map((block, i) => (
                <tr key={i}>
                  <td className="py-2">{block.fromUnits.toFixed(0)}</td>
                  <td className="py-2">{block.toUnits == null ? '∞' : block.toUnits.toFixed(0)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(block.ratePerUnit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const Tariffs = () => {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tariff | null>(null);

  const fetchTariffs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tariffsApi.list({ limit: 100 });
      setTariffs(res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch tariffs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTariffs();
  }, [fetchTariffs]);

  const handleSuccess = async () => {
    setShowForm(false);
    setEditing(null);
    await fetchTariffs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tariff Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${tariffs.length} tariff plan${tariffs.length === 1 ? '' : 's'} configured`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Tariff
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading tariffs…</div>
      ) : (
        <div className="space-y-4">
          {tariffs.map((tariff) => (
            <TariffCard key={tariff.id} tariff={tariff} onEdit={(t) => { setEditing(t); setShowForm(true); }} />
          ))}
          {tariffs.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">No tariff plans found.</div>
          )}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? 'Edit Tariff' : 'New Tariff Plan'}
        size="xl"
      >
        <TariffFormComponent
          editingId={editing?.id}
          defaultValues={editing ? {
            name: editing.name,
            description: editing.description,
            billingCycle: editing.billingCycle,
            standingCharge: editing.standingCharge,
            minimumCharge: editing.minimumCharge,
            penaltyRate: editing.penaltyRate,
            blocks: editing.blocks,
          } : undefined}
          onSuccess={handleSuccess}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
};
