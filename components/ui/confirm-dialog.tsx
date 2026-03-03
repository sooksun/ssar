'use client';

import React, { useCallback, useState, useRef } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
    confirmText: 'ยืนยัน',
    cancelText: 'ยกเลิก',
    variant: 'default',
  });
  const resolveRef = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions({
        confirmText: 'ยืนยัน',
        cancelText: 'ยกเลิก',
        variant: 'default',
        ...opts,
      });
      setOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(false);
  }, []);

  const ConfirmDialogComponent = useCallback(
    () => (
      <AlertDialog.Root open={open} onOpenChange={(o) => !o && handleCancel()}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            <AlertDialog.Title className="text-lg font-semibold">
              {options.title}
            </AlertDialog.Title>
            {options.message && (
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {options.message}
              </AlertDialog.Description>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {options.cancelText}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  type="button"
                  variant={options.variant === 'destructive' ? 'destructive' : 'default'}
                  onClick={handleConfirm}
                >
                  {options.confirmText}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    ),
    [open, options, handleConfirm, handleCancel]
  );

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}
