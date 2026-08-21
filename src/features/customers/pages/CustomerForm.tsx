import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Textarea } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { customersApi } from '@/features/customers/api/customers';
import { extractError } from '@/core/api/client';
import type { Customer } from '@/types';

const CUSTOMER_TYPES = [
  { value: 'residential',  label: 'Residential' },
  { value: 'commercial',   label: 'Commercial' },
  { value: 'industrial',   label: 'Industrial' },
  { value: 'institutional',label: 'Institutional' },
  { value: 'government',   label: 'Government' },
  { value: 'bulk',         label: 'Bulk Water Customer' },
];

const ID_TYPES = [
  { value: 'national_id',    label: 'National ID' },
  { value: 'passport',       label: 'Passport' },
  { value: 'huduma_number',  label: 'Huduma Number' },
  { value: 'kra_pin',        label: 'KRA PIN' },
  { value: 'company_reg',    label: 'Company Registration' },
];

const schema = z.object({
  name:         z.string().min(2, 'Name is required'),
  companyName:  z.string().optional(),
  phone:        z.string().min(10, 'Enter a valid phone number'),
  email:        z.string().email('Enter a valid email').optional().or(z.literal('')),
  idType:       z.enum(['national_id', 'passport', 'huduma_number', 'kra_pin', 'company_reg', '']).optional(),
  idNumber:     z.string().optional(),
  address:      z.string().optional(),
  customerType: z.enum(['residential', 'commercial', 'industrial', 'institutional', 'government', 'bulk']),
  notes:        z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  customer?: Customer;        // pass existing customer to pre-fill for editing
  onSuccess: (customer?: Customer) => void;
  onCancel: () => void;
}

export const CustomerForm = ({ customer, onSuccess, onCancel }: Props) => {
  const [apiError, setApiError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerType: (customer?.customerType as FormData['customerType']) ?? 'residential',
      name:         customer?.name ?? '',
      companyName:  customer?.companyName ?? '',
      phone:        customer?.phone ?? '',
      email:        customer?.email ?? '',
      idType:       (customer?.idType as FormData['idType']) ?? '',
      idNumber:     customer?.idNumber ?? '',
      address:      customer?.address ?? '',
    },
  });

  const customerType = watch('customerType');
  const isBusiness = ['commercial', 'industrial', 'institutional', 'government', 'bulk'].includes(customerType);

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const payload: Partial<Customer> = {
        name:         data.name,
        companyName:  data.companyName || undefined,
        phone:        data.phone,
        email:        data.email || undefined,
        idType:       (data.idType as Customer['idType']) || undefined,
        idNumber:     data.idNumber || undefined,
        address:      data.address || undefined,
        customerType: data.customerType as Customer['customerType'],
      };

      let saved: Customer;
      if (customer?.id) {
        saved = await customersApi.update(customer.id, payload);
      } else {
        saved = await customersApi.create(payload);
      }
      onSuccess(saved);
    } catch (err) {
      setApiError(extractError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Customer Type"
          {...register('customerType')}
          error={errors.customerType?.message}
          options={CUSTOMER_TYPES}
        />
        <Input
          label={isBusiness ? 'Contact Person Name' : 'Full Name'}
          {...register('name')}
          error={errors.name?.message}
          placeholder={isBusiness ? 'Contact person' : 'John Doe'}
        />
      </div>

      {isBusiness && (
        <Input
          label="Company / Organisation Name"
          {...register('companyName')}
          error={errors.companyName?.message}
          placeholder="Acme Ltd"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Phone Number"
          {...register('phone')}
          error={errors.phone?.message}
          placeholder="0712345678"
          type="tel"
        />
        <Input
          label="Email Address"
          {...register('email')}
          error={errors.email?.message}
          placeholder="john@example.com"
          type="email"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="ID / Registration Type"
          {...register('idType')}
          placeholder="Select type"
          options={ID_TYPES}
        />
        <Input
          label="ID / Registration Number"
          {...register('idNumber')}
          placeholder="e.g. 12345678"
        />
      </div>

      <Textarea
        label="Physical Address"
        {...register('address')}
        placeholder="14 Kimathi Street, Nairobi"
      />

      <Textarea
        label="Internal Notes"
        {...register('notes')}
        placeholder="Any internal notes about this customer…"
      />

      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>
          {customer ? 'Save Changes' : 'Register Customer'}
        </Button>
      </div>
    </form>
  );
};
