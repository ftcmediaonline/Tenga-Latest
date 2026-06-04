import { cn } from '@/lib/utils';

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-amber-500/20 text-amber-800 dark:text-amber-400',
  failed: 'bg-destructive/20 text-destructive',
  error: 'bg-destructive/20 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  iveri_card: 'Card / mobile (iVeri)',
  cash_on_delivery: 'Pay on delivery',
};

type PaymentStatusBadgeProps = {
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  className?: string;
};

export function PaymentStatusBadge({ paymentStatus, paymentMethod, className }: PaymentStatusBadgeProps) {
  const status = paymentStatus ?? 'pending';
  const statusStyle = PAYMENT_STATUS_STYLES[status] ?? PAYMENT_STATUS_STYLES.pending;
  const methodLabel = paymentMethod ? PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod : null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusStyle)}>
        Payment: {status}
      </span>
      {methodLabel && (
        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
          {methodLabel}
        </span>
      )}
    </div>
  );
}
