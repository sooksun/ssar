import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';

type LinkProps = ComponentProps<typeof Link>;

interface BackLinkProps extends Omit<LinkProps, 'href'> {
  href: string;
  label?: string;
  className?: string;
}

export function BackLink({ href, label = 'ย้อนกลับ', className, replace, ...props }: BackLinkProps) {
  return (
    <div className={cn('inline-flex items-center', className)}>
      <Link
        href={href}
        replace={replace}
        className="group inline-flex items-center gap-2 text-sm font-medium"
        {...props}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary bg-background text-primary shadow-sm transition group-hover:-translate-x-0.5 group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowLeft className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition group-hover:bg-primary/90">
          {label}
        </span>
      </Link>
    </div>
  );
}

