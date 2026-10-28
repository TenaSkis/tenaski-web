import { createClient } from '@/lib/supabase/server'
import ProductTable from './ProductTable'

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('product')
    .select('*')
    .order('created_at', {
      ascending: false,
    })

  return (
    <ProductTable
      products={products ?? []}
    />
  )
}