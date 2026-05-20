'use client';

import { useState } from 'react';
import { CartButton } from './CartButton';
import { CartDrawer } from './CartDrawer';

export function CartLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CartButton onOpen={() => setOpen(true)} />
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
