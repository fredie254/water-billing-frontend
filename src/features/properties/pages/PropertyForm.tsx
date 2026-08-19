import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Textarea } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { propertiesApi } from '@/features/properties/api/properties';
import { customersApi } from '@/features/customers/api/customers';
import { zonesApi } from '@/features/zones/api/zones';
import type { Property, Customer, Zone } from '@/types';

const PROPERTY_TYPES = [
  { value: 'residential',   label: 'Residential' },
  { value: 'commercial',    label: 'Commercial' },
  { value: 'industrial',    label: 'Industrial' },
  { value: 'institutional', label: 'Institutional' },
];

const schema = z.object({
  customerId:    z.string().min(1, 'Owner is required'),
  propertyType:  z.enum(['residential', 'commercial', 'industrial', 'institutional']),
  address:       z.string().min(5, 'Address is required'),
  plotNumber:    z.string().optional(),
  unitNumber:    z.string().optional(),
  zoneId:        z.string().optional(),
  ownerPhone:    z.string().optional(),
  occupantName:  z.string().optional(),
  occupantPhone: z.string().optional(),
  latitude:      z.string().optional(),
  longitude:     z.string().optional(),
  notes:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  property?: Property;
  onSuccess: (data?: FormData) => void;
  onCancel: () => void;
}

export const PropertyForm = ({ property, onSuccess, onCancel }: Props) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [zones, setZones]         = useState<Zone[]>([]);

  useEffect(() => {
    customersApi.list({ limit: 200 }).then((r) => setCustomers(r.data)).catch(() => {});
    zonesApi.list({ limit: 200 }).then((r) => setZones(r.data)).catch(() => {});
  }, []);

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId:    property?.customerId    ?? '',
      propertyType:  (property?.propertyType as FormData['propertyType']) ?? 'residential',
      address:       property?.address       ?? '',
      plotNumber:    property?.plotNumber    ?? '',
      unitNumber:    property?.unitNumber    ?? '',
      zoneId:        property?.zoneId        ?? '',
      ownerPhone:    property?.ownerPhone    ?? '',
      occupantName:  property?.occupantName  ?? '',
      occupantPhone: property?.occupantPhone ?? '',
      latitude:      property?.latitude  != null ? String(property.latitude)  : '',
      longitude:     property?.longitude != null ? String(property.longitude) : '',
      notes:         property?.notes         ?? '',
    },
  });

  const customerOptions = customers.map((c) => ({ value: c.id, label: `${c.name} (${c.customerNo})` }));
  const zoneOptions     = [{ value: '', label: 'No zone assigned' }, ...zones.map((z) => ({ value: z.id, label: z.name }))];

  const onSubmit = async (data: FormData) => {
    const payload: Partial<Property> = {
      ...data,
      latitude:  data.latitude  ? parseFloat(data.latitude)  : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
    };
    if (property) {
      await propertiesApi.update(property.id, payload);
    } else {
      await propertiesApi.create(payload);
    }
    onSuccess(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Owner & type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Owner (Customer)"
          {...register('customerId')}
          error={errors.customerId?.message}
          placeholder="Select customer"
          options={customerOptions}
        />
        <Select
          label="Property Type"
          {...register('propertyType')}
          error={errors.propertyType?.message}
          options={PROPERTY_TYPES}
        />
      </div>

      {/* Address */}
      <Input
        label="Physical Address"
        {...register('address')}
        error={errors.address?.message}
        placeholder="14 Kimathi Street, Nairobi"
      />

      {/* Plot / Unit / Zone */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Plot Number"
          {...register('plotNumber')}
          placeholder="NBI/001/234"
        />
        <Input
          label="Unit / Apt Number"
          {...register('unitNumber')}
          placeholder="e.g. A4, Unit 12"
        />
        <Select
          label="Zone"
          {...register('zoneId')}
          options={zoneOptions}
        />
      </div>

      {/* Owner phone */}
      <Input
        label="Owner Phone"
        {...register('ownerPhone')}
        type="tel"
        placeholder="0712 345 678"
      />

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Occupant / Tenant (if different from owner)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Occupant Name"
            {...register('occupantName')}
            placeholder="Tenant full name"
          />
          <Input
            label="Occupant Phone"
            {...register('occupantPhone')}
            type="tel"
            placeholder="0723 456 789"
          />
        </div>
      </div>

      {/* GPS */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">GPS Coordinates (optional)</p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Latitude"
            {...register('latitude')}
            placeholder="-1.2921"
            type="number"
            step="any"
          />
          <Input
            label="Longitude"
            {...register('longitude')}
            placeholder="36.8219"
            type="number"
            step="any"
          />
        </div>
      </div>

      <Textarea
        label="Notes"
        {...register('notes')}
        placeholder="Any internal notes about this property…"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>
          {property ? 'Save Changes' : 'Register Property'}
        </Button>
      </div>
    </form>
  );
};
