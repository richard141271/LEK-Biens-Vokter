'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { PRODUCT_IMAGES } from '@/utils/shop-constants';
import { revalidatePath } from 'next/cache';

export async function createProductBucket() {
  const supabase = createAdminClient();
  
  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return { error: listError.message };
  }

  const bucketExists = buckets?.some(b => b.name === 'product-images');

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket('product-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      return { error: createError.message };
    }
    
    // Set policy to allow public read (if not handled by public: true)
    // and authenticated uploads. 
    // Note: 'public: true' usually handles public read.
    // We might need to set RLS policies for objects, but createBucket usually sets a basic config.
    // However, explicit policies are often needed for uploads.
    // Since we are using admin client here, we can try to create policies via SQL if needed,
    // but the storage API doesn't support creating policies directly.
    // We'll assume the user is authenticated for uploads in the client.
    
    return { success: true, message: 'Bucket created' };
  }

  return { success: true, message: 'Bucket already exists' };
}

export async function addStandardProducts() {
  const supabase = createClient();
  const adminClient = createAdminClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Du må være logget inn.' };
  }

  // Verify admin access using admin client to check role
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isVip = user.email === 'richard141271@gmail.com';
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin && !isVip) {
    return { error: 'Du har ikke tilgang til å utføre denne handlingen.' };
  }

  const standardProducts = [
    {
      name: 'Sommerhonning',
      price: 149,
      category: 'Honning',
      image_url: PRODUCT_IMAGES.HONEY_SUMMER,
      description: 'Deilig, lys sommerhonning fra lokale bigårder. Mild og fin smak.',
      stock: 10,
      is_active: true
    },
    {
      name: 'Lynghonning',
      price: 189,
      category: 'Honning',
      image_url: PRODUCT_IMAGES.HONEY_HEATHER,
      description: 'Kraftig og aromatisk lynghonning. Perfekt til ostefatet.',
      stock: 5,
      is_active: true
    },
    {
      name: 'Håndlaget Bivoks-såpe',
      price: 89,
      category: 'Såpe',
      image_url: PRODUCT_IMAGES.SOAP,
      description: 'Naturlig såpe laget med bivoks og honning. Skånsom for huden.',
      stock: 20,
      is_active: true
    },
    {
      name: 'Ren Bivoks (200g)',
      price: 129,
      category: 'Bivoks',
      image_url: PRODUCT_IMAGES.BEESWAX,
      description: '100% ren bivoks. Perfekt til lysstøping eller egen hudpleie.',
      stock: 15,
      is_active: true
    },
    {
      name: 'Tavlehonning',
      price: 249,
      category: 'Tavlehonning',
      image_url: PRODUCT_IMAGES.COMB,
      description: 'Hele stykker av vokstavle fylt med honning. En eksklusiv delikatesse.',
      stock: 3,
      is_active: true
    },
    {
      name: 'Gavepakke "Biens Beste"',
      price: 499,
      category: 'Gavepakker',
      image_url: PRODUCT_IMAGES.GIFT_BROWN,
      description: 'En flott gaveeske med honning, såpe og et bivokslys.',
      stock: 8,
      is_active: true
    }
  ];

  // Use admin client to bypass RLS for insert
  const { error } = await adminClient
    .from('products')
    .insert(standardProducts);

  if (error) {
    console.error('Error inserting products:', error);
    return { error: 'Kunne ikke legge til produkter: ' + error.message };
  }

  revalidatePath('/dashboard/admin/shop');
  return { success: true };
}
